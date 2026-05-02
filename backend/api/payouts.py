import logging
import asyncio
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from api import deps
from api.schemas import (
    CreatePayoutRequest,
    PayoutResponse,
    PayoutChannelResponse,
)
from core.models import (
    User, Reimbursement, Payout, Notification,
)
from core.enums import UserRole, ReimbursementStatus, PayoutStatus
from core.config import settings
from engine.services.xendit import (
    XenditClient,
    MockWebhookSimulator,
    set_webhook_simulator,
    get_webhook_simulator,
)

router = APIRouter()
logger = logging.getLogger(__name__)

_xendit = XenditClient()


def _mask_account(account: str) -> str:
    if not account or len(account) < 4:
        return "****"
    return "*" * (len(account) - 4) + account[-4:]


def _get_channel_name(channel_code: str) -> str:
    """Resolve a bank channel name from known Malaysian codes."""
    _names = {
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
    return _names.get(channel_code, channel_code)


def _create_notification(
    db: Session,
    user_id: UUID,
    n_type: str,
    title: str,
    message: str,
    link: str = None,
):
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


@router.get("/channels", response_model=list[PayoutChannelResponse])
async def list_payout_channels(
    current_user: User = Depends(deps.get_current_user),
):
    return await _xendit.get_channels(currency="MYR")


@router.get("/webhook-url")
async def get_webhook_url(request: Request):
    """Returns the webhook URL for the current environment.
    Frontend uses this to register webhook with Xendit dynamically.
    """
    from core.config import settings
    # Detect environment from host header
    host = request.headers.get("host", "")
    is_development = "localhost" in host or "127.0.0.1" in host or "ngrok" in host

    return {
        "webhook_url": settings.XENDIT_WEBHOOK_URL,
        "environment": "development" if is_development else "production"
    }


@router.post("/")
async def create_payout(
    body: CreatePayoutRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_hr_user),
):
    reim = db.get(Reimbursement, body.reim_id)
    if not reim:
        raise HTTPException(status_code=404, detail="Reimbursement not found")

    if reim.status != ReimbursementStatus.APPROVED:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot payout reimbursement with status {reim.status.value}. Must be APPROVED.",
        )

    employee = db.get(User, reim.user_id)
    if not employee or not employee.bank_code or not employee.bank_account_number:
        raise HTTPException(
            status_code=400,
            detail="Employee has not set up banking details. Please ask them to configure their payout account in Settings.",
        )

    amount = float(reim.total_approved_amount or 0)
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Approved amount must be greater than 0")

    # Check for existing payout
    existing = db.exec(
        select(Payout).where(Payout.reim_id == body.reim_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Payout already exists for this claim (status: {existing.status.value})",
        )

    # Transition reimbursement status
    reim.status = ReimbursementStatus.DISBURSING
    reim.updated_at = datetime.now(timezone.utc)
    db.add(reim)
    db.flush()

    reference_id = f"RC-{str(body.reim_id)[:8]}"
    bank_name = _get_channel_name(employee.bank_code)

    try:
        xendit_result = await _xendit.create_payout(
            reference_id=reference_id,
            channel_code=employee.bank_code,
            account_holder_name=employee.bank_account_holder_name or employee.name,
            account_number=employee.bank_account_number,
            amount=amount,
            currency="MYR",
            description=f"Reimbursement RC-{str(body.reim_id)[:8]}",
        )
    except Exception as e:
        logger.exception("[PAYOUT] Xendit create_payout failed")
        reim.status = ReimbursementStatus.DISBURSEMENT_FAILED
        reim.updated_at = datetime.now(timezone.utc)
        db.add(reim)
        db.commit()
        _create_notification(
            db, reim.user_id, "error",
            f"Payout failed for claim RC-{str(body.reim_id)[:8]}",
            f"Payout to {bank_name} failed: {str(e)[:200]}",
            link=f"/employee/history?id={body.reim_id}",
        )
        raise HTTPException(status_code=502, detail=f"Xendit API error: {str(e)}")

    # Save payout record
    payout = Payout(
        reim_id=body.reim_id,
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

    # Notify employee
    masked = _mask_account(employee.bank_account_number)
    _create_notification(
        db, reim.user_id, "info",
        f"Payout initiated for claim RC-{str(body.reim_id)[:8]}",
        f"Payout of MYR {amount:,.2f} to {bank_name} ({masked}) has been initiated.",
        link=f"/employee/history?id={body.reim_id}",
    )

    # Schedule simulated webhook in mock mode
    if settings.XENDIT_MOCK_MODE and xendit_result.get("id"):
        simulator = get_webhook_simulator()
        if simulator is None:

            async def _on_webhook(payout_id: str, status_str: str, failure_code: str | None):
                from core.database import engine as db_engine
                with Session(db_engine) as s:
                    _handle_webhook(s, payout_id, status_str, failure_code)

            simulator = MockWebhookSimulator(_on_webhook)
            set_webhook_simulator(simulator)

        if isinstance(simulator, MockWebhookSimulator):
            simulator.schedule(xendit_result["id"], delay=10.0)

    return PayoutResponse(
        payout_id=payout.payout_id,
        reim_id=payout.reim_id,
        user_id=payout.user_id,
        amount=payout.amount,
        currency=payout.currency,
        status=payout.status,
        xendit_id=payout.xendit_id,
        reference_id=payout.reference_id,
        channel_code=payout.channel_code,
        failure_code=payout.failure_code,
        created_at=payout.created_at,
        updated_at=payout.updated_at,
    )


@router.get("/{reim_id}")
async def get_payout(
    reim_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    try:
        reim_uuid = UUID(reim_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid reim_id")

    reim = db.get(Reimbursement, reim_uuid)
    if not reim:
        raise HTTPException(status_code=404, detail="Reimbursement not found")

    if current_user.role != UserRole.HR and reim.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    payout = db.exec(
        select(Payout).where(Payout.reim_id == reim_uuid)
    ).first()

    if not payout:
        raise HTTPException(status_code=404, detail="No payout found for this claim")

    return PayoutResponse(
        payout_id=payout.payout_id,
        reim_id=payout.reim_id,
        user_id=payout.user_id,
        amount=payout.amount,
        currency=payout.currency,
        status=payout.status,
        xendit_id=payout.xendit_id,
        reference_id=payout.reference_id,
        channel_code=payout.channel_code,
        failure_code=payout.failure_code,
        created_at=payout.created_at,
        updated_at=payout.updated_at,
    )


@router.post("/webhook")
async def payout_webhook(request: Request, db: Session = Depends(deps.get_db)):
    """Xendit payout webhook receiver. Validates x-callback-token header."""
    callback_token = request.headers.get("x-callback-token", "")
    expected = settings.XENDIT_WEBHOOK_TOKEN

    if not settings.XENDIT_MOCK_MODE and callback_token != expected:
        logger.warning("[PAYOUT_WEBHOOK] Invalid x-callback-token")
        raise HTTPException(status_code=401, detail="Invalid webhook token")

    body = await request.json()
    payout_id = body.get("id", "")
    status_str = body.get("status", "")
    failure_code = body.get("failure_code")

    logger.info("[PAYOUT_WEBHOOK] Received webhook: payout=%s status=%s", payout_id, status_str)

    if settings.XENDIT_MOCK_MODE:
        await asyncio.sleep(0.1)

    _handle_webhook(db, payout_id, status_str, failure_code)
    return {"status": "ok"}


def _handle_webhook(db: Session, payout_id: str, status_str: str, failure_code: str | None):
    """Process a payout webhook: update Payout + Reimbursement + create Notification."""
    payout = db.exec(
        select(Payout).where(Payout.xendit_id == payout_id)
    ).first()

    if not payout:
        logger.warning("[PAYOUT_WEBHOOK] Unknown payout id=%s", payout_id)
        return

    valid_statuses = {s.value for s in PayoutStatus}
    if status_str not in valid_statuses:
        logger.warning("[PAYOUT_WEBHOOK] Unknown status=%s", status_str)
        return

    payout.status = PayoutStatus(status_str)
    if failure_code:
        payout.failure_code = failure_code
    payout.updated_at = datetime.now(timezone.utc)
    db.add(payout)

    reim = db.get(Reimbursement, payout.reim_id)
    if reim:
        bank_name = _get_channel_name(payout.channel_code)
        if status_str == "SUCCEEDED":
            reim.status = ReimbursementStatus.PAID
            reim.updated_at = datetime.now(timezone.utc)
            db.add(reim)
            _create_notification(
                db, payout.user_id, "success",
                f"Payment received for claim RC-{str(reim.reim_id)[:8]}",
                f"Payment of MYR {payout.amount:,.2f} to {bank_name} has been completed.",
                link=f"/employee/history?id={reim.reim_id}",
            )
        elif status_str in ("FAILED", "REVERSED"):
            reim.status = ReimbursementStatus.DISBURSEMENT_FAILED
            reim.updated_at = datetime.now(timezone.utc)
            db.add(reim)
            reason = failure_code or status_str
            _create_notification(
                db, payout.user_id, "error",
                f"Payout failed for claim RC-{str(reim.reim_id)[:8]}",
                f"Payout to {bank_name} failed: {reason}. Please contact HR.",
                link=f"/employee/history?id={reim.reim_id}",
            )

    db.flush()
