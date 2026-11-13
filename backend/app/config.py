from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
CUTOUT_DIR = DATA_DIR / "cutouts"
SHARE_DIR = DATA_DIR / "shares"
DB_PATH = DATA_DIR / "wardrobe.db"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CUTOUT_DIR.mkdir(parents=True, exist_ok=True)
SHARE_DIR.mkdir(parents=True, exist_ok=True)

SECRET_KEY = "dev-secret-change-me-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 14

# 測試階段免登入：改 False 即恢復需登入
GUEST_MODE = True

CORS_ORIGINS = [
    "http://localhost:8190",
    "http://127.0.0.1:8190",
    "http://localhost:19006",
    "http://127.0.0.1:19006",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
