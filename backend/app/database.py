from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from .config import DB_PATH

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate()


def _migrate():
    """SQLite 簡易遷移：缺欄位就補上；舊單層使用者重建為三層分類樹。"""
    import sqlite3

    from .defaults import DEFAULT_TREE, ITEM_TYPE_OTHER_KEY, OLD_DEFAULT_KEYS

    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        cols = {row[1] for row in cur.execute("PRAGMA table_info(items)")}
        if "item_type" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN item_type VARCHAR(20) DEFAULT 'clothes'"
            )
        if "expiry" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN expiry VARCHAR(20) DEFAULT ''"
            )
        if "brand" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN brand VARCHAR(100) DEFAULT ''"
            )
        if "size" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN size VARCHAR(50) DEFAULT ''"
            )
        if "price" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN price VARCHAR(50) DEFAULT ''"
            )
        if "efficacy" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN efficacy VARCHAR(200) DEFAULT ''"
            )
        if "wear_count" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN wear_count INTEGER DEFAULT 0"
            )
        if "color_family" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN color_family VARCHAR(20) DEFAULT ''"
            )
        if "color_hex" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN color_hex VARCHAR(7) DEFAULT ''"
            )
        if "last_worn_on" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN last_worn_on VARCHAR(10) DEFAULT ''"
            )

        ocols = {row[1] for row in cur.execute("PRAGMA table_info(outfits)")}
        if "status" not in ocols:
            cur.execute(
                "ALTER TABLE outfits ADD COLUMN status VARCHAR(20) DEFAULT 'draft'"
            )
        if "occasion" not in ocols:
            cur.execute(
                "ALTER TABLE outfits ADD COLUMN occasion VARCHAR(50) DEFAULT ''"
            )
        if "weather" not in ocols:
            cur.execute(
                "ALTER TABLE outfits ADD COLUMN weather JSON DEFAULT '{}'"
            )
        if "layout_mode" not in ocols:
            cur.execute(
                "ALTER TABLE outfits ADD COLUMN layout_mode VARCHAR(20) DEFAULT 'list'"
            )
        if "published_at" not in ocols:
            cur.execute(
                "ALTER TABLE outfits ADD COLUMN published_at DATETIME"
            )
        if "photo_path" not in ocols:
            cur.execute(
                "ALTER TABLE outfits ADD COLUMN photo_path VARCHAR(500)"
            )
        if "makeup_photo_path" not in ocols:
            cur.execute(
                "ALTER TABLE outfits ADD COLUMN makeup_photo_path VARCHAR(500)"
            )
        if "makeup_visibility" not in ocols:
            cur.execute(
                "ALTER TABLE outfits ADD COLUMN makeup_visibility VARCHAR(20) DEFAULT 'public'"
            )
        cur.execute(
            "UPDATE outfits SET makeup_visibility='public' "
            "WHERE makeup_visibility IS NULL OR makeup_visibility=''"
        )
        cur.execute("UPDATE outfits SET weather='{}' WHERE weather IS NULL")

        ccols = {row[1] for row in cur.execute("PRAGMA table_info(categories)")}
        if "parent_id" not in ccols:
            cur.execute(
                "ALTER TABLE categories ADD COLUMN parent_id INTEGER"
            )

        ucols = {row[1] for row in cur.execute("PRAGMA table_info(users)")}
        if "categories_seeded" not in ucols:
            cur.execute(
                "ALTER TABLE users ADD COLUMN categories_seeded INTEGER DEFAULT 0"
            )
        if "notify_enabled" not in ucols:
            cur.execute(
                "ALTER TABLE users ADD COLUMN notify_enabled INTEGER DEFAULT 1"
            )
        if "notify_time" not in ucols:
            cur.execute(
                "ALTER TABLE users ADD COLUMN notify_time VARCHAR(5) DEFAULT '08:00'"
            )
        cur.execute(
            "UPDATE users SET notify_enabled=1 WHERE notify_enabled IS NULL"
        )
        cur.execute(
            "UPDATE users SET notify_time='08:00' "
            "WHERE notify_time IS NULL OR notify_time=''"
        )

        cur.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_likes_user_outfit "
            "ON likes(user_id, outfit_id)"
        )

        # 舊資料搬移：衣服下的鞋子/包包/配件 → 配件大分類（重複執行無害）
        cur.execute(
            "UPDATE items SET item_type='accessories' "
            "WHERE item_type='clothes' AND category IN ('shoes','bag','accessory')"
        )

        # 舊單層使用者（categories_seeded=1）→ 重建三層預設樹
        users = cur.execute(
            "SELECT id FROM users WHERE categories_seeded=1"
        ).fetchall()
        placeholders = ",".join("?" * len(OLD_DEFAULT_KEYS))
        old_keys = tuple(OLD_DEFAULT_KEYS)
        for (uid,) in users:
            # 保留使用者自訂分類（key 不在舊預設清單內）
            customs = cur.execute(
                f"SELECT item_type, key, label FROM categories "
                f"WHERE user_id=? AND key NOT IN ({placeholders})",
                (uid, *old_keys),
            ).fetchall()
            cur.execute("DELETE FROM categories WHERE user_id=?", (uid,))

            for item_type, entries in DEFAULT_TREE.items():
                for pos, node in enumerate(entries):
                    cur.execute(
                        "INSERT INTO categories "
                        "(user_id, item_type, key, label, position, parent_id) "
                        "VALUES (?,?,?,?,?,NULL)",
                        (uid, item_type, node["key"], node["label"], pos),
                    )
                    parent_id = cur.lastrowid
                    for cpos, (ckey, clabel) in enumerate(node["children"]):
                        cur.execute(
                            "INSERT INTO categories "
                            "(user_id, item_type, key, label, position, parent_id) "
                            "VALUES (?,?,?,?,?,?)",
                            (uid, item_type, ckey, clabel, cpos, parent_id),
                        )

            # 自訂分類接在該大分類第二層尾端
            base_pos = {
                itype: len(entries) for itype, entries in DEFAULT_TREE.items()
            }
            for itype, key, label in customs:
                pos = base_pos.get(itype, 0)
                base_pos[itype] = pos + 1
                cur.execute(
                    "INSERT INTO categories "
                    "(user_id, item_type, key, label, position, parent_id) "
                    "VALUES (?,?,?,?,?,NULL)",
                    (uid, itype, key, label, pos),
                )

            # 物品的舊分類 key 搬到新樹對應節點
            cur.execute(
                "UPDATE items SET category='mascara' "
                "WHERE user_id=? AND category='lash'",
                (uid,),
            )
            for itype, ckey in ITEM_TYPE_OTHER_KEY.items():
                cur.execute(
                    "UPDATE items SET category=? "
                    "WHERE user_id=? AND item_type=? AND category='other'",
                    (ckey, uid, itype),
                )
            cur.execute(
                "UPDATE items SET category='clothes-other' "
                "WHERE user_id=? AND category='other'",
                (uid,),
            )
            cur.execute(
                "UPDATE users SET categories_seeded=2 WHERE id=?", (uid,)
            )

        # 所有使用者（含已完成遷移者）的舊分類 key → 新三層樹節點
        cur.execute(
            "UPDATE items SET category='mascara' WHERE category='lash'"
        )
        for itype, ckey in ITEM_TYPE_OTHER_KEY.items():
            cur.execute(
                "UPDATE items SET category=? WHERE item_type=? AND category='other'",
                (ckey, itype),
            )
        cur.execute(
            "UPDATE items SET category='clothes-other' "
            "WHERE category='other' AND item_type NOT IN (?,?,?,?)",
            ("clothes", "accessories", "makeup", "skincare"),
        )

        # 顏色文字 → 色系（只補空的，不覆蓋使用者後來的設定）
        cur.execute(
            "UPDATE items SET color_family = CASE "
            "WHEN color LIKE '%米%' OR color LIKE '%卡其%' OR color LIKE '%杏%' "
            "  OR color LIKE '%奶茶%' OR lower(color) LIKE '%beige%' THEN 'beige' "
            "WHEN color LIKE '%咖啡%' OR color LIKE '%棕%' "
            "  OR lower(color) LIKE '%brown%' THEN 'brown' "
            "WHEN color LIKE '%粉%' OR lower(color) LIKE '%pink%' THEN 'pink' "
            "WHEN color LIKE '%紅%' OR lower(color) LIKE '%red%' THEN 'red' "
            "WHEN color LIKE '%橘%' OR color LIKE '%橙%' "
            "  OR lower(color) LIKE '%orange%' THEN 'orange' "
            "WHEN color LIKE '%黃%' OR lower(color) LIKE '%yellow%' THEN 'yellow' "
            "WHEN color LIKE '%綠%' OR lower(color) LIKE '%green%' THEN 'green' "
            "WHEN color LIKE '%牛仔%' OR color LIKE '%藍%' "
            "  OR lower(color) LIKE '%blue%' THEN 'blue' "
            "WHEN color LIKE '%紫%' OR lower(color) LIKE '%purple%' THEN 'purple' "
            "WHEN color LIKE '%金%' OR color LIKE '%銀%' "
            "  OR lower(color) LIKE '%metal%' THEN 'metal' "
            "WHEN color LIKE '%灰%' OR lower(color) LIKE '%gray%' "
            "  OR lower(color) LIKE '%grey%' THEN 'gray' "
            "WHEN color LIKE '%白%' OR lower(color) LIKE '%white%' THEN 'white' "
            "WHEN color LIKE '%黑%' OR lower(color) LIKE '%black%' THEN 'black' "
            "ELSE '' END "
            "WHERE (color_family IS NULL OR color_family='') "
            "AND color IS NOT NULL AND color != ''"
        )
        conn.commit()
    finally:
        conn.close()


def seed_user_categories(db, user):
    """使用者首次取得分類時，灌入三層預設樹。"""
    from .defaults import DEFAULT_TREE
    from .models import Category

    if user.categories_seeded >= 2:
        return
    if user.categories_seeded == 1:
        # 理論上 _migrate 已重建；保險起見清掉重灌
        db.query(Category).filter(Category.user_id == user.id).delete()

    for item_type, entries in DEFAULT_TREE.items():
        for pos, node in enumerate(entries):
            cat = Category(
                user_id=user.id,
                item_type=item_type,
                key=node["key"],
                label=node["label"],
                position=pos,
                parent_id=None,
            )
            db.add(cat)
            db.flush()
            for cpos, (ckey, clabel) in enumerate(node["children"]):
                db.add(
                    Category(
                        user_id=user.id,
                        item_type=item_type,
                        key=ckey,
                        label=clabel,
                        position=cpos,
                        parent_id=cat.id,
                    )
                )
    user.categories_seeded = 2
    db.commit()
