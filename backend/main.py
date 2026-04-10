import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
import sys

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend import admin_alertas, alertas, chat, contactos, placas, push, sos, usuarios
from backend.database import Base, engine

logger = logging.getLogger("segurural")


def _normalize_origin(value: str) -> str | None:
    origin = (value or "").strip().rstrip("/")
    if not origin:
        return None
    if not origin.startswith(("http://", "https://")):
        origin = f"https://{origin}"
    return origin


def _cors_origins() -> list[str]:
    origins = {
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8081",
        "http://localhost:19006",
        "http://localhost:19007",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8081",
    }

    frontend_urls = [
        os.getenv("FRONTEND_URL", ""),
        os.getenv("VERCEL_URL", ""),
    ]
    frontend_urls.extend(os.getenv("CORS_ORIGINS", "").split(","))

    for url in frontend_urls:
        normalized = _normalize_origin(url)
        if normalized:
            origins.add(normalized)

    return sorted(origins)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized")
    except Exception:
        logger.exception("Database initialization failed")
        if os.getenv("ENV", "development").lower() != "production":
            raise
    yield


app = FastAPI(title="SeguriRural API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=os.getenv("CORS_ALLOW_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(placas.router)
app.include_router(usuarios.router)
app.include_router(sos.router)
app.include_router(chat.router)
app.include_router(alertas.router)
app.include_router(contactos.router)
app.include_router(push.router)
app.include_router(admin_alertas.router)

dashboard_dir = Path(__file__).resolve().parent.parent / "admin_dashboard"
if dashboard_dir.exists():
    app.mount(
        "/admin-dashboard",
        StaticFiles(directory=dashboard_dir, html=True),
        name="admin_dashboard",
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"message": "API SeguriRural OK"}
