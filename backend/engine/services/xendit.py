import logging
import base64
import uuid
import asyncio
from typing import Optional, List, Dict, Any

import httpx

from core.config import settings

logger = logging.getLogger(__name__)


class XenditClient:
    def __init__(self):
        self._base_url = settings.XENDIT_BASE_URL.rstrip("/")
        self._api_key = settings.XENDIT_API_KEY
        self._mock_mode = settings.XENDIT_MOCK_MODE

    @property
    def _auth_header(self) -> Dict[str, str]:
        encoded = base64.b64encode(f"{self._api_key}:".encode()).decode()
        return {"Authorization": f"Basic {encoded}"}

    @property
    def _webhook_simulator(self) -> Optional[Any]:
        return _webhook_simulator if self._mock_mode else None

    async def create_payout(
        self,
        reference_id: str,
        channel_code: str,
        account_holder_name: str,
        account_number: str,
        amount: float,
        currency: str = "MYR",
        description: Optional[str] = None,
        email_to: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        idempotency_key = str(uuid.uuid4())

        payload = {
            "reference_id": reference_id,
            "channel_code": channel_code,
            "channel_properties": {
                "account_holder_name": account_holder_name,
                "account_number": account_number,
            },
            "amount": amount,
            "currency": currency,
        }
        if description:
            payload["description"] = description[:100]
        if email_to:
            payload["receipt_notification"] = {"email_to": email_to[:3]}

        if self._mock_mode:
            return self._simulate_create(idempotency_key, payload)

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self._base_url}/v2/payouts",
                json=payload,
                headers={
                    **self._auth_header,
                    "Idempotency-key": idempotency_key,
                },
            )
            resp.raise_for_status()
            result = resp.json()
            result["idempotency_key"] = idempotency_key
            return result

    async def get_payout(self, payout_id: str) -> Dict[str, Any]:
        if self._mock_mode:
            return _mock_payout_store.get(payout_id, {})

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self._base_url}/v2/payouts/{payout_id}",
                headers=self._auth_header,
            )
            resp.raise_for_status()
            return resp.json()

    async def cancel_payout(self, payout_id: str) -> Dict[str, Any]:
        if self._mock_mode:
            return {
                "id": payout_id,
                "status": "CANCELLED",
                "updated": "2024-01-01T00:00:00.000Z",
            }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self._base_url}/v2/payouts/{payout_id}/cancel",
                headers=self._auth_header,
            )
            resp.raise_for_status()
            return resp.json()

    async def get_channels(
        self,
        currency: str = "MYR",
        channel_category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if self._mock_mode:
            return _MOCK_MALAYSIA_CHANNELS

        params = {"currency": currency}
        if channel_category:
            params["channel_category"] = channel_category

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self._base_url}/payouts_channels",
                params=params,
                headers=self._auth_header,
            )
            resp.raise_for_status()
            return resp.json()

    def _simulate_create(
        self, idempotency_key: str, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        payout_id = f"disb-{uuid.uuid4().hex[:20]}"
        result = {
            "id": payout_id,
            "amount": payload["amount"],
            "channel_code": payload["channel_code"],
            "currency": payload["currency"],
            "description": payload.get("description", ""),
            "reference_id": payload["reference_id"],
            "status": "ACCEPTED",
            "created": "2024-01-01T00:00:00.000Z",
            "updated": "2024-01-01T00:00:00.000Z",
            "estimated_arrival_time": "2024-01-01T00:15:00.000Z",
            "business_id": "mock_business_id",
            "channel_properties": payload["channel_properties"],
            "idempotency_key": idempotency_key,
        }
        _mock_payout_store[payout_id] = result
        return result


# In-memory mock state (per-process, for demo only)
_mock_payout_store: Dict[str, Dict[str, Any]] = {}
_webhook_simulator: Optional[Any] = None


def set_webhook_simulator(simulator):
    """Inject a webhook simulator callback for mock mode.

    The simulator receives (payout_id, status, failure_code) and should
    update the database + create notifications.
    """
    global _webhook_simulator
    _webhook_simulator = simulator


def get_webhook_simulator():
    return _webhook_simulator


_MOCK_MALAYSIA_CHANNELS: List[Dict[str, Any]] = [
    {
        "channel_code": "MY_MAYBANK",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "Maybank",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
    {
        "channel_code": "MY_CIMB",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "CIMB Bank",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
    {
        "channel_code": "MY_PBB",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "Public Bank",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
    {
        "channel_code": "MY_RHB",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "RHB Bank",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
    {
        "channel_code": "MY_HLBB",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "Hong Leong Bank",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
    {
        "channel_code": "MY_AMBANK",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "AmBank",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
    {
        "channel_code": "MY_UOB",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "UOB Malaysia",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
    {
        "channel_code": "MY_OCBC",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "OCBC Malaysia",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
    {
        "channel_code": "MY_AFFIN",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "Affin Bank",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
    {
        "channel_code": "MY_DUITNOW",
        "channel_category": "BANK",
        "currency": "MYR",
        "channel_name": "DuitNow (Proxy Transfer)",
        "amount_limits": {
            "minimum": 1.00,
            "maximum": 10000000.00,
            "minimum_increment": 0.01,
        },
    },
]


class MockWebhookSimulator:
    """Simulates Xendit webhook delivery in mock mode.

    When a payout is created in mock mode, this scheduler will fire
    a callback after a short delay to simulate the webhook event.
    """

    def __init__(self, callback):
        self._callback = callback

    def schedule(self, payout_id: str, delay: float = 12.0):
        async def _fire():
            await asyncio.sleep(delay)
            logger.info("[MOCK_WEBHOOK] Firing simulated webhook for payout=%s", payout_id)
            r = _mock_payout_store.get(payout_id)
            if r:
                r["status"] = "SUCCEEDED"
                r["updated"] = "2024-01-01T00:15:00.000Z"
            try:
                await self._callback(payout_id, "SUCCEEDED", None)
            except Exception:
                logger.exception("[MOCK_WEBHOOK] Simulator callback failed for payout=%s", payout_id)

        asyncio.create_task(_fire())
