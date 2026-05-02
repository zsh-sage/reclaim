import logging
from functools import lru_cache
from typing import Any, Optional

from langchain_core.outputs import ChatResult
from langchain_core.messages import BaseMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import PrivateAttr

from core.config import settings
from core.notification_store import set_glm_fallback

logger = logging.getLogger(__name__)

FALLBACK_MODEL = "google/gemini-3.1-flash-lite-preview"

_JSON_MODE = {"response_format": {"type": "json_object"}}


def check_glm_health() -> None:
    return True
    # GLM 5.1 health check deactivated — fallback is now handled per-call.


def _is_empty(content: Any) -> bool:
    """True if GLM returned a useless empty body (502 pattern)."""
    return str(content).strip() in ("", "{}") if content is not None else True


class _GLMWithGeminiFallback(ChatOpenAI):
    """ChatOpenAI subclass that retries on Gemini when GLM fails or returns empty."""

    _fallback_llm: ChatOpenAI = PrivateAttr(default=None)

    def set_fallback(self, fallback: ChatOpenAI) -> None:
        self._fallback_llm = fallback

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        try:
            result = super()._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
            content = result.generations[0].message.content if result.generations else ""
            if _is_empty(content):
                raise ValueError("Empty GLM response")
            return result
        except Exception as exc:
            logger.warning("GLM failed (%s); switching to Gemini fallback.", exc)
            set_glm_fallback()
            return self._fallback_llm._generate(messages, stop=stop, run_manager=run_manager, **kwargs)

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: Optional[list[str]] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        try:
            result = await super()._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)
            content = result.generations[0].message.content if result.generations else ""
            if _is_empty(content):
                raise ValueError("Empty GLM response")
            return result
        except Exception as exc:
            logger.warning("GLM async failed (%s); switching to Gemini fallback.", exc)
            set_glm_fallback()
            return await self._fallback_llm._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)


def _make_glm(model_kwargs: dict | None = None) -> _GLMWithGeminiFallback:
    llm = _GLMWithGeminiFallback(
        base_url=settings.LLM_BASE_URL,
        api_key=settings.LLM_API_KEY,
        max_tokens=40000,
        model=settings.CHAT_MODEL,
        **({"model_kwargs": model_kwargs} if model_kwargs else {}),
    )
    fallback = ChatOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        max_tokens=40000,
        model=FALLBACK_MODEL,
        **({"model_kwargs": model_kwargs} if model_kwargs else {}),
    )
    llm.set_fallback(fallback)
    return llm


@lru_cache(maxsize=1)
def get_chat_llm() -> _GLMWithGeminiFallback:
    """JSON-mode LLM for text tasks (policy extraction, compliance)."""
    return _make_glm(model_kwargs=_JSON_MODE)


@lru_cache(maxsize=1)
def get_vision_llm() -> ChatOpenAI:
    """Vision LLM for receipt OCR — OpenRouter only, no GLM fallback needed."""
    return ChatOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        max_tokens=40000,
        model=settings.VISION_MODEL,
        model_kwargs=_JSON_MODE,
    )


@lru_cache(maxsize=1)
def get_agent_llm() -> _GLMWithGeminiFallback:
    """LLM for tool-calling agent — no JSON mode (required for bind_tools)."""
    return _make_glm()


@lru_cache(maxsize=1)
def get_text_llm() -> _GLMWithGeminiFallback:
    """JSON-mode LLM for PDF receipt extraction."""
    return _make_glm(model_kwargs=_JSON_MODE)


@lru_cache(maxsize=1)
def get_embeddings() -> OpenAIEmbeddings:
    """Text embeddings via OpenRouter (openai/text-embedding-3-small, 1536 dims).
    30-second timeout prevents hung connections from blocking uploads indefinitely."""
    return OpenAIEmbeddings(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.EMBEDDING_MODEL,
        timeout=30,
    )
