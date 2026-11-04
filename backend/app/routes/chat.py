"""Ocean Eye AI intelligent chatbot API."""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, delete
from sqlalchemy.orm import Session

from app.database.sqlalchemy_db import get_db
from app.models.database_models import ChatMessage
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ChatMessageResponse,
    ChatHistoryResponse,
)
from app.services.chat_context import build_chat_context
from app.services.llm_client import generate_ai_response


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/chat",
    tags=["Ocean Eye AI Chatbot"],
)


SYSTEM_PROMPT = """
You are Ocean Eye AI Assistant, the intelligent assistant for
the Ocean Eye AI ocean-monitoring project.

Use the supplied project data as your only source for
project-specific measurements, predictions, analysis and risks.

IMPORTANT RULES:

1. Never invent sensor readings, measurements, dates, or results.
2. Clearly identify simulator readings as synthetic demonstration
   data, not verified live ocean measurements.
3. Distinguish observed measurements from predictions and
   interpretations.
4. Describe predictions as experimental, not guaranteed.
5. Describe risk scores as prototype indicators, not certified
   scientific measurements.
6. An anomaly does not prove pollution or identify its cause.
7. Temperature or turbidity alone cannot prove pollution.
8. If information is missing, explicitly say it is unavailable.
9. Do not claim to control sensors or devices.
10. Explain technical concepts clearly and accurately.

Be helpful, concise, and specific to Ocean Eye AI.
"""


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    """Send a message and receive an AI-generated response."""

    try:
        # Retrieve recent conversation messages.
        history_query = (
            select(ChatMessage)
            .where(
                ChatMessage.conversation_id == request.conversation_id
            )
            .order_by(
                desc(ChatMessage.timestamp),
                desc(ChatMessage.id),
            )
            .limit(20)
        )

        history = list(db.scalars(history_query).all())
        history.reverse()

        conversation_messages = [
            {
                "role": item.role,
                "content": item.content,
            }
            for item in history
        ]

        # Build verified Ocean Eye AI project context.
        context = await build_chat_context()

        context_message = {
            "role": "system",
            "content": (
                "Current verified Ocean Eye AI project context:\n"
                + json.dumps(context, default=str)
            ),
        }

        # Generate the AI response.
        answer = await generate_ai_response(
            SYSTEM_PROMPT + "\n\n" + context_message["content"],
            conversation_messages + [
                {"role": "user", "content": request.message}
            ],
        )

        # Store both messages only after successful generation.
        user_message = ChatMessage(
            conversation_id=request.conversation_id,
            role="user",
            content=request.message,
        )

        assistant_message = ChatMessage(
            conversation_id=request.conversation_id,
            role="assistant",
            content=answer,
        )

        db.add(user_message)
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)

        return ChatResponse(
            conversation_id=request.conversation_id,
            message=ChatMessageResponse.model_validate(
                assistant_message,
                from_attributes=True,
            ),
        )

    except RuntimeError as exc:
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )

    except Exception:
        db.rollback()
        logger.exception("Ocean Eye AI chatbot request failed.")
        raise HTTPException(
            status_code=502,
            detail="The AI assistant could not process your message. Please try again.",
        )


@router.get("/history", response_model=ChatHistoryResponse)
def get_chat_history(
    conversation_id: str = Query(default="default", min_length=1, max_length=64),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Retrieve stored chatbot conversation history."""

    query = (
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(
            desc(ChatMessage.timestamp),
            desc(ChatMessage.id),
        )
        .limit(limit)
    )

    messages = list(db.scalars(query).all())
    messages.reverse()

    return ChatHistoryResponse(
        conversation_id=conversation_id,
        messages=[
            ChatMessageResponse.model_validate(
                item,
                from_attributes=True,
            )
            for item in messages
        ],
        count=len(messages),
    )


@router.delete("/history")
def clear_chat_history(
    conversation_id: str = Query(default="default", min_length=1, max_length=64),
    db: Session = Depends(get_db),
):
    """Clear one conversation without affecting other conversations."""

    result = db.execute(
        delete(ChatMessage).where(
            ChatMessage.conversation_id == conversation_id
        )
    )

    db.commit()

    return {
        "status": "success",
        "conversation_id": conversation_id,
        "deleted_messages": result.rowcount,
    }
