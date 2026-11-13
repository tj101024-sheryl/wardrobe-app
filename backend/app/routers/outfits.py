from datetime import date, datetime
from calendar import monthrange
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, object_session

from ..auth import get_current_user
from ..config import UPLOAD_DIR
from ..database import get_db
from ..models import (
    Comment,
    Item,
    Like,
    Outfit,
    OutfitItem,
    OutfitProduct,
    User,
    WearLog,
)
from ..schemas import (
    AutoComposeIn,
    AutoComposeOut,
    AutoOutfitOut,
    CommentIn,
    CommentOut,
    LikeOut,
    OutfitCalendarDay,
    OutfitCreate,
    OutfitOut,
    OutfitTodayOut,
    OutfitUpdate,
    OutfitWearIn,
    OutfitWearOut,
    RecommendationGroupsOut,
    UserBrief,
    WeatherOut,
    WeatherRecommendOut,
)
from ..services.recommend import auto_compose, recommendation_groups
from ..services.share_image import generate_share_image, share_text
from ..services.social import can_view_makeup, can_view_outfit
from ..services.weather import fetch_weather, manual_weather
from .items import item_to_out

router = APIRouter(prefix="/outfits", tags=["outfits"])

VISIBILITIES = {"public", "followers", "private"}
AUDIENCES = {"male", "female", "unisex"}
CONTENT_TYPES = {"outfit", "makeup", "skincare", "tutorial", "review"}
STYLES = {
    "japanese",
    "korean",
    "western",
    "natural",
    "special",
    "street",
    "minimal",
    "sweet",
    "sporty",
    "casual",
}
LEVELS = {"beginner", "advanced"}
BODY_TYPES = {"plus", "chubby", "petite", "tall", "pear", "apple", "standard"}
MAKEUP_LOOKS = {"natural", "refined", "bold"}


def _clean_values(values: list[str] | None, allowed: set[str]) -> list[str]:
    if not values:
        return []
    cleaned: list[str] = []
    for value in values:
        if value in allowed and value not in cleaned:
            cleaned.append(value)
    return cleaned


def _content_types(values: list[str] | None) -> list[str]:
    cleaned = _clean_values(values, CONTENT_TYPES)
    return cleaned or ["outfit"]


def _clean_photo(value: str | None) -> str | None:
    if not value:
        return None
    name = Path(str(value).replace("\\", "/")).name
    if name.startswith("files"):
        raise HTTPException(400, "照片路徑不正確")
    if not (UPLOAD_DIR / name).exists():
        raise HTTPException(400, "找不到上傳的照片，請重新上傳")
    return name


def _photo_url(value: str | None) -> str | None:
    return f"/files/uploads/{value}" if value else None


def _delete_photo(value: str | None) -> None:
    if not value:
        return
    target = UPLOAD_DIR / Path(value).name
    if target.exists():
        target.unlink()


def _today() -> str:
    return date.today().isoformat()


def _day(value: str) -> str:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date().isoformat()
    except (ValueError, TypeError):
        raise HTTPException(400, "日期格式應為 YYYY-MM-DD")


def _owned(db: Session, user: User, outfit_id: int) -> Outfit:
    outfit = (
        db.query(Outfit)
        .options(
            joinedload(Outfit.owner),
            joinedload(Outfit.items).joinedload(OutfitItem.item),
            joinedload(Outfit.products).joinedload(OutfitProduct.item),
        )
        .filter(Outfit.id == outfit_id, Outfit.user_id == user.id)
        .first()
    )
    if not outfit:
        raise HTTPException(404, "找不到這套穿搭")
    return outfit


def _visible(db: Session, user: User, outfit_id: int) -> Outfit:
    outfit = (
        db.query(Outfit)
        .options(
            joinedload(Outfit.owner),
            joinedload(Outfit.items).joinedload(OutfitItem.item),
            joinedload(Outfit.products).joinedload(OutfitProduct.item),
        )
        .filter(Outfit.id == outfit_id)
        .first()
    )
    if not outfit or not can_view_outfit(db, outfit, user):
        raise HTTPException(404, "找不到這套穿搭")
    return outfit


def _to_out(outfit: Outfit, viewer: User | None = None) -> OutfitOut:
    out = OutfitOut.model_validate(outfit)
    out.owner = UserBrief.model_validate(outfit.owner)
    out.weather = outfit.weather or {}
    out.audience = outfit.audience or "unisex"
    out.content_types = _content_types(outfit.content_types)
    out.styles = _clean_values(outfit.styles, STYLES)
    out.level = outfit.level if outfit.level in LEVELS else "beginner"
    out.body_types = _clean_values(outfit.body_types, BODY_TYPES)
    out.makeup_looks = _clean_values(outfit.makeup_looks, MAKEUP_LOOKS)
    out.video_url = outfit.video_url or None
    out.makeup_visibility = outfit.makeup_visibility or "public"
    out.photo_url = _photo_url(outfit.photo_path)
    out.makeup_photo_url = _photo_url(outfit.makeup_photo_path)
    for row_out, row in zip(out.items, outfit.items):
        row_out.item = item_to_out(row.item)
    for row_out, row in zip(out.products, outfit.products):
        row_out.item = item_to_out(row.item)
    out.like_count = len(outfit.likes)
    out.comment_count = len(outfit.comments)
    if viewer is not None:
        out.liked_by_me = any(
            like.user_id == viewer.id for like in outfit.likes
        )
        out.is_owner = outfit.user_id == viewer.id
        session = object_session(outfit)
        if session is not None and not can_view_makeup(
            session, outfit, viewer
        ):
            out.products = []
            out.makeup_photo_url = None
            out.makeup_hidden = True
    return out


def _base_query(db: Session, user: User):
    return (
        db.query(Outfit)
        .options(
            joinedload(Outfit.owner),
            joinedload(Outfit.items).joinedload(OutfitItem.item),
            joinedload(Outfit.products).joinedload(OutfitProduct.item),
        )
        .filter(Outfit.user_id == user.id)
    )


def _sync_items(
    db: Session, user: User, outfit: Outfit, rows
) -> None:
    for old in list(outfit.items):
        db.delete(old)
    db.flush()
    seen: set[int] = set()
    for row in rows:
        if row.item_id in seen:
            continue
        seen.add(row.item_id)
        item = db.get(Item, row.item_id)
        if not item or item.user_id != user.id:
            raise HTTPException(400, "穿搭中包含不存在的衣物")
        db.add(
            OutfitItem(
                outfit_id=outfit.id,
                item_id=row.item_id,
                role=row.role or "",
                x=row.x,
                y=row.y,
                scale=row.scale,
                rotation=row.rotation,
                z_index=row.z_index,
            )
        )
    db.flush()


def _sync_products(
    db: Session, user: User, outfit: Outfit, item_ids: list[int]
) -> None:
    for old in list(outfit.products):
        db.delete(old)
    db.flush()
    seen: set[int] = set()
    for item_id in item_ids:
        if item_id in seen:
            continue
        seen.add(item_id)
        item = db.get(Item, item_id)
        if not item or item.user_id != user.id:
            raise HTTPException(400, "使用品項中包含不存在的項目")
        db.add(OutfitProduct(outfit_id=outfit.id, item_id=item_id))
    db.flush()


def _sorted_items(outfit: Outfit) -> list[OutfitItem]:
    return sorted(outfit.items, key=lambda oi: (oi.z_index, oi.id))


@router.get("", response_model=list[OutfitOut])
def list_outfits(
    from_date: str | None = Query(None, alias="from"),
    to_date: str | None = Query(None, alias="to"),
    status: str | None = None,
    limit: int = Query(100, ge=1, le=300),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = _base_query(db, user)
    if from_date:
        query = query.filter(Outfit.date >= _day(from_date))
    if to_date:
        query = query.filter(Outfit.date <= _day(to_date))
    if status:
        query = query.filter(Outfit.status == status)
    rows = (
        query.order_by(Outfit.date.desc(), Outfit.id.desc())
        .limit(limit)
        .all()
    )
    return [_to_out(o, user) for o in rows]


@router.get("/today", response_model=OutfitTodayOut)
def today_outfit(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = _today()
    outfit = (
        _base_query(db, user)
        .filter(Outfit.date == today)
        .order_by(Outfit.id.desc())
        .first()
    )
    pending = (
        _base_query(db, user)
        .filter(Outfit.status == "scheduled", Outfit.date <= today)
        .order_by(Outfit.date.asc())
        .all()
    )
    return OutfitTodayOut(
        date=today,
        outfit=_to_out(outfit, user) if outfit else None,
        pending=[_to_out(o, user) for o in pending],
    )


@router.get("/pending", response_model=list[OutfitOut])
def pending_outfits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = _today()
    rows = (
        _base_query(db, user)
        .filter(Outfit.status == "scheduled", Outfit.date <= today)
        .order_by(Outfit.date.asc())
        .all()
    )
    return [_to_out(o, user) for o in rows]


@router.get("/calendar", response_model=list[OutfitCalendarDay])
def outfit_calendar(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    rows = (
        _base_query(db, user)
        .filter(Outfit.date >= start.isoformat(), Outfit.date <= end.isoformat())
        .order_by(Outfit.date.asc())
        .all()
    )
    days: dict[str, OutfitCalendarDay] = {}
    for outfit in rows:
        day = days.get(outfit.date)
        if not day:
            day = OutfitCalendarDay(date=outfit.date, count=0)
            days[outfit.date] = day
        day.count += 1
        day.outfit_ids.append(outfit.id)
        day.statuses.append(outfit.status)
    return [days[k] for k in sorted(days)]


@router.post("", response_model=OutfitOut)
def create_outfit(
    data: OutfitCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    day = _day(data.date) if data.date else _today()
    visibility = data.visibility if data.visibility in VISIBILITIES else "public"
    makeup_visibility = (
        data.makeup_visibility
        if data.makeup_visibility in VISIBILITIES
        else "public"
    )
    audience = data.audience if data.audience in AUDIENCES else "unisex"
    status = "scheduled" if day > _today() else "draft"
    outfit = Outfit(
        user_id=user.id,
        title=data.title.strip(),
        date=day,
        notes=data.notes,
        occasion=data.occasion,
        audience=audience,
        content_types=_content_types(data.content_types),
        styles=_clean_values(data.styles, STYLES),
        level=data.level if data.level in LEVELS else "beginner",
        body_types=_clean_values(data.body_types, BODY_TYPES),
        makeup_looks=_clean_values(data.makeup_looks, MAKEUP_LOOKS),
        video_url=(data.video_url or "").strip() or None,
        visibility=visibility,
        makeup_visibility=makeup_visibility,
        photo_path=_clean_photo(data.photo_path),
        makeup_photo_path=_clean_photo(data.makeup_photo_path),
        status=status,
        layout_mode=data.layout_mode or "list",
        weather=data.weather or {},
        canvas_data=data.canvas_data or {},
    )
    db.add(outfit)
    db.flush()
    _sync_items(db, user, outfit, data.items)
    _sync_products(db, user, outfit, data.product_ids)
    db.commit()
    return _to_out(_owned(db, user, outfit.id), user)


def _candidate_items(db: Session, user: User) -> list[Item]:
    return (
        db.query(Item)
        .filter(
            Item.user_id == user.id,
            Item.item_type.in_(("clothes", "accessories")),
        )
        .all()
    )


@router.get("/recommendations", response_model=WeatherRecommendOut)
async def weather_recommendations(
    lat: float = Query(0, ge=-90, le=90),
    lon: float = Query(0, ge=-180, le=180),
    city: str | None = None,
    manual: bool = False,
    temp_c: float | None = None,
    rain_prob: int | None = None,
    weather_text: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if manual and temp_c is not None:
        weather = manual_weather(
            temp_c,
            rain_prob or 0,
            weather_text or "多雲",
            city or "手動天氣",
        )
    else:
        weather = await fetch_weather(lat, lon, city)
    groups = recommendation_groups(_candidate_items(db, user), weather)
    return WeatherRecommendOut(
        weather=WeatherOut.model_validate(weather),
        groups=RecommendationGroupsOut(
            **{
                key: [item_to_out(item) for item in values]
                for key, values in groups.items()
            }
        ),
    )


@router.post("/auto-compose", response_model=AutoComposeOut)
async def weather_auto_compose(
    data: AutoComposeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.manual and data.temp_c is not None:
        weather = manual_weather(
            data.temp_c,
            data.rain_prob or 0,
            data.weather_text or "多雲",
            data.city or "手動天氣",
        )
    else:
        weather = await fetch_weather(data.lat, data.lon, data.city)
    outfits = auto_compose(
        _candidate_items(db, user),
        weather,
        data.seed,
        data.locked_item_ids,
    )
    return AutoComposeOut(
        weather=WeatherOut.model_validate(weather),
        outfits=[
            AutoOutfitOut(
                occasion=row["occasion"],
                items=[item_to_out(item) for item in row["items"]],
                reasons=row["reasons"],
            )
            for row in outfits
        ],
    )


@router.get("/{outfit_id}", response_model=OutfitOut)
def get_outfit(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _to_out(_visible(db, user, outfit_id), user)


@router.post("/{outfit_id}/like", response_model=LikeOut)
def like_outfit(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _visible(db, user, outfit_id)
    existing = (
        db.query(Like)
        .filter(Like.user_id == user.id, Like.outfit_id == outfit.id)
        .first()
    )
    if not existing:
        db.add(Like(user_id=user.id, outfit_id=outfit.id))
        db.commit()
    count = db.query(Like).filter(Like.outfit_id == outfit.id).count()
    return LikeOut(liked=True, like_count=count)


@router.delete("/{outfit_id}/like", response_model=LikeOut)
def unlike_outfit(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _visible(db, user, outfit_id)
    db.query(Like).filter(
        Like.user_id == user.id, Like.outfit_id == outfit.id
    ).delete(synchronize_session=False)
    db.commit()
    count = db.query(Like).filter(Like.outfit_id == outfit.id).count()
    return LikeOut(liked=False, like_count=count)


@router.get("/{outfit_id}/comments", response_model=list[CommentOut])
def list_comments(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _visible(db, user, outfit_id)
    return (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.outfit_id == outfit.id)
        .order_by(Comment.created_at.asc())
        .all()
    )


@router.post("/{outfit_id}/comments", response_model=CommentOut)
def create_comment(
    outfit_id: int,
    data: CommentIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _visible(db, user, outfit_id)
    body = data.body.strip()
    if not body:
        raise HTTPException(400, "留言不能是空的")
    comment = Comment(
        user_id=user.id, outfit_id=outfit.id, body=body
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/{outfit_id}/share-image")
def share_image(
    outfit_id: int,
    format: str = "feed",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if format not in ("story", "feed", "fb"):
        raise HTTPException(400, "不支援的分享尺寸")
    outfit = _visible(db, user, outfit_id)
    try:
        path = generate_share_image(
            outfit, format, can_view_makeup(db, outfit, user)
        )
    except Exception:
        raise HTTPException(500, "分享圖片產生失敗")
    return {
        "url": f"/files/shares/{path.name}",
        "format": format,
        "width": 1080 if format != "fb" else 1200,
        "height": 1920 if format == "story" else 1350 if format == "feed" else 630,
    }


@router.get("/{outfit_id}/share-text")
def get_share_text(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _visible(db, user, outfit_id)
    return {"text": share_text(outfit)}


@router.patch("/{outfit_id}", response_model=OutfitOut)
def update_outfit(
    outfit_id: int,
    data: OutfitUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _owned(db, user, outfit_id)
    payload = data.model_dump(exclude_unset=True)
    items = payload.pop("items", None)
    product_ids = payload.pop("product_ids", None)

    if "date" in payload and payload["date"]:
        payload["date"] = _day(payload["date"])
        if outfit.status != "worn":
            outfit.status = (
                "scheduled" if payload["date"] > _today() else "draft"
            )
    for key in ("visibility", "makeup_visibility"):
        if key in payload and payload[key] not in VISIBILITIES:
            raise HTTPException(400, "隱私設定不正確")
    if "audience" in payload and payload["audience"] not in AUDIENCES:
        raise HTTPException(400, "內容取向不正確")
    if "content_types" in payload:
        payload["content_types"] = _content_types(payload["content_types"])
    for field, allowed in (
        ("styles", STYLES),
        ("body_types", BODY_TYPES),
        ("makeup_looks", MAKEUP_LOOKS),
    ):
        if field in payload:
            payload[field] = _clean_values(payload[field], allowed)
    if "level" in payload and payload["level"] not in LEVELS:
        raise HTTPException(400, "程度設定不正確")
    if "video_url" in payload:
        payload["video_url"] = (payload["video_url"] or "").strip() or None

    for key in ("photo_path", "makeup_photo_path"):
        if key in payload:
            new_path = _clean_photo(payload[key])
            old_path = getattr(outfit, key)
            if old_path and old_path != new_path:
                _delete_photo(old_path)
            payload[key] = new_path

    for field, value in payload.items():
        setattr(outfit, field, value)
    if items is not None:
        _sync_items(db, user, outfit, data.items or [])
    if product_ids is not None:
        _sync_products(db, user, outfit, data.product_ids or [])
    db.commit()
    return _to_out(_owned(db, user, outfit.id), user)


@router.delete("/{outfit_id}")
def delete_outfit(
    outfit_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _owned(db, user, outfit_id)
    _delete_photo(outfit.photo_path)
    _delete_photo(outfit.makeup_photo_path)
    db.query(WearLog).filter(WearLog.outfit_id == outfit.id).update(
        {"outfit_id": None}, synchronize_session=False
    )
    db.delete(outfit)
    db.commit()
    return {"ok": True}


@router.post("/{outfit_id}/wear", response_model=OutfitWearOut)
def wear_outfit(
    outfit_id: int,
    data: OutfitWearIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _owned(db, user, outfit_id)
    item_ids = list(
        dict.fromkeys(
            [row.item_id for row in outfit.items]
            + [row.item_id for row in outfit.products]
        )
    )
    if not item_ids:
        raise HTTPException(400, "這天還沒有可累計的衣物或使用品項")
    worn_on = _day(data.worn_on) if data.worn_on else (outfit.date or _today())
    if worn_on > _today():
        raise HTTPException(400, "還沒到這一天，不能先累計穿著次數")

    counted: list[int] = []
    skipped: list[int] = []
    for item_id in item_ids:
        exists = (
            db.query(WearLog)
            .filter(
                WearLog.user_id == user.id,
                WearLog.item_id == item_id,
                WearLog.worn_on == worn_on,
            )
            .first()
        )
        if exists:
            skipped.append(item_id)
            continue
        db.add(
            WearLog(
                user_id=user.id,
                outfit_id=outfit.id,
                item_id=item_id,
                worn_on=worn_on,
                source="outfit",
            )
        )
        item = db.get(Item, item_id)
        if item:
            item.wear_count = (item.wear_count or 0) + 1
            item.last_worn_on = worn_on
        counted.append(item_id)

    outfit.status = "worn"
    outfit.date = worn_on
    outfit_pk = outfit.id
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        # 連點或兩個請求同時送出時，其中一個會撞到每日唯一 log。
        # 這種情況視為「今天已經計過」，不要讓使用者看到連線／500 錯誤。
        if "wear_logs" not in str(exc):
            raise
        return OutfitWearOut(
            outfit=_to_out(_owned(db, user, outfit_pk), user),
            counted_items=[],
            skipped_already_counted=item_ids,
        )
    return OutfitWearOut(
        outfit=_to_out(_owned(db, user, outfit.id), user),
        counted_items=counted,
        skipped_already_counted=skipped,
    )


@router.delete("/{outfit_id}/wear", response_model=OutfitOut)
def undo_wear(
    outfit_id: int,
    worn_on: str | None = Query(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    outfit = _owned(db, user, outfit_id)
    target = _day(worn_on) if worn_on else (outfit.date or _today())
    logs = (
        db.query(WearLog)
        .filter(
            WearLog.user_id == user.id,
            WearLog.outfit_id == outfit.id,
            WearLog.worn_on == target,
        )
        .all()
    )
    for log in logs:
        item = db.get(Item, log.item_id)
        if item:
            item.wear_count = max(0, (item.wear_count or 0) - 1)
            latest = (
                db.query(WearLog)
                .filter(
                    WearLog.user_id == user.id,
                    WearLog.item_id == log.item_id,
                    WearLog.id != log.id,
                )
                .order_by(WearLog.worn_on.desc())
                .first()
            )
            item.last_worn_on = latest.worn_on if latest else ""
        db.delete(log)
    outfit.status = "scheduled" if outfit.date > _today() else "draft"
    db.commit()
    return _to_out(_owned(db, user, outfit.id), user)
