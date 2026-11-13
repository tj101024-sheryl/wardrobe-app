from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    bio: Mapped[str] = mapped_column(Text, default="")
    categories_seeded: Mapped[int] = mapped_column(Integer, default=0)
    notify_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_time: Mapped[str] = mapped_column(String(5), default="08:00")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    items: Mapped[list["Item"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    outfits: Mapped[list["Outfit"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    item_type: Mapped[str] = mapped_column(String(20), default="clothes")
    category: Mapped[str] = mapped_column(String(50), default="other")
    color: Mapped[str] = mapped_column(String(50), default="")
    color_family: Mapped[str] = mapped_column(String(20), default="")
    color_hex: Mapped[str] = mapped_column(String(7), default="")
    season: Mapped[str] = mapped_column(String(50), default="")
    occasion: Mapped[str] = mapped_column(String(50), default="")
    weather: Mapped[str] = mapped_column(String(50), default="")
    style: Mapped[str] = mapped_column(String(50), default="")
    expiry: Mapped[str] = mapped_column(String(20), default="")
    brand: Mapped[str] = mapped_column(String(100), default="")
    size: Mapped[str] = mapped_column(String(50), default="")
    price: Mapped[str] = mapped_column(String(50), default="")
    efficacy: Mapped[str] = mapped_column(String(200), default="")
    wear_count: Mapped[int] = mapped_column(Integer, default=0)
    last_worn_on: Mapped[str] = mapped_column(String(10), default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    image_path: Mapped[str] = mapped_column(String(500))
    cutout_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    owner: Mapped["User"] = relationship(back_populates="items")


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    item_type: Mapped[str] = mapped_column(String(20), index=True)
    key: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(100))
    position: Mapped[int] = mapped_column(Integer, default=0)
    # 三層分類：parent_id 為 NULL＝第二層小分類；有值＝第三層分類
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"), nullable=True, index=True
    )


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    date: Mapped[str] = mapped_column(String(20), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    cover_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    makeup_photo_path: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    canvas_data: Mapped[dict] = mapped_column(JSON, default=dict)
    visibility: Mapped[str] = mapped_column(String(20), default="public")
    makeup_visibility: Mapped[str] = mapped_column(
        String(20), default="public"
    )
    status: Mapped[str] = mapped_column(String(20), default="draft")
    occasion: Mapped[str] = mapped_column(String(50), default="")
    weather: Mapped[dict] = mapped_column(JSON, default=dict)
    layout_mode: Mapped[str] = mapped_column(String(20), default="list")
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    owner: Mapped["User"] = relationship(back_populates="outfits")
    items: Mapped[list["OutfitItem"]] = relationship(
        back_populates="outfit", cascade="all, delete-orphan"
    )
    products: Mapped[list["OutfitProduct"]] = relationship(
        back_populates="outfit", cascade="all, delete-orphan"
    )
    likes: Mapped[list["Like"]] = relationship(back_populates="outfit", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(back_populates="outfit", cascade="all, delete-orphan")


class OutfitItem(Base):
    __tablename__ = "outfit_items"
    __table_args__ = (
        UniqueConstraint("outfit_id", "item_id", name="uq_outfit_item"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    outfit_id: Mapped[int] = mapped_column(
        ForeignKey("outfits.id"), index=True
    )
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    role: Mapped[str] = mapped_column(String(20), default="")
    x: Mapped[float] = mapped_column(Float, default=0)
    y: Mapped[float] = mapped_column(Float, default=0)
    scale: Mapped[float] = mapped_column(Float, default=1)
    rotation: Mapped[float] = mapped_column(Float, default=0)
    z_index: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    outfit: Mapped["Outfit"] = relationship(back_populates="items")
    item: Mapped["Item"] = relationship()


class OutfitProduct(Base):
    __tablename__ = "outfit_products"
    __table_args__ = (
        UniqueConstraint("outfit_id", "item_id", name="uq_outfit_product"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    outfit_id: Mapped[int] = mapped_column(
        ForeignKey("outfits.id"), index=True
    )
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    outfit: Mapped["Outfit"] = relationship(back_populates="products")
    item: Mapped["Item"] = relationship()


class WearLog(Base):
    __tablename__ = "wear_logs"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "item_id", "worn_on", name="uq_wear_log_day"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    outfit_id: Mapped[int | None] = mapped_column(
        ForeignKey("outfits.id"), nullable=True, index=True
    )
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), index=True)
    worn_on: Mapped[str] = mapped_column(String(10), index=True)
    source: Mapped[str] = mapped_column(String(20), default="outfit")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Like(Base):
    __tablename__ = "likes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    outfit_id: Mapped[int] = mapped_column(ForeignKey("outfits.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    outfit: Mapped["Outfit"] = relationship(back_populates="likes")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    outfit_id: Mapped[int] = mapped_column(ForeignKey("outfits.id"), index=True)
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    outfit: Mapped["Outfit"] = relationship(back_populates="comments")


class Follow(Base):
    __tablename__ = "follows"

    follower_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
    following_id: Mapped[int] = mapped_column(ForeignKey("users.id"), primary_key=True)
