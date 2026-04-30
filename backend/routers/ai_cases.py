"""AI 案例生成器管理接口（仅管理员）"""
import asyncio
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db, AsyncSessionLocal
from db_models import Case as CaseModel, User
from middleware.auth_middleware import require_admin
from services.ai_run_state import run_state

router = APIRouter(prefix="/api/admin/ai-cases", tags=["ai-cases"])
logger = logging.getLogger(__name__)


async def _run_in_background():
    from services.ai_case_generator import search_and_summarize
    async with AsyncSessionLocal() as db:
        try:
            result = await search_and_summarize(db)
            run_state.last_run_status = "ok"
            run_state.last_run_added = result["added"]
            run_state.last_run_skipped = result["skipped"]
            run_state.last_run_errors = result["errors"]
        except Exception as e:
            logger.error("AI case gen background error: %s", e)
            run_state.last_run_status = "error"
            run_state.last_run_errors = -1
        finally:
            run_state.last_run_at = datetime.now(timezone.utc).isoformat()
            run_state.is_running = False


@router.post("/run", status_code=202)
async def trigger_run(admin: User = Depends(require_admin)):
    """手动触发 AI 案例生成，立即返回 202。"""
    if run_state.is_running:
        raise HTTPException(status_code=409, detail="已有运行中的任务，请稍后再试")
    run_state.is_running = True
    run_state.last_run_status = "running"
    asyncio.create_task(_run_in_background())
    return {"message": "AI 案例生成任务已启动", "status": "running"}


@router.get("/status")
async def get_status(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """查询最近一次运行状态和 AI 案例总数。"""
    count_result = await db.execute(
        select(func.count()).select_from(CaseModel).where(
            CaseModel.source == "ai_generated",
            CaseModel.is_published == True,
        )
    )
    total_ai_cases = count_result.scalar_one()
    return {
        "is_running": run_state.is_running,
        "last_run_at": run_state.last_run_at,
        "last_run_status": run_state.last_run_status,
        "last_run_added": run_state.last_run_added,
        "last_run_skipped": run_state.last_run_skipped,
        "last_run_errors": run_state.last_run_errors,
        "total_ai_cases": total_ai_cases,
    }
