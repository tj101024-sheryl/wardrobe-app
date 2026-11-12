from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=50)
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    bio: str
    created_at: datetime


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


class ItemCreate(BaseModel):
    name: str = ""
    item_type: str = "clothes"
    category: str = "other"
    color: str = ""
    season: str = ""
    occasion: str = ""
    weather: str = ""
    style: str = ""
    expiry: str = ""
    tags: list[str] = []
    source_url: str | None = None
    image_path: str | None = None


class ItemUpdate(BaseModel):
    name: str | None = None
    item_type: str | None = None
    category: str | None = None
    color: str | None = None
    season: str | None = None
    occasion: str | None = None
    weather: str | None = None
    style: str | None = None
    expiry: str | None = None
    brand: str | None = None
    size: str | None = None
    price: str | None = None
    tags: list[str] | None = None


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    item_type: str
    category: str
    color: str
    season: str
    occasion: str
    weather: str
    style: str
    expiry: str
    brand: str
    size: str
    price: str
    wear_count: int
    tags: list
    image_path: str
    cutout_path: str | None
    source_url: str | None
    created_at: datetime


class ScrapeIn(BaseModel):
    url: str


class ScrapeImage(BaseModel):
    url: str
    width: int | None = None
    height: int | None = None
    kind: str = "image"


class ScrapeOut(BaseModel):
    url: str
    page_title: str = ""
    images: list[ScrapeImage]


class SaveScrapedImageIn(BaseModel):
    url: str
    name: str = ""
    item_type: str = "clothes"
    category: str = "other"
    color: str = ""
    season: str = ""
    occasion: str = ""
    weather: str = ""
    style: str = ""
    expiry: str = ""
    tags: list[str] = []
    source_page: str | None = None


class CutoutIn(BaseModel):
    item_id: int
    model: str = "u2net"
