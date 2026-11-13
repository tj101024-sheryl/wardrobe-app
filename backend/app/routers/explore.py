from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user
from ..color_utils import FAMILY_HEX, MONO_NEUTRALS, nearest_family
from ..database import get_db
from ..models import Item, Outfit, OutfitItem, OutfitProduct, User
from ..schemas import ColorExploreOut
from .items import item_to_out
from .outfits import _to_out

router = APIRouter(prefix="/explore", tags=["explore"])


@router.get("/color", response_model=ColorExploreOut)
def color_explore(
    color_family: str | None = None,
    color_hex: str | None = None,
    match: str = Query("any", pattern="^(any|mono)$"),
    category: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    family = color_family or ""
    if color_hex:
        family = nearest_family(color_hex)
    if family not in FAMILY_HEX:
        raise HTTPException(400, "未知的顏色，請選擇色票或重新挑色")

    query = db.query(Item).filter(
        Item.user_id == user.id, Item.color_family == family
    )
    if category:
        query = query.filter(Item.category == category)
    items = query.order_by(Item.created_at.desc()).limit(300).all()

    outfit_rows = (
        db.query(Outfit)
        .options(
            joinedload(Outfit.items).joinedload(OutfitItem.item),
            joinedload(Outfit.products).joinedload(OutfitProduct.item),
        )
        .filter(Outfit.user_id == user.id)
        .order_by(Outfit.date.desc(), Outfit.id.desc())
        .limit(300)
        .all()
    )

    matched: list[Outfit] = []
    for outfit in outfit_rows:
        families = [
            row.item.color_family
            for row in outfit.items
            if row.item is not None and row.item.color_family
        ]
        if family not in families:
            continue
        if match == "mono":
            allowed = {family} | MONO_NEUTRALS
            if any(value not in allowed for value in families):
                continue
        matched.append(outfit)

    return ColorExploreOut(
        color_family=family,
        matched_family=family,
        match=match,
        items=[item_to_out(item) for item in items],
        outfits=[_to_out(outfit) for outfit in matched],
    )
