from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

from ..config import SHARE_DIR, UPLOAD_DIR
from ..models import Outfit

SIZES = {
    "story": (1080, 1920),
    "feed": (1080, 1350),
    "fb": (1200, 630),
}

FONT_CANDIDATES = [
    "C:/Windows/Fonts/msjh.ttc",
    "C:/Windows/Fonts/msyh.ttc",
    "C:/Windows/Fonts/kaiu.ttf",
    "/System/Library/Fonts/PingFang.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
]

BG = (250, 249, 247)
TEXT = (26, 26, 26)
SUB = (138, 138, 143)
CARD = (255, 255, 255)
SOFT = (240, 239, 236)


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _short(text: str, limit: int) -> str:
    value = (text or "").strip()
    return value if len(value) <= limit else value[: limit - 1] + "…"


def _load_image(name: str | None) -> Image.Image | None:
    if not name:
        return None
    path = UPLOAD_DIR / Path(name).name
    if not path.exists():
        return None
    try:
        image = Image.open(path)
        image.load()
        return image.convert("RGBA")
    except Exception:
        return None


def _paste_contain(
    canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int]
) -> None:
    left, top, right, bottom = box
    width = max(1, right - left)
    height = max(1, bottom - top)
    fitted = ImageOps.contain(image, (width, height))
    x = left + (width - fitted.width) // 2
    y = top + (height - fitted.height) // 2
    if fitted.mode == "RGBA":
        canvas.paste(fitted, (x, y), fitted)
    else:
        canvas.paste(fitted, (x, y))


def generate_share_image(
    outfit: Outfit, fmt: str, include_makeup: bool = True
) -> Path:
    if fmt not in SIZES:
        raise ValueError("invalid format")
    width, height = SIZES[fmt]
    canvas = Image.new("RGB", (width, height), BG)
    draw = ImageDraw.Draw(canvas)

    margin = 72 if fmt != "fb" else 52
    font_name = _font(26 if fmt != "fb" else 22)
    font_title = _font(58 if fmt != "fb" else 42)
    font_meta = _font(24 if fmt != "fb" else 20)
    font_small = _font(20 if fmt != "fb" else 17)

    owner = f"@{outfit.owner.username}" if outfit.owner else ""
    draw.text((margin, margin), owner, font=font_name, fill=SUB)

    title = _short(outfit.title or "今天的穿搭", 18)
    draw.text((margin, margin + 46), title, font=font_title, fill=TEXT)

    weather = outfit.weather or {}
    weather_text = " · ".join(
        [
            outfit.date,
            str(weather.get("text") or ""),
            f"{round(float(weather.get('temp_c'))) }°C"
            if weather.get("temp_c") is not None
            else "",
            outfit.occasion or "",
        ]
    ).replace(" ·  · ", " · ").strip(" ·")
    draw.text((margin, margin + 118), weather_text, font=font_meta, fill=SUB)

    content_top = margin + 180
    content_bottom = height - margin - 70
    content_left = margin
    content_right = width - margin
    content_height = content_bottom - content_top

    photo = _load_image(outfit.photo_path)
    items = [row.item for row in outfit.items]
    item_images = [
        (item, _load_image(item.cutout_path or item.image_path))
        for item in items[:6]
    ]

    if photo is not None:
        card = Image.new("RGB", (content_right - content_left, content_height), CARD)
        _paste_contain(
            card,
            photo,
            (0, 0, content_right - content_left, content_height),
        )
        canvas.paste(card, (content_left, content_top))
    else:
        cols = 3 if fmt != "fb" else 4
        rows = 2 if fmt != "fb" else 1
        gap = 14
        cell_w = (content_right - content_left - gap * (cols - 1)) // cols
        cell_h = min(
            (content_height - gap * (rows - 1)) // rows,
            cell_w,
        )
        start_y = content_top + max(
            0, (content_height - (cell_h * rows + gap * (rows - 1))) // 2
        )
        for index in range(cols * rows):
            row = index // cols
            col = index % cols
            x = content_left + col * (cell_w + gap)
            y = start_y + row * (cell_h + gap)
            cell = Image.new("RGB", (cell_w, cell_h), SOFT)
            if index < len(item_images):
                item, image = item_images[index]
                if image is not None:
                    _paste_contain(cell, image, (10, 10, cell_w - 10, cell_h - 10))
                else:
                    cell_draw = ImageDraw.Draw(cell)
                    label = _short(item.name or "單品", 7)
                    bbox = cell_draw.textbbox((0, 0), label, font=font_small)
                    cell_draw.text(
                        (
                            (cell_w - (bbox[2] - bbox[0])) // 2,
                            (cell_h - (bbox[3] - bbox[1])) // 2,
                        ),
                        label,
                        font=font_small,
                        fill=SUB,
                    )
            canvas.paste(cell, (x, y))

    footer = f"我的衣櫃 · {len(items)} 件" + (
        f" · {len(outfit.products)} 樣"
        if include_makeup and outfit.products
        else ""
    )
    draw.text(
        (margin, height - margin + 8),
        footer,
        font=font_small,
        fill=SUB,
    )

    SHARE_DIR.mkdir(parents=True, exist_ok=True)
    path = SHARE_DIR / f"outfit_{outfit.id}_{fmt}.png"
    canvas.save(path, "PNG", optimize=True)
    return path


def share_text(outfit: Outfit) -> str:
    weather = outfit.weather or {}
    lines = [
        outfit.title or "今天的穿搭",
        f"{outfit.date}" + (f" · {outfit.occasion}" if outfit.occasion else ""),
    ]
    if weather.get("text") or weather.get("temp_c") is not None:
        lines.append(
            f"{weather.get('text', '')} {round(float(weather.get('temp_c', 0)))}°C".strip()
        )
    lines.append("#穿搭 #每日穿搭 #我的衣櫃")
    return "\n".join(lines)
