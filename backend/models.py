from pydantic import BaseModel
from typing import List, Optional


class Message(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]
    enable_web_search: bool = True


class SearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    limit: int = 10
