import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from ..auth import get_current_user
from ..config import UPLOAD_DIR
from ..models import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_BYTES = 15 * 1024 * 1024


@router.post("")
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    ext = Path(file.filename or "img.jpg").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(400, "只支援 JPG、PNG、WEBP、GIF 圖片")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "圖片太大了，請選 15MB 以內的照片")
    filename = f"{uuid.uuid4().hex}{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)
    return {
        "path": filename,
        "url": f"/files/uploads/{filename}",
    }
