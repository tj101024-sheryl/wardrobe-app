"""三層分類預設樹（與前端 types.ts 的 CATEGORY_TREE 保持一致）。

結構：大分類（item_type，固定 4 項）→ 小分類（parent_id 為 NULL）
→ 第三層分類（parent_id 有值）。小分類沒有 children 時本身即為葉節點。
"""

DEFAULT_TREE: dict[str, list[dict]] = {
    "clothes": [
        {
            "key": "top",
            "label": "上衣",
            "children": [("tee", "T恤"), ("hoodie", "帽T")],
        },
        {
            "key": "outerwear",
            "label": "外套",
            "children": [
                ("windbreaker", "風衣"),
                ("down-jacket", "羽絨"),
                ("light-outer", "薄外套"),
            ],
        },
        {
            "key": "pants",
            "label": "褲子",
            "children": [("long-pants", "長褲"), ("shorts", "短褲")],
        },
        {
            "key": "skirt",
            "label": "裙子",
            "children": [
                ("mini-skirt", "短裙"),
                ("long-skirt", "長裙"),
                ("dress", "洋裝"),
            ],
        },
        {"key": "sleepwear", "label": "睡衣", "children": []},
        {"key": "underwear", "label": "內衣", "children": []},
        {
            "key": "activewear",
            "label": "運動",
            "children": [
                ("activewear-top", "運動上衣"),
                ("activewear-pants", "運動褲"),
            ],
        },
        {"key": "clothes-other", "label": "其他", "children": []},
    ],
    "accessories": [
        {
            "key": "shoes",
            "label": "鞋子",
            "children": [
                ("sneakers", "運動鞋"),
                ("casual-shoes", "休閒鞋"),
                ("formal-shoes", "正式鞋"),
                ("sandals", "涼拖鞋"),
            ],
        },
        {
            "key": "bag",
            "label": "包包",
            "children": [
                ("backpack", "後背包"),
                ("handbag", "手提肩背"),
                ("crossbody", "側背小包"),
                ("travel-bag", "旅行包"),
            ],
        },
        {
            "key": "accessory",
            "label": "飾品",
            "children": [
                ("necklace", "項鍊"),
                ("earrings", "耳環"),
                ("ring", "戒指"),
                ("bracelet", "手鍊手錶"),
            ],
        },
        {
            "key": "hat",
            "label": "帽子",
            "children": [("cap", "棒球帽"), ("bucket-hat", "漁夫帽")],
        },
        {
            "key": "acc-other",
            "label": "其他",
            "children": [
                ("scarf", "圍巾"),
                ("gloves", "手套"),
                ("mask-acc", "口罩"),
            ],
        },
    ],
    "makeup": [
        {
            "key": "base",
            "label": "臉部底妝",
            "children": [
                ("foundation", "粉底液"),
                ("cushion", "氣墊"),
                ("concealer", "遮瑕"),
                ("powder", "蜜粉·定妝"),
            ],
        },
        {
            "key": "eye",
            "label": "眼妝",
            "children": [
                ("eyeshadow", "眼影"),
                ("eyeliner", "眼線"),
                ("mascara", "睫毛膏"),
                ("brow", "眉筆"),
            ],
        },
        {
            "key": "lip",
            "label": "唇妝",
            "children": [
                ("lipstick", "口紅"),
                ("lip-glaze", "唇釉"),
                ("lip-gloss", "唇彩"),
            ],
        },
        {
            "key": "cheek",
            "label": "腮紅修容",
            "children": [
                ("blush", "腮紅"),
                ("contour", "修容"),
                ("highlighter", "打亮"),
            ],
        },
        {
            "key": "nail",
            "label": "美甲",
            "children": [
                ("nail-polish", "指甲油"),
                ("nail-gel", "凝膠"),
                ("nail-remover", "卸甲"),
            ],
        },
        {
            "key": "makeup-tool",
            "label": "美妝工具",
            "children": [
                ("brush", "刷具"),
                ("puff", "粉撲·美妝蛋"),
                ("lash-curler", "睫毛夾"),
            ],
        },
        {
            "key": "fragrance",
            "label": "香氛",
            "children": [("perfume", "香水"), ("perfume-balm", "香膏")],
        },
        {"key": "makeup-other", "label": "其他", "children": []},
    ],
    "skincare": [
        {
            "key": "cleanser",
            "label": "清潔卸妝",
            "children": [
                ("makeup-remover", "卸妝"),
                ("face-wash", "洗面乳"),
                ("scrub", "去角質"),
            ],
        },
        {
            "key": "toner-lotion",
            "label": "水乳霜",
            "children": [
                ("toner", "化妝水"),
                ("lotion", "乳液"),
                ("cream", "乳霜"),
            ],
        },
        {
            "key": "serum-eye",
            "label": "精華眼霜",
            "children": [
                ("serum", "精華液"),
                ("eyecream", "眼霜"),
                ("ampoule", "安瓶"),
            ],
        },
        {
            "key": "mask",
            "label": "面膜",
            "children": [
                ("sheet-mask", "貼片"),
                ("clay-mask", "泥膜"),
                ("sleeping-mask", "睡眠面膜"),
            ],
        },
        {
            "key": "sunscreen",
            "label": "防曬",
            "children": [
                ("face-sunscreen", "臉部防曬"),
                ("body-sunscreen", "身體防曬"),
            ],
        },
        {
            "key": "body-care",
            "label": "身體護理",
            "children": [
                ("body-wash", "沐浴"),
                ("body-lotion", "身體乳"),
                ("hand-cream", "護手霜"),
            ],
        },
        {
            "key": "hair-care",
            "label": "頭髮護理",
            "children": [("shampoo", "洗髮"), ("hair-treatment", "護髮·髮油")],
        },
        {"key": "skincare-other", "label": "其他", "children": []},
    ],
}

# 舊單層預設分類的 key（遷移時用來辨識「預設列」與「使用者自訂列」）
OLD_DEFAULT_KEYS: set[str] = {
    # clothes
    "top", "outerwear", "pants", "shorts", "skirt", "dress", "underwear",
    "sleepwear", "activewear", "clothes-other",
    # accessories
    "shoes", "bag", "accessory",
    # makeup
    "base", "concealer", "lip", "blush", "eyeshadow", "brow", "lash",
    "powder", "perfume", "nail", "makeup-tool", "makeup-other",
    # skincare
    "cleanser", "toner", "serum", "lotion", "cream", "sunscreen", "mask",
    "eyecream", "scrub", "body-care", "hair-care", "skincare-other",
    # 舊的兜底 key
    "other",
}

# 舊物品 category key → 新分類 key（新三層樹中找不到的才需對應）
ITEM_CATEGORY_REMAP: dict[str, str] = {
    "lash": "mascara",
    "other": "clothes-other",  # 依 item_type 再細分，見 _migrate
}

ITEM_TYPE_OTHER_KEY: dict[str, str] = {
    "clothes": "clothes-other",
    "accessories": "acc-other",
    "makeup": "makeup-other",
    "skincare": "skincare-other",
}
