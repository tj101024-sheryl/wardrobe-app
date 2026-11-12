from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..config import CUTOUT_DIR, UPLOAD_DIR
from ..database import get_db
from ..models import Item, User
from ..schemas import CutoutIn

router = APIRouter(prefix="/cutout", tags=["cutout"])


@router.post("")
def run_cutout(
    data: CutoutIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(Item, data.item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "找不到衣物")

    src = UPLOAD_DIR / item.image_path
    if not src.exists():
        raise HTTPException(404, "原始圖片不存在")

    try:
        from rembg import new_session, remove
    except ImportError:
        raise HTTPException(
            501,
            "尚未安裝摳圖引擎。請執行：pip install rembg[cpu]",
        )

    out_name = f"{Path(item.image_path).stem}_cut.png"
    out_path = CUTOUT_DIR / out_name

    try:
        session = new_session(data.model)
        result = remove(src.read_bytes(), session=session)
        out_path.write_bytes(result)
    except Exception as e:
        raise HTTPException(500, f"摳圖失敗：{type(e).__name__}: {e}")

    if item.cutout_path:
        old = CUTOUT_DIR / item.cutout_path
        if old.exists():
            old.unlink()

    item.cutout_path = out_name
    db.commit()
    return {
        "item_id": item.id,
        "cutout_url": f"/files/cutouts/{out_name}",
    }


@router.delete("/{item_id}")
def remove_cutout(
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.get(Item, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "找不到衣物")
    if item.cutout_path:
        p = CUTOUT_DIR / item.cutout_path
        if p.exists():
            p.unlink()
        item.cutout_path = None
        db.commit()
    return {"ok": True}
