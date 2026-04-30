"""Main API router — assembles all sub-routers."""
from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.chat import router as chat_router, sessions_router
from app.api.routes.tools import router as tools_router
from app.api.routes.health import router as health_router

api_router = APIRouter()

# Health (no prefix — exposed at root)
api_router.include_router(health_router)

# Auth
api_router.include_router(auth_router)

# Chat (streaming + sessions)
api_router.include_router(chat_router)
api_router.include_router(sessions_router)

# All tools (cases, calc, docs, blacklist, cities, progress, submissions)
api_router.include_router(tools_router)
