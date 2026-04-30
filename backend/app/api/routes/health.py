"""Health check endpoints."""
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0", "service": "deposit-guardian"}


@router.get("/health/ready")
def ready():
    return {"status": "ready"}


@router.get("/health/live")
def live():
    return {"status": "alive"}
