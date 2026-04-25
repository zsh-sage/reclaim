import logging
from functools import lru_cache

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from core.config import settings

logger = logging.getLogger(__name__)

FALLBACK_MODEL = "google/gemini-3.1-flash-lite-preview"

_use_fallback: bool = False


def check_glm_health() -> None:
    return True
    # """Ping GLM 5.1 at startup. Sets _use_fallback=True if unreachable within 15s."""
    # global _use_fallback
    # probe = ChatOpenAI(
    #     base_url=settings.LLM_BASE_URL,
    #     api_key=settings.LLM_API_KEY,
    #     model=settings.CHAT_MODEL,
    #     timeout=15,
    # )
    # try:
    #     probe.invoke([HumanMessage(content="Hi")])
    #     logger.info("GLM 5.1 is reachable. Using primary LLM provider.")
    # except Exception as exc:
    #     _use_fallback = True
    #     logger.warning(
    #         "GLM 5.1 unreachable (%s). Falling back to %s via OpenRouter.",
    #         exc,
    #         FALLBACK_MODEL,
    #     )


# @lru_cache(maxsize=1)
def get_chat_llm() -> ChatOpenAI:
    """JSON-mode LLM for text tasks (policy extraction, compliance)."""
    if _use_fallback:
        return ChatOpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=settings.OPENROUTER_API_KEY,
            max_tokens=40000,
            model=FALLBACK_MODEL,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return ChatOpenAI(
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        max_tokens=40000,
        model=settings.CHAT_MODEL,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


# @lru_cache(maxsize=1)
def get_vision_llm() -> ChatOpenAI:
    """Vision LLM for receipt OCR — no JSON mode."""
    return ChatOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        max_tokens=40000,
        model=settings.VISION_MODEL,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


# @lru_cache(maxsize=1)
def get_agent_llm() -> ChatOpenAI:
    """LLM for tool-calling agent — no JSON mode (required for bind_tools)."""
    if _use_fallback:
        return ChatOpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            max_tokens=40000,
            api_key=settings.OPENROUTER_API_KEY,
            model=FALLBACK_MODEL,
        )
    return ChatOpenAI(
        base_url=settings.LLM_BASE_URL,
        max_tokens=40000,
        api_key=settings.LLM_API_KEY,
        model=settings.CHAT_MODEL,
    )


# @lru_cache(maxsize=1)
def get_text_llm() -> ChatOpenAI:
    """Text LLM for PDF receipt extraction — JSON mode enabled."""
    if _use_fallback:
        return ChatOpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=settings.OPENROUTER_API_KEY,
            max_tokens=40000,
            model=FALLBACK_MODEL,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
    return ChatOpenAI(
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        max_tokens=40000,
        model=settings.CHAT_MODEL,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


# @lru_cache(maxsize=1)
def get_embeddings() -> OpenAIEmbeddings:
    """Text embeddings via OpenRouter (openai/text-embedding-3-small, 1536 dims)."""
    return OpenAIEmbeddings(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        max_tokens=40000,
        model=settings.EMBEDDING_MODEL,
    )
