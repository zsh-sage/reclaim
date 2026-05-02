"""
Shared payout service — callable from both the HTTP route and the async
compliance background task.

Usage from an async context (FastAPI route):
    payout = await initiate_payout_async(reim_id, db)

Usage from a sync thread (background task with access to the event loop):
    payout = initiate_payout_sync(reim_id, db, loop)
"""
import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlmodel import Session, select

from core.config import settings
from core.models import User, Reimbursement, Payout, Notification
from core.enums import ReimbursementStatus, PayoutStatus
from engine.services.xendit import (
    XenditClient,
    MockWebhookSimulator,
    set_webhook_simulator,
    get_webhook_simulator,
)

logger = logging.getLogger(__name__)
_xendit = XenditClient()

_CHANNEL_NAMES = {
    "MY_MAYBANK": "Maybank",
    "MY_CIMB": "CIMB Bank",
    "MY_PBB": "Public Bank",
    "MY_RHB": "RHB Bank",
    "MY_HLBB": "Hong Leong Bank",
    "MY_AMBANK": "AmBank",
    "MY_UOB": "UOB Malaysia",
    "MY_OCBC": "OCBC Malaysia",
    "MY_AFFIN": "Affin Bank",
    "MY_DUITNOW": "DuitNow",
}


def _get_channel_name(channel_code: str) -> str:
    return _CHANNEL_NAMES.get(channel_code, channel_code)


def _notify(db: Session, user_id: UUID, n_type: str, title: str, message: str, link: str = None):
    notif = Notification(
        user_id=user_id,
        type=n_type,
        title=title,
        message=message,
        link=link,
        is_read=False,
    )
    db.add(notif)
    db.commit()


def _mask_account(account: str) -> str:
    if not account or len(account) < 4:
        return "****"
    return "*" * (len(account) - 4) + account[-4:]


def _schedule_mock_webhook(xendit_id: str, loop: asyncio.AbstractEventLoop | None):
    """Schedule the Xendit mock webhook on the given event loop (or current loop)."""
    async def _setup():
        simulator = get_webhook_simulator()
        if simulator is None:
            async def _on_webhook(payout_id: str, status_str: str, failure_code: str | None):
                from core.database import engine as db_engine
                with Session(db_engine) as s:
                    from api.payouts import _handle_webhook
                    _handle_webhook(s, payout_id, status_str, failure_code)

            simulator = MockWebhookSimulator(_on_webhook)
            set_webhook_simulator(simulator)

        if isinstance(simulator, MockWebhookSimulator):
            simulator.schedule(xendit_id, delay=10.0)

    if loop and loop.is_running():
        asyncio.run_coroutine_threadsafe(_setup(), loop)
    else:
        try:
            current = asyncio.get_running_loop()
            asyncio.ensure_future(_setup(), loop=current)
        except RuntimeError:
            pass


def initiate_payout_sync(
    reim_id: UUID,
    db: Session,
    loop: asyncio.AbstractEventLoop | None = None,
) -> Payout | None:
    """
    Synchronous payout initiator — safe to call from a thread executor.
    Returns the Payout record on success, or None if skipped (no banking details,
    zero amount, or payout already exists). Does NOT raise on Xendit failure —
    it leaves the reimbursement in APPROVED status for manual HR retry.
    """
    reim = db.get(Reimbursement, reim_id)
    if not reim or reim.status != ReimbursementStatus.APPROVED:
        return None

    existing = db.exec(select(Payout).where(Payout.reim_id == reim_id)).first()
    if existing:
        return existing

    employee = db.get(User, reim.user_id)
    if not employee or not employee.bank_code or not employee.bank_account_number:
        logger.info("[AUTO_PAYOUT] Skipping reim=%s — employee has no banking details", reim_id)
        return None

    amount = float(reim.total_approved_amount or 0)
    if amount <= 0:
        logger.info("[AUTO_PAYOUT] Skipping reim=%s — approved amount is 0", reim_id)
        return None

    reim.status = ReimbursementStatus.DISBURSING
    reim.updated_at = datetime.now(timezone.utc)
    db.add(reim)
    db.flush()

    reference_id = f"RC-{str(reim_id)[:8]}"
    bank_name = _get_channel_name(employee.bank_code)

    try:
        coro = _xendit.create_payout(
            reference_id=reference_id,
            channel_code=employee.bank_code,
            account_holder_name=employee.bank_account_holder_name or employee.name,
            account_number=employee.bank_account_number,
            amount=amount,
            currency="MYR",
            description=f"Reimbursement RC-{str(reim_id)[:8]}",
        )
        if loop and loop.is_running():
            xendit_result = asyncio.run_coroutine_threadsafe(coro, loop).result(timeout=30)
        else:
            xendit_result = asyncio.run(coro)
    except Exception:
        logger.exception("[AUTO_PAYOUT] Xendit call failed for reim=%s — leaving APPROVED for HR retry", reim_id)
        db.rollback()
        return None

    payout = Payout(
        reim_id=reim_id,
        user_id=reim.user_id,
        amount=amount,
        currency="MYR",
        status=PayoutStatus.ACCEPTED,
        xendit_id=xendit_result.get("id"),
        idempotency_key=xendit_result.get("idempotency_key", ""),
        reference_id=reference_id,
        channel_code=employee.bank_code,
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)

    masked = _mask_account(employee.bank_account_number)
    _notify(
        db, reim.user_id, "info",
        f"Payout initiated for claim RC-{str(reim_id)[:8]}",
        f"Payout of MYR {amount:,.2f} to {bank_name} ({masked}) has been initiated.",
        link=f"/employee/history?id={reim_id}",
    )

    if settings.XENDIT_MOCK_MODE and xendit_result.get("id"):
        _schedule_mock_webhook(xendit_result["id"], loop)

    logger.info("[AUTO_PAYOUT] Payout initiated: reim=%s payout=%s", reim_id, payout.payout_id)
    return payout


async def initiate_payout_async(reim_id: UUID, db: Session) -> Payout | None:
    """Async variant for use in FastAPI route handlers."""
    reim = db.get(Reimbursement, reim_id)
    if not reim or reim.status != ReimbursementStatus.APPROVED:
        return None

    existing = db.exec(select(Payout).where(Payout.reim_id == reim_id)).first()
    if existing:
        return existing

    employee = db.get(User, reim.user_id)
    if not employee or not employee.bank_code or not employee.bank_account_number:
        return None

    amount = float(reim.total_approved_amount or 0)
    if amount <= 0:
        return None

    reim.status = ReimbursementStatus.DISBURSING
    reim.updated_at = datetime.now(timezone.utc)
    db.add(reim)
    db.flush()

    reference_id = f"RC-{str(reim_id)[:8]}"
    bank_name = _get_channel_name(employee.bank_code)

    try:
        xendit_result = await _xendit.create_payout(
            reference_id=reference_id,
            channel_code=employee.bank_code,
            account_holder_name=employee.bank_account_holder_name or employee.name,
            account_number=employee.bank_account_number,
            amount=amount,
            currency="MYR",
            description=f"Reimbursement RC-{str(reim_id)[:8]}",
        )
    except Exception:
        logger.exception("[AUTO_PAYOUT] Xendit call failed for reim=%s", reim_id)
        db.rollback()
        return None

    payout = Payout(
        reim_id=reim_id,
        user_id=reim.user_id,
        amount=amount,
        currency="MYR",
        status=PayoutStatus.ACCEPTED,
        xendit_id=xendit_result.get("id"),
        idempotency_key=xendit_result.get("idempotency_key", ""),
        reference_id=reference_id,
        channel_code=employee.bank_code,
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)

    masked = _mask_account(employee.bank_account_number)
    _notify(
        db, reim.user_id, "info",
        f"Payout initiated for claim RC-{str(reim_id)[:8]}",
        f"Payout of MYR {amount:,.2f} to {bank_name} ({masked}) has been initiated.",
        link=f"/employee/history?id={reim_id}",
    )

    if settings.XENDIT_MOCK_MODE and xendit_result.get("id"):
        await _setup_mock_webhook_async(xendit_result["id"])

    return payout


async def _setup_mock_webhook_async(xendit_id: str):
    simulator = get_webhook_simulator()
    if simulator is None:
        async def _on_webhook(payout_id: str, status_str: str, failure_code: str | None):
            from core.database import engine as db_engine
            with Session(db_engine) as s:
                from api.payouts import _handle_webhook
                _handle_webhook(s, payout_id, status_str, failure_code)

        simulator = MockWebhookSimulator(_on_webhook)
        set_webhook_simulator(simulator)

    if isinstance(simulator, MockWebhookSimulator):
        simulator.schedule(xendit_id, delay=10.0)
