from sqlalchemy.orm import Session

from ..models import Follow, Outfit, User


def is_following(db: Session, follower_id: int, following_id: int) -> bool:
    if follower_id == following_id:
        return False
    return (
        db.query(Follow)
        .filter(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
        )
        .first()
        is not None
    )


def can_view_outfit(db: Session, outfit: Outfit, viewer: User) -> bool:
    if outfit.user_id == viewer.id:
        return True
    if outfit.visibility == "public":
        return True
    if outfit.visibility == "followers":
        return is_following(db, viewer.id, outfit.user_id)
    return False


def can_view_makeup(db: Session, outfit: Outfit, viewer: User) -> bool:
    if outfit.user_id == viewer.id:
        return True
    visibility = outfit.makeup_visibility or "public"
    if visibility == "public":
        return True
    if visibility == "followers":
        return is_following(db, viewer.id, outfit.user_id)
    return False
