from functools import lru_cache
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from core.config import settings

@lru_cache(maxsize=1)
def get_chat_llm() -> ChatOpenAI:
    """JSON-mode LLM for text tasks (policy extraction, compliance)."""
    return ChatOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.CHAT_MODEL,
        model_kwargs={"response_format": {"type": "json_object"}},
    )

@lru_cache(maxsize=1)
def get_vision_llm() -> ChatOpenAI:
    """Vision LLM for receipt OCR — no JSON mode."""
    return ChatOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.VISION_MODEL,
    )

@lru_cache(maxsize=1)
def get_embeddings() -> OpenAIEmbeddings:
    """Text embeddings via OpenRouter (openai/text-embedding-3-small, 1536 dims)."""
    return OpenAIEmbeddings(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        model=settings.EMBEDDING_MODEL,
    )
