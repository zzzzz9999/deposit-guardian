"""Chat repository — database access layer for ChatSession and ChatMessage."""
import uuid
from typing import Optional

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import ChatMessage, ChatSession
from app.schemas.chat import MessageSchema


class ChatRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_session(
        self,
        user_id: str,
        title: Optional[str],
        category: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> ChatSession:
        session = ChatSession(
            id=session_id or str(uuid.uuid4()),
            user_id=user_id,
            title=title,
            category=category,
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_session(self, session_id: str, user_id: str) -> Optional[ChatSession]:
        result = await self.db.execute(
            select(ChatSession).where(
                ChatSession.id == session_id,
                ChatSession.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_sessions(self, user_id: str, limit: int = 50) -> list[ChatSession]:
        result = await self.db.execute(
            select(ChatSession)
            .where(ChatSession.user_id == user_id, ChatSession.is_archived == False)  # noqa: E712
            .order_by(desc(ChatSession.updated_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def delete_session(self, session: ChatSession) -> None:
        await self.db.delete(session)

    async def replace_messages(
        self, session_id: str, messages: list[MessageSchema]
    ) -> None:
        await self.db.execute(
            delete(ChatMessage).where(ChatMessage.session_id == session_id)
        )
        for msg in messages:
            self.db.add(
                ChatMessage(
                    id=str(uuid.uuid4()),
                    session_id=session_id,
                    role=msg.role,
                    content=msg.content,
                )
            )

    async def get_messages(self, session_id: str) -> list[ChatMessage]:
        result = await self.db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        return list(result.scalars().all())
