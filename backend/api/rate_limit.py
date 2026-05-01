from starlette.requests import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from jose import jwt, JWTError

from core.config import settings


def _get_user_identity(request: Request) -> str:
    """Rate-limit key: verified JWT email for authenticated requests, IP address otherwise."""
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth[7:]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            email: str = payload.get("sub")
            if email:
                return f"user:{email}"
        except JWTError:
            pass
    return get_remote_address(request)


# NOTE: Uses in-memory storage per-process. With multiple uvicorn workers or
# multiple containers, each process maintains its own counter — effective limit
# becomes limit × N workers. Switch to a Redis backend for multi-process deployments.
limiter = Limiter(key_func=_get_user_identity)
