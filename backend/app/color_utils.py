"""顏色文字 → 色系。Phase 3 會再加入 hex 與 Lab 最近色。"""

COLOR_FAMILIES = [
    "white",
    "black",
    "gray",
    "beige",
    "brown",
    "red",
    "pink",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "metal",
]

_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("beige", ("米", "卡其", "杏", "奶茶", "beige")),
    ("brown", ("咖啡", "棕", "brown")),
    ("pink", ("粉", "pink")),
    ("red", ("紅", "red")),
    ("orange", ("橘", "橙", "orange")),
    ("yellow", ("黃", "yellow")),
    ("green", ("綠", "green")),
    ("blue", ("牛仔", "藍", "blue")),
    ("purple", ("紫", "purple")),
    ("metal", ("金", "銀", "metal")),
    ("gray", ("灰", "gray", "grey")),
    ("white", ("白", "white")),
    ("black", ("黑", "black")),
]


def family_from_text(text: str | None) -> str:
    if not text:
        return ""
    low = text.lower()
    for family, words in _KEYWORDS:
        if any(word in low for word in words):
            return family
    return ""


FAMILY_HEX = {
    "white": "#F2F0EA",
    "black": "#1F1F1F",
    "gray": "#A3A3A3",
    "beige": "#E0D2BC",
    "brown": "#8B5E3C",
    "red": "#C94B4B",
    "pink": "#EFA3B6",
    "orange": "#E8873A",
    "yellow": "#E7C547",
    "green": "#6E9E6A",
    "blue": "#4A7FB5",
    "purple": "#8B6BB1",
    "metal": "#C0C0C0",
}

MONO_NEUTRALS = {"white", "black", "gray", "beige"}


def _hex_rgb(value: str) -> tuple[int, int, int] | None:
    text = (value or "").strip().lstrip("#")
    if len(text) == 3:
        text = "".join(ch * 2 for ch in text)
    if len(text) != 6:
        return None
    try:
        return tuple(int(text[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]
    except ValueError:
        return None


def nearest_family(value: str | None) -> str:
    rgb = _hex_rgb(value or "")
    if not rgb:
        return ""
    best = ""
    best_distance = None
    for family, reference in FAMILY_HEX.items():
        ref = _hex_rgb(reference)
        if not ref:
            continue
        distance = sum((a - b) ** 2 for a, b in zip(rgb, ref))
        if best_distance is None or distance < best_distance:
            best = family
            best_distance = distance
    return best
