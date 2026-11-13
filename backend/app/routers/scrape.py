import json
import re
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..color_utils import family_from_text
from ..config import UPLOAD_DIR
from ..database import get_db
from ..models import Item, User
from ..schemas import SaveScrapedImageIn, ScrapeImage, ScrapeOut

router = APIRouter(prefix="/scrape", tags=["scrape"])

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}

SKIP_EXT = re.compile(
    r"(\.svg|\.ico|sprite|/logo|logo\.|icon|apple-touch|favicon|"
    r"banner_ad|/pixel|blank\.|spacer|payment|avatar)",
    re.I,
)
IMG_EXT = re.compile(r"\.(jpe?g|png|webp|gif)(\?|$)", re.I)
IMG_URL_IN_JS = re.compile(
    r"""https?:\\?/\\?/[^\s"'<>\\]+\.(?:jpe?g|png|webp)(?:\?[^\s"'<>\\]*)?""",
    re.I,
)
MIN_SIZE_HINT = re.compile(r"(16x16|32x32|48x48|64x64|100x100|120x120|128x128)", re.I)


def _abs(base: str, src: str) -> str | None:
    if not src:
        return None
    src = src.strip().strip('"\'')
    if src.startswith("data:"):
        return None
    src = src.replace("\\/", "/")
    full = urljoin(base, src)
    if not full.startswith("http"):
        return None
    if SKIP_EXT.search(full) or MIN_SIZE_HINT.search(full):
        return None
    return full


def _score(url: str) -> int:
    score = 0
    if IMG_EXT.search(url):
        score += 10
    low = url.lower()
    for kw in (
        "product", "item", "goods", "large", "big", "zoom",
        "main", "primary", "detail", "gallery", "pdp",
    ):
        if kw in low:
            score += 4
    for kw in ("og", "share", "social"):
        if kw in low:
            score += 2
    for kw in ("logo", "icon", "avatar", "banner", "footer", "header", "background"):
        if kw in low:
            score -= 20
    if re.search(r"/\d{2,4}x\d{2,4}/", low):
        score += 3
    return score


@router.post("", response_model=ScrapeOut)
async def scrape(data: dict, user: User = Depends(get_current_user)):
    url = (data.get("url") or "").strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(400, "請輸入完整網址（含 https://）")
    parsed = urlparse(url)
    if not parsed.netloc:
        raise HTTPException(400, "網址格式不正確")

    try:
        async with httpx.AsyncClient(
            headers=HEADERS,
            timeout=25,
            follow_redirects=True,
            verify=False,
        ) as client:
            resp = await client.get(url)
    except Exception as e:
        raise HTTPException(
            502,
            f"連線失敗（{type(e).__name__}）。請確認網址，或改用截圖上傳。",
        )

    if resp.status_code in (401, 403, 429, 503):
        raise HTTPException(
            403,
            "網站擋下了自動抓取（反爬機制）。請改用截圖上傳。",
        )
    if resp.status_code >= 500:
        raise HTTPException(502, "目標網站暫時無法連線，請稍後再試或改用截圖上傳。")
    if resp.status_code == 404:
        raise HTTPException(404, "找不到這個頁面，請確認網址是否正確。")

    content_type = resp.headers.get("content-type", "")
    if "html" not in content_type and "text" not in content_type:
        raise HTTPException(400, "這個網址不是網頁，請貼商品頁網址")

    html = resp.text
    soup = BeautifulSoup(html, "html.parser")
    page_title = ""
    if soup.title and soup.title.string:
        page_title = soup.title.string.strip()

    found: dict[str, ScrapeImage] = {}

    def add(src: str, kind: str, width: int | None = None, height: int | None = None):
        abs_url = _abs(url, src)
        if not abs_url or abs_url in found:
            return
        found[abs_url] = ScrapeImage(
            url=abs_url, width=width, height=height, kind=kind
        )

    for meta in soup.find_all("meta"):
        key = (meta.get("property") or meta.get("name") or "").lower()
        if key in (
            "og:image", "og:image:url", "og:image:secure_url", "twitter:image"
        ):
            add(meta.get("content", ""), "og")

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data_ld = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        stack = [data_ld]
        while stack:
            node = stack.pop()
            if isinstance(node, dict):
                for k, v in node.items():
                    if k in ("image", "thumbnailUrl") and isinstance(v, str):
                        add(v, "jsonld")
                    elif k in ("image", "thumbnailUrl") and isinstance(v, list):
                        for it in v:
                            if isinstance(it, str):
                                add(it, "jsonld")
                            elif isinstance(it, dict) and "url" in it:
                                add(it["url"], "jsonld")
                            elif isinstance(it, dict) and "@id" in it:
                                add(it["@id"], "jsonld")
                    else:
                        stack.append(v)
            elif isinstance(node, list):
                stack.extend(node)

    for img in soup.find_all("img"):
        for attr in ("data-src", "data-original", "data-lazy", "srcset", "src"):
            val = img.get(attr)
            if not val:
                continue
            if attr == "srcset":
                for part in val.split(","):
                    cand = part.strip().split(" ")[0]
                    add(cand, "gallery")
            else:
                w = img.get("width")
                h = img.get("height")
                add(
                    val,
                    "gallery",
                    int(w) if w and str(w).isdigit() else None,
                    int(h) if h and str(h).isdigit() else None,
                )
            break

    for source in soup.find_all("source"):
        srcset = source.get("srcset")
        if srcset:
            for part in srcset.split(","):
                cand = part.strip().split(" ")[0]
                add(cand, "gallery")

    for script in soup.find_all("script"):
        text = script.string or ""
        if not text or ".jpg" not in text.lower() and ".png" not in text.lower() \
                and ".webp" not in text.lower():
            continue
        for m in IMG_URL_IN_JS.findall(text):
            add(m, "embedded")

    images = list(found.values())
    images.sort(key=lambda im: _score(im.url), reverse=True)
    images = images[:60]

    if not images:
        raise HTTPException(
            404,
            "這個頁面找不到圖片（可能是動態載入）。請改用截圖上傳。",
        )

    return ScrapeOut(url=url, page_title=page_title, images=images)


@router.post("/save")
def save_scraped_image(
    data: SaveScrapedImageIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    import uuid
    from pathlib import Path

    from .items import item_to_out

    try:
        with httpx.Client(
            headers=HEADERS, timeout=30, follow_redirects=True, verify=False
        ) as client:
            resp = client.get(data.url)
            resp.raise_for_status()
    except Exception:
        raise HTTPException(502, "下載圖片失敗，請換一張或改用截圖上傳")

    content_type = resp.headers.get("content-type", "").lower()
    if "png" in content_type:
        ext = ".png"
    elif "webp" in content_type:
        ext = ".webp"
    elif "gif" in content_type:
        ext = ".gif"
    else:
        ext = ".jpg"
    if "image" not in content_type and not IMG_EXT.search(data.url):
        raise HTTPException(400, "這不是圖片檔")

    filename = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / filename).write_bytes(resp.content)

    item = Item(
        user_id=user.id,
        name=data.name or "未命名衣物",
        item_type=data.item_type or "clothes",
        category=data.category or "other",
        color=data.color,
        color_family=data.color_family or family_from_text(data.color),
        color_hex=data.color_hex,
        season=data.season,
        occasion=data.occasion,
        weather=data.weather,
        style=data.style,
        expiry=data.expiry,
        efficacy=data.efficacy,
        tags=data.tags,
        image_path=filename,
        source_url=data.source_page or data.url,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item_to_out(item)
