import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.core.config import PROJECT_TITLE, PROJECT_SUBTITLE, VERSION, API_PREFIX, UPLOADS_DIR, REPORTS_DIR, EXPORTS_DIR
from backend.app.core.database import Base, engine
from backend.app.api.endpoints import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("retail_dw.main")

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized.")
    yield

app = FastAPI(
    title=PROJECT_TITLE,
    description=PROJECT_SUBTITLE,
    version=VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Enable CORS for local Vite development & custom ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix=API_PREFIX)

# Static files for downloads and image previews
app.mount("/static/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.mount("/static/reports", StaticFiles(directory=str(REPORTS_DIR)), name="reports")
app.mount("/static/exports", StaticFiles(directory=str(EXPORTS_DIR)), name="exports")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
