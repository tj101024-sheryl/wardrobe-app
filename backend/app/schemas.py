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
    notify_enabled: bool = True
    notify_time: str = "08:00"
    created_at: datetime


class UserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str


class NotificationSettingsIn(BaseModel):
    enabled: bool | None = None
    time: str | None = None


class NotificationSettingsOut(BaseModel):
    enabled: bool
    time: str


class ItemCreate(BaseModel):
    name: str = ""
    item_type: str = "clothes"
    category: str = "other"
    color: str = ""
    color_family: str = ""
    color_hex: str = ""
    season: str = ""
    occasion: str = ""
    weather: str = ""
    style: str = ""
    expiry: str = ""
    efficacy: str = ""
    tags: list[str] = []
    source_url: str | None = None
    image_path: str | None = None


class ItemUpdate(BaseModel):
    name: str | None = None
    item_type: str | None = None
    category: str | None = None
    color: str | None = None
    color_family: str | None = None
    color_hex: str | None = None
    season: str | None = None
    occasion: str | None = None
    weather: str | None = None
    style: str | None = None
    expiry: str | None = None
    brand: str | None = None
    size: str | None = None
    price: str | None = None
    efficacy: str | None = None
    tags: list[str] | None = None


class ItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    item_type: str
    category: str
    color: str
    color_family: str = ""
    color_hex: str = ""
    season: str
    occasion: str
    weather: str
    style: str
    expiry: str
    brand: str
    size: str
    price: str
    efficacy: str = ""
    wear_count: int
    last_worn_on: str = ""
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
    color_family: str = ""
    color_hex: str = ""
    season: str = ""
    occasion: str = ""
    weather: str = ""
    style: str = ""
    expiry: str = ""
    efficacy: str = ""
    tags: list[str] = []
    source_page: str | None = None


class CutoutIn(BaseModel):
    item_id: int
    model: str = "u2net"


class OutfitItemIn(BaseModel):
    item_id: int
    role: str = ""
    x: float = 0
    y: float = 0
    scale: float = 1
    rotation: float = 0
    z_index: int = 0


class OutfitItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    role: str
    x: float
    y: float
    scale: float
    rotation: float
    z_index: int
    item: ItemOut


class OutfitProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_id: int
    item: ItemOut


class OutfitCreate(BaseModel):
    title: str = ""
    date: str = ""
    notes: str = ""
    occasion: str = ""
    audience: str = "unisex"
    visibility: str = "public"
    makeup_visibility: str = "public"
    photo_path: str | None = None
    makeup_photo_path: str | None = None
    layout_mode: str = "list"
    weather: dict = Field(default_factory=dict)
    canvas_data: dict = Field(default_factory=dict)
    items: list[OutfitItemIn] = Field(default_factory=list)
    product_ids: list[int] = Field(default_factory=list)


class OutfitUpdate(BaseModel):
    title: str | None = None
    date: str | None = None
    notes: str | None = None
    occasion: str | None = None
    audience: str | None = None
    visibility: str | None = None
    makeup_visibility: str | None = None
    photo_path: str | None = None
    makeup_photo_path: str | None = None
    layout_mode: str | None = None
    weather: dict | None = None
    canvas_data: dict | None = None
    items: list[OutfitItemIn] | None = None
    product_ids: list[int] | None = None


class OutfitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    date: str
    status: str
    notes: str
    occasion: str
    audience: str = "unisex"
    weather: dict | None = None
    layout_mode: str
    canvas_data: dict = Field(default_factory=dict)
    visibility: str
    makeup_visibility: str = "public"
    photo_url: str | None = None
    makeup_photo_url: str | None = None
    published_at: datetime | None = None
    created_at: datetime
    items: list[OutfitItemOut]
    products: list[OutfitProductOut] = Field(default_factory=list)
    owner: UserBrief
    liked_by_me: bool = False
    is_owner: bool = False
    makeup_hidden: bool = False
    like_count: int = 0
    comment_count: int = 0


class OutfitWearIn(BaseModel):
    worn_on: str | None = None


class OutfitWearOut(BaseModel):
    outfit: OutfitOut
    counted_items: list[int]
    skipped_already_counted: list[int]


class OutfitCalendarDay(BaseModel):
    date: str
    count: int
    outfit_ids: list[int] = Field(default_factory=list)
    statuses: list[str] = Field(default_factory=list)


class OutfitTodayOut(BaseModel):
    date: str
    outfit: OutfitOut | None = None
    pending: list[OutfitOut] = Field(default_factory=list)


class ColorExploreOut(BaseModel):
    color_family: str
    matched_family: str
    match: str
    items: list[ItemOut]
    outfits: list[OutfitOut]


class WeatherLocationOut(BaseModel):
    name: str
    lat: float
    lon: float


class WeatherCurrentOut(BaseModel):
    temp_c: float
    feels_like_c: float
    rain_mm: float
    rain_prob: int
    wind_kph: float
    humidity: int
    code: int
    text: str


class WeatherDayOut(BaseModel):
    date: str
    max_c: float
    min_c: float
    rain_prob: int
    code: int
    text: str


class WeatherOut(BaseModel):
    location: WeatherLocationOut
    current: WeatherCurrentOut
    daily: list[WeatherDayOut]
    updated_at: str
    source: str = "open-meteo"


class WeatherCityOut(BaseModel):
    id: int | None = None
    name: str
    country: str = ""
    admin1: str = ""
    lat: float
    lon: float


class RecommendationGroupsOut(BaseModel):
    tops: list[ItemOut] = Field(default_factory=list)
    bottoms: list[ItemOut] = Field(default_factory=list)
    dresses: list[ItemOut] = Field(default_factory=list)
    outers: list[ItemOut] = Field(default_factory=list)
    shoes: list[ItemOut] = Field(default_factory=list)
    accessories: list[ItemOut] = Field(default_factory=list)


class WeatherRecommendOut(BaseModel):
    weather: WeatherOut
    groups: RecommendationGroupsOut


class AutoComposeIn(BaseModel):
    date: str = ""
    lat: float = 0
    lon: float = 0
    city: str | None = None
    locked_item_ids: list[int] = Field(default_factory=list)
    seed: int | None = None
    manual: bool = False
    temp_c: float | None = None
    rain_prob: int | None = None
    weather_text: str | None = None


class AutoOutfitOut(BaseModel):
    occasion: str
    items: list[ItemOut]
    reasons: list[str] = Field(default_factory=list)


class AutoComposeOut(BaseModel):
    weather: WeatherOut
    outfits: list[AutoOutfitOut]


class LikeOut(BaseModel):
    liked: bool
    like_count: int


class CommentIn(BaseModel):
    body: str = Field(min_length=1, max_length=500)


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    created_at: datetime
    user: UserBrief


class FollowOut(BaseModel):
    following: bool
    follower_count: int


class FeedOut(BaseModel):
    items: list[OutfitOut]
    next_cursor: int | None = None


class UserProfileOut(BaseModel):
    id: int
    username: str
    bio: str
    created_at: datetime
    outfit_count: int
    follower_count: int
    following_count: int
    is_following: bool
    is_me: bool
    outfits: list[OutfitOut] = Field(default_factory=list)


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    item_type: str
    key: str
    label: str
    position: int
    parent_id: int | None = None


class CategoryCreate(BaseModel):
    item_type: str
    label: str = Field(min_length=1, max_length=50)
    parent_id: int | None = None


class CategoryUpdate(BaseModel):
    label: str = Field(min_length=1, max_length=50)


class CategoryMergeIn(BaseModel):
    target_id: int


class CategoryReorderIn(BaseModel):
    item_type: str
    ids: list[int] = Field(min_length=1)
    parent_id: int | None = None
