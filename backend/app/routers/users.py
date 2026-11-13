import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from ..auth import get_current_user
from ..database import get_db
from ..models import Follow, Outfit, OutfitItem, OutfitProduct, User
from ..schemas import (
    FollowOut,
    NotificationSettingsIn,
    NotificationSettingsOut,
    UserProfileOut,
)
from ..services.social import can_view_outfit, is_following
from .outfits import _to_out

router = APIRouter(prefix="/users", tags=["users"])

TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _settings(user: User) -> NotificationSettingsOut:
    return NotificationSettingsOut(
        enabled=bool(user.notify_enabled),
        time=user.notify_time or "08:00",
    )


@router.get("/me/notifications", response_model=NotificationSettingsOut)
def get_notification_settings(
    user: User = Depends(get_current_user),
):
    return _settings(user)


@router.patch("/me/notifications", response_model=NotificationSettingsOut)
def update_notification_settings(
    data: NotificationSettingsIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.enabled is not None:
        user.notify_enabled = data.enabled
    if data.time is not None:
        value = data.time.strip()
        if not TIME_RE.match(value):
            raise HTTPException(400, "時間格式應為 HH:MM（00:00–23:59）")
        user.notify_time = value
    db.commit()
    db.refresh(user)
    return _settings(user)


@router.get("/{user_id}", response_model=UserProfileOut)
def get_user_profile(
    user_id: int,
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "找不到使用者")

    rows = (
        db.query(Outfit)
        .options(
            joinedload(Outfit.owner),
            joinedload(Outfit.items).joinedload(OutfitItem.item),
            joinedload(Outfit.products).joinedload(OutfitProduct.item),
        )
        .filter(Outfit.user_id == target.id)
        .order_by(Outfit.id.desc())
        .limit(60)
        .all()
    )
    visible = [row for row in rows if can_view_outfit(db, row, viewer)]

    return UserProfileOut(
        id=target.id,
        username=target.username,
        bio=target.bio,
        created_at=target.created_at,
        outfit_count=len(visible),
        follower_count=(
            db.query(Follow)
            .filter(Follow.following_id == target.id)
            .count()
        ),
        following_count=(
            db.query(Follow)
            .filter(Follow.follower_id == target.id)
            .count()
        ),
        is_following=is_following(db, viewer.id, target.id),
        is_me=target.id == viewer.id,
        outfits=[_to_out(row, viewer) for row in visible[:30]],
    )


@router.post("/{user_id}/follow", response_model=FollowOut)
def follow_user(
    user_id: int,
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id == viewer.id:
        raise HTTPException(400, "不能追蹤自己")
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "找不到使用者")
    existing = (
        db.query(Follow)
        .filter(
            Follow.follower_id == viewer.id,
            Follow.following_id == target.id,
        )
        .first()
    )
    if not existing:
        db.add(
            Follow(follower_id=viewer.id, following_id=target.id)
        )
        db.commit()
    return FollowOut(
        following=True,
        follower_count=(
            db.query(Follow)
            .filter(Follow.following_id == target.id)
            .count()
        ),
    )


@router.delete("/{user_id}/follow", response_model=FollowOut)
def unfollow_user(
    user_id: int,
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "找不到使用者")
    db.query(Follow).filter(
        Follow.follower_id == viewer.id,
        Follow.following_id == target.id,
    ).delete(synchronize_session=False)
    db.commit()
    return FollowOut(
        following=False,
        follower_count=(
            db.query(Follow)
            .filter(Follow.following_id == target.id)
            .count()
        ),
    )
