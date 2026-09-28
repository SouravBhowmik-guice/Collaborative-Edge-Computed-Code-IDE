"""
Health Check Route
"""

from fastapi import APIRouter
from collaborative_ide_api_python.config import get_settings

settings = get_settings()
router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "api-python",
        "version": "0.0.1",
        "environment": settings.environment,
    }