import logging
import pytest
from unittest.mock import patch, MagicMock
import httpx

import engine.llm as llm_module


@pytest.fixture(autouse=True)
def reset_llm_state():
    """Reset module-level flag and LRU caches between tests."""
    llm_module._use_fallback = False
    llm_module.get_chat_llm.cache_clear()
    llm_module.get_agent_llm.cache_clear()
    llm_module.get_text_llm.cache_clear()
    yield
    llm_module._use_fallback = False
    llm_module.get_chat_llm.cache_clear()
    llm_module.get_agent_llm.cache_clear()
    llm_module.get_text_llm.cache_clear()


def test_check_glm_health_success_keeps_primary(caplog):
    """GLM responds → _use_fallback stays False, INFO logged."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        mock_client = MagicMock()
        mock_client.invoke.return_value = MagicMock(content="Hello!")
        MockChatOpenAI.return_value = mock_client

        with caplog.at_level(logging.INFO, logger="engine.llm"):
            llm_module.check_glm_health()

    assert llm_module._use_fallback is False
    assert "reachable" in caplog.text.lower()


def test_check_glm_health_timeout_sets_fallback(caplog):
    """GLM times out → _use_fallback set True, WARNING logged."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        mock_client = MagicMock()
        mock_client.invoke.side_effect = httpx.TimeoutException("timeout")
        MockChatOpenAI.return_value = mock_client

        with caplog.at_level(logging.WARNING, logger="engine.llm"):
            llm_module.check_glm_health()

    assert llm_module._use_fallback is True
    assert "falling back" in caplog.text.lower()


def test_check_glm_health_error_sets_fallback(caplog):
    """Any other exception → _use_fallback set True, WARNING logged."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        mock_client = MagicMock()
        mock_client.invoke.side_effect = Exception("connection refused")
        MockChatOpenAI.return_value = mock_client

        with caplog.at_level(logging.WARNING, logger="engine.llm"):
            llm_module.check_glm_health()

    assert llm_module._use_fallback is True


def test_get_chat_llm_uses_fallback_when_flag_set():
    """get_chat_llm() uses OpenRouter + FALLBACK_MODEL when _use_fallback is True."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        llm_module._use_fallback = True
        llm_module.get_chat_llm()
        call_kwargs = MockChatOpenAI.call_args.kwargs
        assert call_kwargs["model"] == llm_module.FALLBACK_MODEL
        assert "openrouter" in call_kwargs["base_url"]


def test_get_chat_llm_uses_glm_when_flag_not_set():
    """get_chat_llm() uses GLM base_url when _use_fallback is False."""
    with patch("engine.llm.ChatOpenAI") as MockChatOpenAI:
        llm_module._use_fallback = False
        llm_module.get_chat_llm()
        call_kwargs = MockChatOpenAI.call_args.kwargs
        assert call_kwargs["model"] != llm_module.FALLBACK_MODEL
        assert "openrouter" not in call_kwargs["base_url"]
