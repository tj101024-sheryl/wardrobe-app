from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, text
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user
from ..database import get_db
from ..models import Follow, Like, Outfit, OutfitItem, OutfitProduct, User
from ..schemas import FeedOut
from .outfits import (
    AUDIENCES,
    BODY_TYPES,
    MAKEUP_LOOKS,
    STYLES,
    _to_out,
)

router = APIRouter(prefix="/feed", tags=["feed"])


def _csv(value: str | None) -> list[str]:
    return [part.strip() for part in (value or "").split(",") if part.strip()]


def _json_any(column: str, values: list[str]):
    prefix = f"{column}_"
    placeholders = ", ".join(f":{prefix}{i}" for i in range(len(values)))
    params = {
        f"{prefix}{i}": value for i, value in enumerate(values)
    }
    return text(
        f"EXISTS (SELECT 1 FROM json_each(outfits.{column}) "
        f"WHERE json_each.value IN ({placeholders}))"
    ).bindparams(**params)


@router.get("", response_model=FeedOut)
def get_feed(
    scope: str = Query("discover", pattern="^(discover|following)$"),
    audience: str = Query("all", pattern="^(all|male|female|unisex)$"),
    audiences: str | None = None,
    content_type: str = Query(
        "all", pattern="^(all|outfit|makeup|skincare|tutorial|review)$"
    ),
    format: str = Query("all", pattern="^(all|photo|video|tutorial)$"),
    styles: str | None = None,
    level: str = Query("all", pattern="^(all|beginner|advanced)$"),
    occasions: str | None = None,
    body_types: str | None = None,
    makeup_looks: str | None = None,
    q: str | None = None,
    sort: str = Query("latest", pattern="^(latest|popular)$"),
    cursor: int | None = None,
    limit: int = Query(12, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Outfit)
        .options(
            joinedload(Outfit.owner),
            joinedload(Outfit.items).joinedload(OutfitItem.item),
            joinedload(Outfit.products).joinedload(OutfitProduct.item),
        )
    )

    if scope == "following":
        following_ids = [
            row.following_id
            for row in db.query(Follow)
            .filter(Follow.follower_id == user.id)
            .all()
        ]
        ids = following_ids + [user.id]
        query = query.filter(Outfit.user_id.in_(ids)).filter(
            or_(
                Outfit.user_id == user.id,
                Outfit.visibility.in_(("public", "followers")),
            )
        )
    else:
        query = query.filter(Outfit.visibility == "public")

    audience_values = [value for value in _csv(audiences) if value in AUDIENCES]
    if audience_values:
        query = query.filter(Outfit.audience.in_(audience_values))
    elif audience != "all":
        query = query.filter(Outfit.audience == audience)

    if content_type != "all":
        query = query.filter(
            text(
                "EXISTS (SELECT 1 FROM json_each(outfits.content_types) "
                "WHERE json_each.value = :content_type)"
            ).bindparams(content_type=content_type)
        )

    if format == "video":
        query = query.filter(
            Outfit.video_url.isnot(None), Outfit.video_url != ""
        )
    elif format == "photo":
        query = query.filter(
            or_(Outfit.video_url.is_(None), Outfit.video_url == "")
        )
    elif format == "tutorial":
        query = query.filter(
            text(
                "EXISTS (SELECT 1 FROM json_each(outfits.content_types) "
                "WHERE json_each.value = 'tutorial')"
            )
        )

    style_values = [value for value in _csv(styles) if value in STYLES]
    if style_values:
        query = query.filter(_json_any("styles", style_values))

    if level != "all":
        query = query.filter(Outfit.level == level)

    occasion_values = _csv(occasions)
    if occasion_values:
        query = query.filter(Outfit.occasion.in_(occasion_values))

    body_values = [
        value for value in _csv(body_types) if value in BODY_TYPES
    ]
    if body_values:
        query = query.filter(_json_any("body_types", body_values))

    look_values = [
        value for value in _csv(makeup_looks) if value in MAKEUP_LOOKS
    ]
    if look_values:
        query = query.filter(_json_any("makeup_looks", look_values))

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Outfit.title.ilike(term),
                Outfit.notes.ilike(term),
                Outfit.occasion.ilike(term),
                Outfit.owner.has(User.username.ilike(term)),
            )
        )

    if sort == "popular":
        like_count = (
            db.query(func.count(Like.id))
            .filter(Like.outfit_id == Outfit.id)
            .correlate(Outfit)
            .scalar_subquery()
        )
        query = query.order_by(like_count.desc(), Outfit.id.desc())
    else:
        if cursor:
            query = query.filter(Outfit.id < cursor)
        query = query.order_by(Outfit.id.desc())

    rows = query.limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    return FeedOut(
        items=[_to_out(row, user) for row in rows],
        next_cursor=(
            rows[-1].id
            if has_more and rows and sort == "latest"
            else None
        ),
    )
