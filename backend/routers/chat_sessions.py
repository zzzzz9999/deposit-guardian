"""AI 对话历史云同步"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
from database import get_db
from db_models import ChatSession, ChatMessage, User
from middleware.auth_middleware import get_current_user
import uuid

router = APIRouter(prefix="/api/chat/sessions", tags=["chat-sessions"])


class MessageIn(BaseModel):
    role: str
    content: str


class SessionCreateRequest(BaseModel):
    title: str | None = None
    messages: list[MessageIn]
    category: str | None = None


class SessionUpsertRequest(BaseModel):
    title: str | None = None
    messages: list[MessageIn]


def _make_title(messages: list[MessageIn], fallback: str = "新对话") -> str:
    first_user = next((m for m in messages if m.role == "user"), None)
    if not first_user:
        return fallback
    text = first_user.content.strip()
    return (text[:28] + "…") if len(text) > 28 else text


@router.post("", status_code=201)
async def create_session(
    req: SessionCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    title = req.title or _make_title(req.messages)
    session = ChatSession(id=str(uuid.uuid4()), user_id=user.id, title=title, category=req.category)
    db.add(session)
    await db.flush()

    for msg in req.messages:
        db.add(ChatMessage(id=str(uuid.uuid4()), session_id=session.id, role=msg.role, content=msg.content))

    await db.commit()
    return {"session_id": session.id, "title": title}


@router.patch("/{session_id}", status_code=200)
async def upsert_session(
    session_id: str,
    req: SessionUpsertRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """存在则更新消息列表，不存在则创建。前端流结束后调用此接口完成云同步。"""
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        title = req.title or _make_title(req.messages)
        session = ChatSession(id=session_id, user_id=user.id, title=title)
        db.add(session)
        await db.flush()
    elif req.title:
        session.title = req.title

    # 删旧消息，批量写新消息（消息量小，简单可靠）
    await db.execute(delete(ChatMessage).where(ChatMessage.session_id == session_id))
    for msg in req.messages:
        db.add(ChatMessage(
            id=str(uuid.uuid4()),
            session_id=session.id,
            role=msg.role,
            content=msg.content,
        ))

    await db.commit()
    return {"session_id": session.id, "title": session.title}


@router.get("")
async def list_sessions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user.id, ChatSession.is_archived == False)
        .order_by(desc(ChatSession.updated_at))
        .limit(50)
    )
    sessions = result.scalars().all()
    return {"sessions": [
        {
            "id": s.id,
            "title": s.title,
            "category": s.category,
            "updated_at": s.updated_at.isoformat() if s.updated_at else None,
        }
        for s in sessions
    ]}


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    msgs_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = msgs_result.scalars().all()

    return {
        "id": session.id,
        "title": session.title,
        "category": session.category,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    await db.delete(session)
    await db.commit()
    return {"message": "已删除"}
