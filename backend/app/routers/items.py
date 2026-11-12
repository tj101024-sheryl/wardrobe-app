import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import CUTOUT_DIR, UPLOAD_DIR
from ..database import get_db
from ..models import Item, User
from ..schemas import ItemCreate, ItemOut, ItemUpdate

router = APIRouter(prefix="/items", tags=["items"])

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _file_url(path: str | None) -> str | None:
    if not path:
        return None
    return f"/files/uploads/{path}"


def _cutout_url(path: str | None) -> str | None:
    if not path:
        return None
    return f"/files/cutouts/{path}"


def item_to_out(item: Item) -> ItemOut:
    out = ItemOut.model_validate(item)
    out.image_path = _file_url(item.image_path) or ""
    out.cutout_path = _cutout_url(item.cutout_path)
    return out


@router.get("", response_model=list[ItemOut])
def list_items(
    item_type: str | None = None,
    category: str | None = None,
    q: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Item).filter(Item.user_id == user.id)
    if item_type and item_type != "all":
        query = query.filter(Item.item_type == item_type)
    if category and category != "all":
        query = query.filter(Item.category == category)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Item.name.like(like))
            | (Item.color.like(like))
            | (Item.style.like(like))
            | (Item.tags.cast(str).like(like))
        )
    items = query.order_by(Item.created_at.desc()).all()
    return [item_to_out(i) for i in items]


@router.post("", response_model=ItemOut)
async def create_item(
    file: UploadFile = File(...),
    name: str = "",
    item_type: str = "clothes",
    category: str = "other",
    color: str = "",
    season: str = "",
    occasion: str = "",
    weather: str = "",
    style: str = "",
    expiry: str = "",
    tags: str = "",
    source_url: str = "",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await _save_upload(
        file, name, item_type, category, color, season, occasion, weather, style,
        expiry, tags, source_url, user, db,
    )


async def _save_upload(
    file: UploadFile,
    name: str,
    item_type: str,
    category: str,
    color: str,
    season: str,
    occasion: str,
    weather: str,
    style: str,
    expiry: str,
    tags: str,
    source_url: str,
    user: User,
    db: Session,
) -> Item:
    ext = Path(file.filename or "img.png").suffix.lower()
    if ext not in ALLOWED_EXT:
        ext = ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    import json

    try:
        tag_list = json.loads(tags) if tags else []
    except json.JSONDecodeError:
        tag_list = [t for t in tags.split(",") if t] if tags else []

    item = Item(
        user_id=user.id,
        name=name or "未命名衣物",
        item_type=item_type or "clothes",
        category=category or "other",
        color=color,
        season=season,
        occasion=occasion,
        weather=weather,
        style=style,
        expiry=expiry,
        tags=tag_list,
        image_path=filename,
        source_url=source_url or None,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=ItemOut)
def update_item(
    item_id: int,
    data: ItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(Item, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "找不到衣物")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item_to_out(item)


@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(Item, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "找不到衣物")
    for folder, p in ((UPLOAD_DIR, item.image_path), (CUTOUT_DIR, item.cutout_path)):
        if p:
            f = folder / p
            if f.exists():
                f.unlink()
    db.delete(item)
    db.commit()
    return {"ok": True}
