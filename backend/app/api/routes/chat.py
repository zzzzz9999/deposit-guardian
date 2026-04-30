"""Chat routes: streaming AI chat + session CRUD."""
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.assistant import stream_chat
from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.user import User
from app.schemas.chat import (
    ChatRequest,
    SessionCreateRequest,
    SessionDetailResponse,
    SessionUpsertRequest,
)
from app.services.chat_service import ChatService

router = APIRouter(tags=["conversations"])


@router.post("/chat")
@limiter.limit("30/minute")
async def chat(request: Request, req: ChatRequest):
    """Streaming SSE endpoint for AI chat."""
    messages = [m.model_dump(exclude={"created_at"}) for m in req.messages]
    return StreamingResponse(
        stream_chat(messages, req.enable_web_search),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Chat sessions ─────────────────────────────────────────────────────────────

sessions_router = APIRouter(prefix="/chat/sessions", tags=["conversations"])


@sessions_router.post("", status_code=201)
async def create_session(
    req: SessionCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ChatService(db).create_session(user.id, req)


@sessions_router.patch("/{session_id}")
async def upsert_session(
    session_id: str,
    req: SessionUpsertRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ChatService(db).upsert_session(user.id, session_id, req)


@sessions_router.get("")
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ChatService(db).list_sessions(user.id)


@sessions_router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await ChatService(db).get_session(user.id, session_id)


@sessions_router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ChatService(db).delete_session(user.id, session_id)
    return {"message": "已删除"}
