from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import init_db
from app.scheduler import start_scheduler, stop_scheduler
from app.routers import (
    garmin, food, medication, sickness,
    seizure, notes, water, dashboard, export, user
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events for FastAPI application.
    Handles startup and shutdown tasks.
    """
    # Startup
    logger.info("Starting Health Tracker application...")

    # Initialize database
    init_db()
    logger.info("Database initialized")

    # Start scheduler
    start_scheduler()

    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down Health Tracker application...")
    stop_scheduler()
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Health tracking application with Garmin integration",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(user.router, prefix=settings.api_prefix)
app.include_router(garmin.router, prefix=settings.api_prefix)
app.include_router(food.router, prefix=settings.api_prefix)
app.include_router(medication.router, prefix=settings.api_prefix)
app.include_router(sickness.router, prefix=settings.api_prefix)
app.include_router(seizure.router, prefix=settings.api_prefix)
app.include_router(notes.router, prefix=settings.api_prefix)
app.include_router(water.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)
app.include_router(export.router, prefix=settings.api_prefix)


@app.get("/")
def root():
    """Root endpoint - API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "scheduler": "running" if settings.garmin_sync_enabled else "disabled"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
