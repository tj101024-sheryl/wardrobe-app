import random

from ..models import Item

TOP_KEYS = {"top", "tee", "hoodie", "activewear-top", "sleepwear"}
BOTTOM_KEYS = {
    "pants",
    "long-pants",
    "shorts",
    "activewear",
    "activewear-pants",
    "skirt",
    "mini-skirt",
    "long-skirt",
}
DRESS_KEYS = {"dress"}
OUTER_KEYS = {
    "outerwear",
    "windbreaker",
    "down-jacket",
    "light-outer",
}
SHOES_KEYS = {"shoes", "sneakers", "casual-shoes", "formal-shoes", "sandals"}
BAG_KEYS = {"bag", "backpack", "handbag", "crossbody", "travel-bag"}
ACCESSORY_KEYS = {
    "accessory",
    "necklace",
    "earrings",
    "ring",
    "bracelet",
    "hat",
    "cap",
    "bucket-hat",
    "scarf",
    "gloves",
    "mask-acc",
    "acc-other",
}

OCCASIONS = ["日常", "上班", "約會", "運動", "正式", "旅行"]

FORMAL_CASUAL = {
    "hoodie",
    "activewear",
    "activewear-top",
    "activewear-pants",
    "shorts",
    "sneakers",
    "backpack",
    "cap",
    "bucket-hat",
    "scarf",
    "mask-acc",
}
FORMAL_SMART = {
    "top",
    "long-pants",
    "outerwear",
    "windbreaker",
    "formal-shoes",
    "handbag",
    "dress",
    "long-skirt",
    "accessory",
    "necklace",
}
SPORT_KEYS = {
    "activewear",
    "activewear-top",
    "activewear-pants",
    "shorts",
    "sneakers",
    "cap",
    "backpack",
}


def _slot(item: Item) -> str:
    category = item.category or ""
    if category in TOP_KEYS:
        return "top"
    if category in BOTTOM_KEYS:
        return "bottom"
    if category in DRESS_KEYS:
        return "dress"
    if category in OUTER_KEYS:
        return "outer"
    if category in SHOES_KEYS:
        return "shoes"
    if category in BAG_KEYS:
        return "bag"
    if category in ACCESSORY_KEYS:
        return "accessory"
    return ""


def _band(temp: float) -> str:
    if temp >= 28:
        return "炎熱"
    if temp >= 23:
        return "舒適"
    if temp >= 18:
        return "微涼"
    if temp >= 13:
        return "偏涼"
    return "寒冷"


def suitable(item: Item, weather: dict) -> bool:
    if item.item_type not in ("clothes", "accessories"):
        return False
    slot = _slot(item)
    if not slot:
        return False
    current = weather.get("current") or {}
    temp = float(current.get("temp_c") or 0)
    rain = int(current.get("rain_prob") or 0)
    season = item.season or ""
    tag = item.weather or ""

    if temp >= 28:
        if slot == "outer":
            return False
        if "冬" in season or "冷" in tag:
            return False
    if temp <= 15:
        if "夏" in season or "熱" in tag:
            return False
        if item.category in {"shorts", "mini-skirt", "sandals"}:
            return False
    if rain >= 60 and item.category == "sandals":
        return False
    return True


def _score(item: Item, weather: dict, occasion: str | None = None) -> float:
    current = weather.get("current") or {}
    temp = float(current.get("temp_c") or 0)
    rain = int(current.get("rain_prob") or 0)
    season = item.season or ""
    tag = item.weather or ""
    score = 0.0

    if "熱" in tag and temp >= 26:
        score += 4
    if "冷" in tag and temp <= 18:
        score += 4
    if "雨" in tag and rain >= 50:
        score += 3
    if "晴" in tag and rain < 30:
        score += 1
    if "四季" in season:
        score += 1.5
    if "冬" in season and temp <= 18:
        score += 3
    if "夏" in season and temp >= 26:
        score += 3
    if "春" in season and 16 <= temp <= 26:
        score += 2
    if "秋" in season and 18 <= temp <= 27:
        score += 2
    if occasion and item.occasion and occasion in item.occasion:
        score += 3
    category = item.category or ""
    if occasion in ("上班", "正式"):
        if category in FORMAL_CASUAL:
            score -= 8
        if category in FORMAL_SMART:
            score += 4
    if occasion == "運動":
        if category in SPORT_KEYS:
            score += 4
        if category in FORMAL_SMART:
            score -= 4
    if occasion == "約會":
        if category in {"dress", "long-skirt", "mini-skirt"}:
            score += 2
        if category in {"handbag", "crossbody", "necklace", "earrings", "bracelet"}:
            score += 2
        if category in {"backpack", "cap", "bucket-hat", "scarf"}:
            score -= 2
        if category == "sneakers":
            score -= 1
        if category == "formal-shoes":
            score += 1
        if category in {"activewear", "activewear-top", "activewear-pants"}:
            score -= 2
    if occasion == "旅行":
        if category in {"shorts", "sneakers", "backpack", "travel-bag"}:
            score += 3
        if category == "formal-shoes":
            score -= 3
    if occasion == "日常":
        if category in {"tee", "long-pants", "sneakers"}:
            score += 1
        if category == "formal-shoes":
            score -= 2
    score += max(0, 5 - (item.wear_count or 0)) * 0.35
    if not item.last_worn_on:
        score += 0.6
    return score


def _sorted_candidates(items: list[Item], weather: dict, occasion: str | None):
    candidates = [item for item in items if suitable(item, weather)]
    return sorted(
        candidates,
        key=lambda item: _score(item, weather, occasion),
        reverse=True,
    )


def recommendation_groups(items: list[Item], weather: dict) -> dict:
    candidates = _sorted_candidates(items, weather, None)
    groups: dict[str, list[Item]] = {
        "tops": [],
        "bottoms": [],
        "dresses": [],
        "outers": [],
        "shoes": [],
        "accessories": [],
    }
    for item in candidates:
        slot = _slot(item)
        if slot == "top":
            groups["tops"].append(item)
        elif slot == "bottom":
            groups["bottoms"].append(item)
        elif slot == "dress":
            groups["dresses"].append(item)
        elif slot == "outer":
            groups["outers"].append(item)
        elif slot == "shoes":
            groups["shoes"].append(item)
        elif slot in ("bag", "accessory"):
            groups["accessories"].append(item)
    return {key: values[:12] for key, values in groups.items()}


def _pick(
    candidates: list[Item],
    rng: random.Random,
    offset: int = 0,
    limit: int = 8,
    used: set[int] | None = None,
) -> Item | None:
    pool = [item for item in candidates if not used or item.id not in used]
    if not pool:
        return None
    pool = pool[:limit]
    return pool[(offset + rng.randrange(len(pool))) % len(pool)]


def auto_compose(
    items: list[Item],
    weather: dict,
    seed: int | None = None,
    locked_item_ids: list[int] | None = None,
) -> list[dict]:
    current = weather.get("current") or {}
    temp = float(current.get("temp_c") or 0)
    rain = int(current.get("rain_prob") or 0)
    text = current.get("text") or ""
    all_candidates = _sorted_candidates(items, weather, None)
    locked = [
        item for item in items if item.id in set(locked_item_ids or [])
    ]

    result = []
    for index, occasion in enumerate(OCCASIONS):
        rng = random.Random((seed or random.randrange(1, 10_000)) + index * 97)
        used: set[int] = {item.id for item in locked}
        chosen: list[Item] = list(locked)
        reasons = [f"{round(temp)}°C {text}，{_band(temp)}天氣"]

        candidates = _sorted_candidates(items, weather, occasion)
        by_slot: dict[str, list[Item]] = {}
        for item in candidates:
            by_slot.setdefault(_slot(item), []).append(item)

        formal = occasion == "正式"
        office = occasion == "上班"
        sport = occasion == "運動"
        top_limit = 1 if formal or office else 2 if sport else 8
        bottom_limit = 1 if formal else 2 if office or sport else 8
        outer_limit = 1 if formal else 3 if office else 5
        shoes_limit = 1
        bag_limit = 1
        accessory_limit = (
            1
            if formal or office or sport or occasion == "約會"
            else 6
        )

        # 洋裝與上下身二選一
        dress = None
        if (
            occasion in ("約會", "正式")
            and by_slot.get("dress")
            and rng.random() < 0.55
        ):
            dress = _pick(by_slot.get("dress", []), rng, index, 2 if formal else 4, used)
            if dress:
                chosen.append(dress)
                used.add(dress.id)
        else:
            top = _pick(by_slot.get("top", []), rng, index, top_limit, used)
            if top:
                chosen.append(top)
                used.add(top.id)
            bottom = _pick(
                by_slot.get("bottom", []),
                rng,
                index + 1,
                bottom_limit,
                used,
            )
            if bottom:
                chosen.append(bottom)
                used.add(bottom.id)

        if not any(_slot(item) in ("top", "dress") for item in chosen):
            continue
        if not any(_slot(item) in ("bottom", "dress") for item in chosen):
            continue

        if temp < 22:
            outer = _pick(
                by_slot.get("outer", []), rng, index, outer_limit, used
            )
            if outer:
                chosen.append(outer)
                used.add(outer.id)

        shoes = _pick(
            by_slot.get("shoes", []), rng, index, shoes_limit, used
        )
        if shoes:
            chosen.append(shoes)
            used.add(shoes.id)

        bag = _pick(by_slot.get("bag", []), rng, index, bag_limit, used)
        if bag:
            chosen.append(bag)
            used.add(bag.id)

        accessory = _pick(
            by_slot.get("accessory", []),
            rng,
            index,
            accessory_limit,
            used,
        )
        if accessory:
            chosen.append(accessory)
            used.add(accessory.id)

        reasons.append(f"{occasion}場合，優先挑選符合的單品")
        if rain >= 50:
            reasons.append(f"降雨機率 {rain}%，優先包鞋與實用單品")
        if bag or accessory:
            reasons.append("加上包包與飾品，完成整體造型")

        order = {
            "top": 0,
            "dress": 0,
            "bottom": 1,
            "outer": 2,
            "shoes": 3,
            "bag": 4,
            "accessory": 5,
        }
        chosen.sort(key=lambda item: order.get(_slot(item), 9))
        result.append(
            {
                "occasion": occasion,
                "items": chosen,
                "reasons": reasons,
            }
        )

    return result
