import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import User
from ..schemas import NotificationSettingsIn, NotificationSettingsOut

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
