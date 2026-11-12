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
    """SQLite 簡易遷移：缺欄位就補上（舊資料預設為衣服）。"""
    import sqlite3

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
        if "wear_count" not in cols:
            cur.execute(
                "ALTER TABLE items ADD COLUMN wear_count INTEGER DEFAULT 0"
            )
        conn.commit()
    finally:
        conn.close()
