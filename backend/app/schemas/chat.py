"""Request and response schemas for Ocean Eye AI chatbot."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=4000,
        description="Message sent by the user.",
    )

    conversation_id: str = Field(
        default="default",
        min_length=1,
        max_length=64,
    )


class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: str
    role: Literal["user", "assistant"]
    content: str
    timestamp: datetime


class ChatResponse(BaseModel):
    conversation_id: str
    message: ChatMessageResponse


class ChatHistoryResponse(BaseModel):
    conversation_id: str
    messages: list[ChatMessageResponse]
    count: int