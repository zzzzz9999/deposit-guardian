"""Chat-related Pydantic schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class MessageSchema(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ChatRequest(BaseModel):
    messages: list[MessageSchema]
    enable_web_search: bool = True


class SessionCreateRequest(BaseModel):
    title: Optional[str] = None
    messages: list[MessageSchema]
    category: Optional[str] = None


class SessionUpsertRequest(BaseModel):
    title: Optional[str] = None
    messages: list[MessageSchema]


class SessionResponse(BaseModel):
    id: str
    title: Optional[str] = None
    category: Optional[str] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class SessionDetailResponse(SessionResponse):
    created_at: Optional[datetime] = None
    messages: list[MessageSchema] = []
