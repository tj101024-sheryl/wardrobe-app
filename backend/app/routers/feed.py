from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user
from ..database import get_db
from ..models import Follow, Outfit, OutfitItem, OutfitProduct, User
from ..schemas import FeedOut
from .outfits import _to_out

router = APIRouter(prefix="/feed", tags=["feed"])


@router.get("", response_model=FeedOut)
def get_feed(
    scope: str = Query("discover", pattern="^(discover|following)$"),
    audience: str = Query("all", pattern="^(all|male|female|unisex)$"),
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

    if audience != "all":
        query = query.filter(Outfit.audience == audience)

    if cursor:
        query = query.filter(Outfit.id < cursor)

    rows = query.order_by(Outfit.id.desc()).limit(limit + 1).all()
    has_more = len(rows) > limit
    rows = rows[:limit]
    return FeedOut(
        items=[_to_out(row, user) for row in rows],
        next_cursor=rows[-1].id if has_more and rows else None,
    )
