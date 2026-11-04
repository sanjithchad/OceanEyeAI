"""Secure OpenAI-compatible LLM client for Ocean Eye AI."""

import os
from pathlib import Path

from dotenv import load_dotenv
from openai import AsyncOpenAI


# Load environment variables from backend/.env
BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

PROVIDER = os.getenv("OCEAN_LLM_PROVIDER", "openai")
API_KEY = os.getenv("OCEAN_LLM_API_KEY", "").strip()
BASE_URL = os.getenv(
    "OCEAN_LLM_BASE_URL",
    "https://api.openai.com/v1",
).strip()
MODEL = os.getenv("OCEAN_LLM_MODEL", "gpt-4o-mini").strip()
TIMEOUT = float(os.getenv("OCEAN_LLM_TIMEOUT_SECONDS", "45"))


def get_llm_client():
    """Create the AI client without exposing its API key."""

    if not API_KEY:
        raise RuntimeError(
            "AI API key is missing. Configure OCEAN_LLM_API_KEY "
            "in backend/.env."
        )

    return AsyncOpenAI(
        api_key=API_KEY,
        base_url=BASE_URL,
        timeout=TIMEOUT,
        max_retries=1,
    )


async def generate_ai_response(system_prompt, conversation_messages):
    """Generate a chatbot response using the configured AI model."""

    if PROVIDER.lower() not in {"openai", "openai-compatible"}:
        raise RuntimeError("Unsupported LLM provider configuration.")

    client = get_llm_client()

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                *conversation_messages,
            ],
            temperature=0.3,
        )

        answer = response.choices[0].message.content

        if not answer:
            raise RuntimeError("The AI provider returned an empty response.")

        return answer.strip()

    finally:
        await client.close()