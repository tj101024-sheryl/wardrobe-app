from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS, DATA_DIR, UPLOAD_DIR
from .database import init_db
from .routers import auth, cutout, items, scrape

app = FastAPI(title="穿搭衣櫃 API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/api/health")
def health():
    return {"ok": True, "service": "wardrobe-api"}


app.include_router(auth.router, prefix="/api")
app.include_router(items.router, prefix="/api")
app.include_router(scrape.router, prefix="/api")
app.include_router(cutout.router, prefix="/api")

app.mount("/files", StaticFiles(directory=str(DATA_DIR)), name="files")
