"""
FastAPI application entry point — DepositGuardian v3.

Follows the full-stack-ai-agent-template project structure:
  app/
    core/       — config, security, middleware, deps, rate_limit
    db/         — session, Base
    models/     — SQLAlchemy ORM models
    schemas/    — Pydantic v2 schemas
    repositories/ — DB access layer
    services/   — business logic
    agents/     — AI agent (Claude streaming + law context)
    api/        — routes, router, exception handlers
"""
import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.api.exception_handlers import register_exception_handlers
from app.api.router import api_router
from app.core.config import settings
from app.core.middleware import RequestIDMiddleware
from app.core.rate_limit import limiter
from app.db.session import close_db

logger = logging.getLogger(__name__)


# ── Background tasks ──────────────────────────────────────────────────────────

async def _daily_ai_job() -> None:
    """Run AI case generation daily at 02:00 UTC."""
    from datetime import datetime, timezone, timedelta
    while True:
        now = datetime.now(timezone.utc)
        next_run = now.replace(hour=2, minute=0, second=0, microsecond=0)
        if next_run <= now:
            next_run += timedelta(days=1)
        await asyncio.sleep((next_run - now).total_seconds())

        logger.info("Starting daily AI case generation job")
        try:
            from app.db.session import get_db_context
            from app.services.ai_case_generator import search_and_summarize
            async with get_db_context() as db:
                result = await search_and_summarize(db)
                logger.info("Daily AI job done: %s", result)
        except ImportError:
            logger.debug("ai_case_generator not available, skipping daily job")
        except Exception as exc:
            logger.error("Daily AI job error: %s", exc)


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown."""
    # Startup
    logger.info("Starting DepositGuardian API v3")

    # Start background job
    task = asyncio.create_task(_daily_ai_job())

    yield

    # Shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

    await close_db()
    logger.info("DepositGuardian API shutdown complete")


# ── App factory ───────────────────────────────────────────────────────────────

SHOW_DOCS_ENVIRONMENTS = ("local", "staging", "development")


def create_app() -> FastAPI:
    show_docs = settings.ENVIRONMENT in SHOW_DOCS_ENVIRONMENTS

    app = FastAPI(
        title=settings.PROJECT_NAME,
        description=(
            "租客卫士 API — 租房权益保护平台\n\n"
            "## Features\n"
            "- **AI 法律顾问**: Claude 驱动的流式 SSE 对话，自动注入法律原文 + 联网搜索\n"
            "- **押金计算器**: 折旧原则 + 城市政策\n"
            "- **文书生成**: 投诉信/起诉状一键生成\n"
            "- **案例库**: 真实维权案例 + AI 每日更新\n"
            "- **认证**: JWT 双 token\n"
        ),
        version="3.0.0",
        openapi_url=f"{settings.API_V1_STR}/openapi.json" if show_docs else None,
        docs_url="/docs" if show_docs else None,
        redoc_url="/redoc" if show_docs else None,
        lifespan=lifespan,
    )

    # Request ID middleware
    app.add_middleware(RequestIDMiddleware)

    # Exception handlers
    register_exception_handlers(app)

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
        allow_methods=settings.CORS_ALLOW_METHODS,
        allow_headers=settings.CORS_ALLOW_HEADERS,
    )

    # Rate limiting
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Mount API router under /api/v1
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Also mount at legacy /api path for backward compat
    app.include_router(api_router, prefix="/api", include_in_schema=False)

    return app


app = create_app()
