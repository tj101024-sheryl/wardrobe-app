from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
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
    season: Mapped[str] = mapped_column(String(50), default="")
    occasion: Mapped[str] = mapped_column(String(50), default="")
    weather: Mapped[str] = mapped_column(String(50), default="")
    style: Mapped[str] = mapped_column(String(50), default="")
    expiry: Mapped[str] = mapped_column(String(20), default="")
    brand: Mapped[str] = mapped_column(String(100), default="")
    size: Mapped[str] = mapped_column(String(50), default="")
    price: Mapped[str] = mapped_column(String(50), default="")
    wear_count: Mapped[int] = mapped_column(Integer, default=0)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    image_path: Mapped[str] = mapped_column(String(500))
    cutout_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    owner: Mapped["User"] = relationship(back_populates="items")


class Outfit(Base):
    __tablename__ = "outfits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255), default="")
    date: Mapped[str] = mapped_column(String(20), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    cover_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    canvas_data: Mapped[dict] = mapped_column(JSON, default=dict)
    visibility: Mapped[str] = mapped_column(String(20), default="private")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    owner: Mapped["User"] = relationship(back_populates="outfits")
    likes: Mapped[list["Like"]] = relationship(back_populates="outfit", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(back_populates="outfit", cascade="all, delete-orphan")


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
