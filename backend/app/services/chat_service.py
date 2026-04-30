"""Chat session business logic service."""
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.chat import ChatRepository
from app.schemas.chat import (
    MessageSchema,
    SessionCreateRequest,
    SessionDetailResponse,
    SessionResponse,
    SessionUpsertRequest,
)


def _make_title(messages: list[MessageSchema], fallback: str = "新对话") -> str:
    first_user = next((m for m in messages if m.role == "user"), None)
    if not first_user:
        return fallback
    text = first_user.content.strip()
    return (text[:28] + "…") if len(text) > 28 else text


class ChatService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = ChatRepository(db)

    async def create_session(self, user_id: str, req: SessionCreateRequest) -> dict:
        title = req.title or _make_title(req.messages)
        session = await self.repo.create_session(user_id, title, req.category)
        await self.repo.replace_messages(session.id, req.messages)
        return {"session_id": session.id, "title": title}

    async def upsert_session(
        self, user_id: str, session_id: str, req: SessionUpsertRequest
    ) -> dict:
        session = await self.repo.get_session(session_id, user_id)
        if not session:
            title = req.title or _make_title(req.messages)
            session = await self.repo.create_session(user_id, title, session_id=session_id)
        elif req.title:
            session.title = req.title

        await self.repo.replace_messages(session.id, req.messages)
        return {"session_id": session.id, "title": session.title}

    async def list_sessions(self, user_id: str) -> dict:
        sessions = await self.repo.list_sessions(user_id)
        return {
            "sessions": [
                SessionResponse.model_validate(s).model_dump(mode="json")
                for s in sessions
            ]
        }

    async def get_session(self, user_id: str, session_id: str) -> SessionDetailResponse:
        session = await self.repo.get_session(session_id, user_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在")

        messages = await self.repo.get_messages(session_id)
        return SessionDetailResponse(
            id=session.id,
            title=session.title,
            category=session.category,
            created_at=session.created_at,
            updated_at=session.updated_at,
            messages=[
                MessageSchema(role=m.role, content=m.content, created_at=m.created_at)
                for m in messages
            ],
        )

    async def delete_session(self, user_id: str, session_id: str) -> None:
        session = await self.repo.get_session(session_id, user_id)
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="会话不存在")
        await self.repo.delete_session(session)
