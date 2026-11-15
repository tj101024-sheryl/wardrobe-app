import html as html_lib
import io
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

IMAGE_EXT = re.compile(r"\.(jpe?g|png|webp|gif|avif)(\?|#|$)", re.I)
BAD_URL = re.compile(
    r"(\.svg|\.ico|sprite|/logo|logo\.|favicon|apple-touch|"
    r"banner_ad|/pixel|blank\.|spacer|transparent|placeholder|"
    r"loading\.|1x1|tracking|analytics|doubleclick|googletag|"
    r"payment|avatar|qr-code|/ad[s_/]|advert|"
    r"\.woff2?|\.ttf|\.otf|\.eot|\.mp4|\.webm|\.m3u8|\.js|\.css|\.json)",
    re.I,
)
MIN_SIZE_HINT = re.compile(
    r"(16x16|24x24|32x32|48x48|64x64|80x80|100x100|120x120|128x128)",
    re.I,
)
CSS_URL = re.compile(r"url\(\s*(['\"]?)(.*?)\1\s*\)", re.I)
JS_IMG_URL = re.compile(
    r"""(?:https?:)?(?:\\?/\\?/)[^\s"'<>]+?\.(?:jpe?g|png|webp|gif|avif)(?:\?[^\s"'<>]*)?""",
    re.I,
)

IMAGE_ATTRS = {
    "src",
    "data-src",
    "data-original",
    "data-lazy",
    "data-lazy-src",
    "data-echo",
    "data-url",
    "data-image",
    "data-image-url",
    "data-img",
    "data-src-large",
    "data-large",
    "data-large-image",
    "data-zoom-image",
    "data-zoom",
    "data-original-src",
    "data-old-hires",
    "data-hires",
    "data-thumb",
    "data-thumbnail",
    "data-bg",
    "data-background",
}
SRCSET_ATTRS = {"srcset", "data-srcset", "data-lazy-srcset"}
JSON_IMAGE_KEYS = {
    "image",
    "images",
    "thumbnail",
    "thumbnailurl",
    "imageurl",
    "image_url",
    "pic",
    "pics",
    "photo",
    "photos",
    "productimage",
    "productimages",
    "mainimage",
    "gallery",
    "galleryimages",
    "contenturl",
}
IMAGE_CDN_HINTS = (
    "susercontent",
    "alicdn",
    "aliimg",
    "uniqlo",
    "grl.",
    "zozo",
    "net.com.tw",
    "shopify",
    "cloudfront",
    "scene7",
    "imgix",
    "images.",
)


def _int(value) -> int | None:
    if value is None:
        return None
    try:
        return int(str(value).replace("px", "").strip())
    except (TypeError, ValueError):
        return None


def _looks_like_image(url: str) -> bool:
    low = url.lower()
    if IMAGE_EXT.search(low):
        return True
    if any(hint in low for hint in IMAGE_CDN_HINTS):
        return True
    if re.search(
        r"/(image|images|img|photo|photos|pic|product|products|goods|media|upload)/",
        low,
    ):
        return not re.search(r"\.(html|js|css|json)(\?|$)", low)
    return False


def _abs(base: str, src: str, require_image: bool = False) -> str | None:
    if not src:
        return None
    src = html_lib.unescape(str(src)).strip().strip("\"'")
    if src.startswith("data:"):
        return None
    src = src.replace("\\/", "/").replace("\\u002F", "/")
    if src.startswith("//"):
        src = "https:" + src
    full = urljoin(base, src)
    if not full.startswith(("http://", "https://")):
        return None
    if BAD_URL.search(full) or MIN_SIZE_HINT.search(full):
        return None
    if require_image and not _looks_like_image(full):
        return None
    return full


def _score(url: str) -> int:
    score = 0
    if IMAGE_EXT.search(url):
        score += 10
    low = url.lower()
    for kw in (
        "product",
        "item",
        "goods",
        "large",
        "big",
        "zoom",
        "main",
        "primary",
        "detail",
        "gallery",
        "pdp",
        "original",
        "front",
        "back",
        "model",
        "color",
    ):
        if kw in low:
            score += 4
    for kw in ("og", "share", "social"):
        if kw in low:
            score += 2
    for hint in IMAGE_CDN_HINTS:
        if hint in low:
            score += 6
    for kw in (
        "logo",
        "icon",
        "avatar",
        "banner",
        "footer",
        "header",
        "background",
        "sprite",
        "advert",
        "tracking",
        "pixel",
    ):
        if kw in low:
            score -= 20
    if re.search(r"/\d{2,4}x\d{2,4}/", low):
        score += 3
    return score


def _srcset_urls(value: str) -> list[str]:
    result = []
    for part in value.split(","):
        piece = part.strip()
        if not piece:
            continue
        result.append(piece.split()[0])
    return result


def _string_candidates(value) -> list[str]:
    result: list[str] = []
    if isinstance(value, str):
        result.append(value)
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, str):
                result.append(item)
            elif isinstance(item, dict):
                for key in ("url", "src", "image", "@id", "contentUrl"):
                    if isinstance(item.get(key), str):
                        result.append(item[key])
    elif isinstance(value, dict):
        for key in ("url", "src", "image", "@id", "contentUrl"):
            if isinstance(value.get(key), str):
                result.append(value[key])
    return result


def _collect_json_images(node, add) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            if key.lower() in JSON_IMAGE_KEYS:
                for candidate in _string_candidates(value):
                    add(candidate, "json", require_image=True)
            _collect_json_images(value, add)
    elif isinstance(node, list):
        for item in node:
            _collect_json_images(item, add)
    elif isinstance(node, str):
        if _looks_like_image(node):
            add(node, "json", require_image=True)


def _extract_images(html: str, base_url: str) -> tuple[str, list[ScrapeImage]]:
    soup = BeautifulSoup(html, "html.parser")
    page_title = ""
    if soup.title:
        page_title = soup.title.get_text(strip=True)

    found: dict[str, ScrapeImage] = {}

    def add(
        src: str,
        kind: str,
        width: int | None = None,
        height: int | None = None,
        require_image: bool = False,
    ) -> None:
        full = _abs(base_url, src, require_image=require_image)
        if not full or full in found:
            return
        if width and height and max(width, height) < 120:
            return
        found[full] = ScrapeImage(
            url=full, width=width, height=height, kind=kind
        )

    for meta in soup.find_all("meta"):
        key = (meta.get("property") or meta.get("name") or "").lower()
        if key in {
            "og:image",
            "og:image:url",
            "og:image:secure_url",
            "twitter:image",
            "twitter:image:src",
            "image",
            "thumbnail",
        }:
            add(meta.get("content", ""), "og")

    for link in soup.find_all("link"):
        rel = " ".join(link.get("rel") or []).lower()
        if "image_src" in rel or (
            "preload" in rel and link.get("as") == "image"
        ):
            add(link.get("href", ""), "link", require_image=True)

    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data_ld = json.loads(script.string or "")
        except (json.JSONDecodeError, TypeError):
            continue
        _collect_json_images(data_ld, add)

    for img in soup.find_all("img"):
        width = _int(img.get("width"))
        height = _int(img.get("height"))
        for attr, value in img.attrs.items():
            if not isinstance(value, str):
                continue
            if attr in SRCSET_ATTRS:
                for candidate in _srcset_urls(value):
                    add(candidate, "gallery", width, height)
            elif attr in IMAGE_ATTRS:
                if value.lstrip().startswith(("[", "{")):
                    try:
                        _collect_json_images(json.loads(value), add)
                    except (json.JSONDecodeError, TypeError):
                        pass
                else:
                    add(value, "gallery", width, height)
            elif attr.startswith("data-") and _looks_like_image(value):
                add(value, "gallery", width, height, require_image=True)

    for source in soup.find_all("source"):
        for attr in SRCSET_ATTRS:
            value = source.get(attr)
            if value:
                for candidate in _srcset_urls(value):
                    add(candidate, "gallery")

    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        if _looks_like_image(href):
            add(href, "link")

    for tag in soup.find_all(style=True):
        for match in CSS_URL.findall(tag.get("style", "")):
            add(match[1], "background", require_image=True)

    for style in soup.find_all("style"):
        for match in CSS_URL.findall(style.get_text() or ""):
            add(match[1], "background", require_image=True)

    for script in soup.find_all("script"):
        text = script.string or script.get_text() or ""
        if not text:
            continue
        stripped = text.lstrip()
        is_json = (
            script.get("type") in ("application/json", "application/ld+json")
            or script.get("id") in ("__NEXT_DATA__", "__NUXT_DATA__")
            or stripped.startswith(("{", "["))
        )
        if is_json:
            try:
                _collect_json_images(json.loads(text), add)
                continue
            except (json.JSONDecodeError, TypeError):
                pass
        for match in JS_IMG_URL.findall(text):
            add(match, "embedded", require_image=True)

    images = list(found.values())

    def sort_key(image: ScrapeImage):
        dimension = max(image.width or 0, image.height or 0)
        return (_score(image.url) + (6 if dimension >= 500 else 0), dimension)

    images.sort(key=sort_key, reverse=True)
    return page_title, images[:80]


def _normalize_image(
    data: bytes, content_type: str, url: str = ""
) -> tuple[bytes, str]:
    ext = ".jpg"
    for key, suffix in (
        ("png", ".png"),
        ("webp", ".webp"),
        ("gif", ".gif"),
        ("avif", ".avif"),
        ("jpeg", ".jpg"),
        ("jpg", ".jpg"),
    ):
        if key in content_type:
            ext = suffix
            break
    if ext == ".jpg" and not content_type:
        low = url.lower()
        if ".png" in low:
            ext = ".png"
        elif ".webp" in low:
            ext = ".webp"
        elif ".gif" in low:
            ext = ".gif"
        elif ".avif" in low:
            ext = ".avif"

    # WebP/AVIF 在部分 iOS 版本不一定能直接顯示，轉成 JPEG 最保險。
    if ext in (".webp", ".avif"):
        try:
            from PIL import Image

            image = Image.open(io.BytesIO(data))
            image.load()
            if image.mode in ("RGBA", "LA", "P"):
                image = image.convert("RGBA")
                background = Image.new("RGB", image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1])
                image = background
            else:
                image = image.convert("RGB")
            buffer = io.BytesIO()
            image.save(buffer, "JPEG", quality=90)
            return buffer.getvalue(), ".jpg"
        except Exception:
            pass
    return data, ext


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
            if resp.status_code in (403, 429):
                # 有些站需要先取得首頁 cookie，再帶 Referer 進商品頁。
                try:
                    await client.get(f"{parsed.scheme}://{parsed.netloc}/")
                    resp = await client.get(
                        url,
                        headers={
                            **HEADERS,
                            "Referer": f"{parsed.scheme}://{parsed.netloc}/",
                            "Sec-Fetch-Site": "same-origin",
                        },
                    )
                except Exception:
                    pass
    except Exception as e:
        raise HTTPException(
            502,
            f"連線失敗（{type(e).__name__}）。請確認網址，或改用截圖上傳。",
        )

    host = parsed.netloc.lower()
    shopee_like = any(
        name in host
        for name in ("shopee", "taobao", "tmall", "aliexpress")
    )

    if resp.status_code in (401, 403, 429, 503):
        extra = (
            " 蝦皮／淘寶常會擋自動抓取，請改用手機截圖上傳。"
            if shopee_like
            else " 請改用截圖上傳。"
        )
        raise HTTPException(403, "網站擋下了自動抓取（反爬機制）。" + extra)
    if resp.status_code >= 500:
        raise HTTPException(
            502, "目標網站暫時無法連線，請稍後再試或改用截圖上傳。"
        )
    if resp.status_code == 404:
        raise HTTPException(404, "找不到這個頁面，請確認網址是否正確。")

    content_type = resp.headers.get("content-type", "")
    if "html" not in content_type and "text" not in content_type:
        raise HTTPException(400, "這個網址不是網頁，請貼商品頁網址")

    final_url = str(resp.url)
    page_title, images = _extract_images(resp.text, final_url)
    if not images:
        extra = (
            " 蝦皮／淘寶常把圖片放在動態資料中，請改用手機截圖上傳。"
            if shopee_like
            else " 請改用截圖上傳，或確認商品頁是否公開。"
        )
        raise HTTPException(
            404, "這個頁面找不到圖片（可能是動態載入）。" + extra
        )

    return ScrapeOut(url=final_url, page_title=page_title, images=images)


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
    if "image" not in content_type and not IMAGE_EXT.search(data.url):
        raise HTTPException(400, "這不是圖片檔")

    content, ext = _normalize_image(resp.content, content_type, data.url)

    filename = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / filename).write_bytes(content)

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
