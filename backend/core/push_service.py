import logging
import json
import asyncio
from uuid import UUID
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import webpush, WebPushException
from sqlmodel import Session, select

from core.config import settings
from core.database import engine as db_engine
from core.models import PushSubscription

logger = logging.getLogger(__name__)

VAPID_KEYS_FILE = Path(__file__).resolve().parent.parent / "vapid_keys.json"

# ─── VAPID key management ──────────────────────────────────────────────────

def _generate_vapid_keys() -> tuple[str, str]:
    """Generate a new EC VAPID key pair. Returns (private_pem, public_raw_base64url)."""
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    public_key = private_key.public_key()
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    public_b64 = _raw_bytes_to_urlsafe_base64(public_bytes)

    return private_pem, public_b64


def _raw_bytes_to_urlsafe_base64(data: bytes) -> str:
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def init_vapid_keys():
    """Ensure VAPID keys are available, generating and persisting if needed."""
    if settings.VAPID_PRIVATE_KEY:
        return

    if VAPID_KEYS_FILE.exists():
        keys = json.loads(VAPID_KEYS_FILE.read_text())
        private = keys.get("private")
        public = keys.get("public")
        if private and public:
            settings.VAPID_PRIVATE_KEY = private
            logger.info("[VAPID] Loaded keys from %s", VAPID_KEYS_FILE)
            return

    priv, pub = _generate_vapid_keys()
    settings.VAPID_PRIVATE_KEY = priv
    VAPID_KEYS_FILE.write_text(json.dumps({"private": priv, "public": pub}))
    logger.info("[VAPID] Generated new VAPID key pair → %s", VAPID_KEYS_FILE)


def get_vapid_public_key() -> str:
    """Return the URL-safe base64 VAPID public key."""
    if not settings.VAPID_PRIVATE_KEY:
        init_vapid_keys()
    if VAPID_KEYS_FILE.exists():
        keys = json.loads(VAPID_KEYS_FILE.read_text())
        if keys.get("public"):
            return keys["public"]
    # Derive from private key
    private_key = serialization.load_pem_private_key(
        settings.VAPID_PRIVATE_KEY.encode(), password=None
    )
    public_key = private_key.public_key()
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )
    return _raw_bytes_to_urlsafe_base64(public_bytes)


def get_vapid_claims() -> dict:
    return {"sub": f"mailto:{settings.VAPID_CLAIMS_EMAIL}"}


# ─── Push sending ──────────────────────────────────────────────────────────

def send_push_sync(
    user_id: UUID,
    title: str,
    body: str,
    link: str = "/",
    data: dict | None = None,
    tag: str = "reclaim-notification",
) -> int:
    """Send a push notification to all subscriptions for a user. Returns count sent."""
    count = 0
    with Session(db_engine) as db:
        subs = db.exec(
            select(PushSubscription).where(PushSubscription.user_id == user_id)
        ).all()

        for sub in subs:
            payload = json.dumps({
                "title": title,
                "body": body,
                "link": link,
                "tag": tag,
                "data": data or {},
            })
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                    },
                    data=payload,
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims=get_vapid_claims(),
                    timeout=10,
                )
                count += 1
            except WebPushException as exc:
                if exc.response and exc.response.status_code in (404, 410):
                    logger.info("[PUSH] Removing expired subscription for user=%s", user_id)
                    db.delete(sub)
                    db.commit()
                else:
                    logger.warning("[PUSH] Failed for sub %s: %s", sub.id, exc)
            except Exception:
                logger.exception("[PUSH] Unexpected error for sub %s", sub.id)

    return count


async def send_push(
    user_id: UUID,
    title: str,
    body: str,
    link: str = "/",
    data: dict | None = None,
    tag: str = "reclaim-notification",
) -> int:
    """Async wrapper for send_push_sync."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, send_push_sync, user_id, title, body, link, data, tag)


def fire_and_forget_push(
    user_id: UUID,
    title: str,
    body: str,
    link: str = "/",
    data: dict | None = None,
    tag: str = "reclaim-notification",
):
    """Schedule push delivery without blocking the caller."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(send_push(user_id, title, body, link, data, tag))
    except RuntimeError:
        # No running event loop — call synchronously
        send_push_sync(user_id, title, body, link, data, tag)
