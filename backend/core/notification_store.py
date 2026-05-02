import threading
from datetime import datetime, timezone, timedelta

_lock = threading.Lock()
_glm_fallback_since: datetime | None = None
_TTL = timedelta(minutes=5)


def set_glm_fallback() -> None:
    global _glm_fallback_since
    with _lock:
        _glm_fallback_since = datetime.now(timezone.utc)


def get_glm_fallback_notification() -> dict | None:
    with _lock:
        ts = _glm_fallback_since
    if ts is None:
        return None
    if datetime.now(timezone.utc) - ts > _TTL:
        return None
    return {
        "id": "glm-fallback",
        "type": "warning",
        "title": "AI model degraded",
        "message": "GLM is not responding — using Gemini backup model.",
        "timestamp": ts.isoformat(),
        "isRead": False,
    }
