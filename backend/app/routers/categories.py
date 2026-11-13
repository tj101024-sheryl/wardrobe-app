import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db, seed_user_categories
from ..models import Category, Item, User
from ..schemas import (
    CategoryCreate,
    CategoryMergeIn,
    CategoryOut,
    CategoryReorderIn,
    CategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["categories"])


def _owned(db: Session, user: User, cat_id: int) -> Category:
    cat = db.get(Category, cat_id)
    if not cat or cat.user_id != user.id:
        raise HTTPException(404, "找不到分類")
    return cat


def _ordered(db: Session, user: User, item_type: str) -> list[Category]:
    return (
        db.query(Category)
        .filter(Category.user_id == user.id, Category.item_type == item_type)
        .order_by(Category.position, Category.id)
        .all()
    )


def _siblings(
    db: Session, user: User, item_type: str, parent_id: int | None
) -> list[Category]:
    """同層（同一個父節點）的分類，排序後回傳。"""
    query = db.query(Category).filter(
        Category.user_id == user.id, Category.item_type == item_type
    )
    if parent_id is None:
        query = query.filter(Category.parent_id.is_(None))
    else:
        query = query.filter(Category.parent_id == parent_id)
    return query.order_by(Category.position, Category.id).all()


def _resolve_parent(
    db: Session, user: User, item_type: str, parent_id: int | None
) -> Category | None:
    if parent_id is None:
        return None
    parent = _owned(db, user, parent_id)
    if parent.item_type != item_type:
        raise HTTPException(400, "父分類與大分類不一致")
    if parent.parent_id is not None:
        raise HTTPException(400, "分類最多三層，第三層不能再有子分類")
    return parent


def _same_parent(a: Category, b: Category) -> bool:
    return a.item_type == b.item_type and a.parent_id == b.parent_id


@router.get("", response_model=list[CategoryOut])
def list_categories(
    item_type: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    seed_user_categories(db, user)
    return _ordered(db, user, item_type)


@router.post("", response_model=CategoryOut)
def create_category(
    data: CategoryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    seed_user_categories(db, user)
    label = data.label.strip()
    if not label:
        raise HTTPException(400, "分類名稱不能是空的")
    parent = _resolve_parent(db, user, data.item_type, data.parent_id)

    siblings = _siblings(db, user, data.item_type, parent.id if parent else None)
    if any(c.label == label for c in siblings):
        raise HTTPException(400, "同一層已有同名分類")

    cat = Category(
        user_id=user.id,
        item_type=data.item_type,
        key=f"c_{uuid.uuid4().hex[:10]}",
        label=label,
        position=(siblings[-1].position + 1) if siblings else 0,
        parent_id=parent.id if parent else None,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/{cat_id}", response_model=CategoryOut)
def update_category(
    cat_id: int,
    data: CategoryUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cat = _owned(db, user, cat_id)
    label = data.label.strip()
    if not label:
        raise HTTPException(400, "分類名稱不能是空的")
    siblings = _siblings(db, user, cat.item_type, cat.parent_id)
    if any(c.label == label and c.id != cat.id for c in siblings):
        raise HTTPException(400, "同一層已有同名分類")
    cat.label = label
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{cat_id}")
def delete_category(
    cat_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cat = _owned(db, user, cat_id)
    child_count = (
        db.query(Category).filter(Category.parent_id == cat.id).count()
    )
    if child_count:
        raise HTTPException(
            409, f"這個分類底下還有 {child_count} 個子分類，請先刪除或併入"
        )
    count = (
        db.query(Item)
        .filter(Item.user_id == user.id, Item.category == cat.key)
        .count()
    )
    if count:
        raise HTTPException(409, f"這個分類底下還有 {count} 件物品，請先併入其他分類")
    db.delete(cat)
    db.commit()
    return {"ok": True}


@router.post("/{cat_id}/merge", response_model=CategoryOut)
def merge_category(
    cat_id: int,
    data: CategoryMergeIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    source = _owned(db, user, cat_id)
    target = _owned(db, user, data.target_id)
    if source.id == target.id:
        raise HTTPException(400, "不能併入自己")
    if not _same_parent(source, target):
        raise HTTPException(400, "只能併入同層的分類")

    # 物品改掛到目標分類
    db.query(Item).filter(
        Item.user_id == user.id, Item.category == source.key
    ).update({"category": target.key}, synchronize_session=False)
    # 第三層分類一併搬到目標底下
    db.query(Category).filter(Category.parent_id == source.id).update(
        {"parent_id": target.id}, synchronize_session=False
    )
    db.delete(source)
    db.commit()
    db.refresh(target)
    return target


@router.post("/reorder", response_model=list[CategoryOut])
def reorder_categories(
    data: CategoryReorderIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = _siblings(db, user, data.item_type, data.parent_id)
    by_id = {c.id: c for c in rows}
    if set(data.ids) != set(by_id.keys()):
        raise HTTPException(400, "排序清單必須包含同層全部分類")
    for pos, cat_id in enumerate(data.ids):
        by_id[cat_id].position = pos
    db.commit()
    return _siblings(db, user, data.item_type, data.parent_id)
