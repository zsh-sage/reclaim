import asyncio
import concurrent.futures
import json
import logging
from pathlib import Path
from typing import List, Optional
from uuid import UUID

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from sqlmodel import Session, select

from engine.progress import ProgressTracker

from api import deps
from api.schemas import DocumentChangeLogResponse, DocumentFieldEditRequest, SupportingDocumentListItem
from core.models import (
    User, SupportingDocument, TravelSettlement, SettlementReceipt,
    SettlementCategory, DocumentChangeLog, User as Employee
)
from core.enums import UserRole
from engine.tools.change_detector import detect_changes, EDITABLE_FIELDS
from engine.tools.generate_reimbursement_template import generate_reimbursement_template

router = APIRouter()
logger = logging.getLogger(__name__)

STORAGE_DOCUMENTS_DIR = Path(__file__).parent.parent / "storage" / "documents"


@router.get("/health")
def health():
    return {"status": "ok", "workflow": "document_ocr"}


@router.get("/")
def list_documents(
    reim_id: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[SupportingDocumentListItem]:
    stmt = select(SupportingDocument).where(
        SupportingDocument.user_id == current_user.user_id
    )
    if reim_id:
        stmt = stmt.where(SupportingDocument.reim_id == UUID(reim_id))
    docs = db.exec(stmt).all()
    return [
        SupportingDocumentListItem(
            document_id=d.document_id,
            reim_id=d.reim_id,
            name=d.name,
            path=d.path,
            type=d.type,
            extracted_data=d.extracted_data,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Upload one or more receipt files (images or PDFs) for parallel OCR processing."""
    user_id_str = str(current_user.user_id)
    logger.info("[API_UPLOAD] Received %d files from user=%s", len(files), user_id_str)
    user_dir = STORAGE_DOCUMENTS_DIR / user_id_str
    user_dir.mkdir(parents=True, exist_ok=True)

    file_infos = []
    for file in files:
        fname = file.filename or "unnamed_upload"
        dest = user_dir / fname
        async with aiofiles.open(dest, "wb") as out:
            content = await file.read()
            await out.write(content)

        content_type = file.content_type or ""
        file_type = "image" if content_type.startswith("image/") else "pdf"
        file_infos.append({
            "file_path": str(dest),
            "file_type": file_type,
            "document_name": fname,
        })
        logger.info("[API_UPLOAD] Saved file: %s (type=%s)", fname, file_type)

    tracker = ProgressTracker()
    task_id = tracker.create_task()
    logger.info("[API_UPLOAD] Created task_id=%s", task_id)

    employee_name = current_user.name

    executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)

    def _process_background():
        logger.info("[API_UPLOAD_BG] Starting background processing for task=%s", task_id)
        from sqlmodel import Session as _Session
        from core.database import engine as _engine
        from engine.agents.document_agent import process_receipts as _process

        with _Session(_engine) as bg_db:
            def progress_callback(stage: str, data: dict):
                logger.info("[API_UPLOAD_BG] task=%s stage=%s data=%s", task_id, stage, data)
                tracker.publish(task_id, stage, data)

            try:
                _process(
                    files=file_infos,
                    user_id=user_id_str,
                    employee_name=employee_name,
                    session=bg_db,
                    progress_callback=progress_callback,
                )
            except Exception as e:
                logger.exception("[API_UPLOAD_BG] Background processing failed for task=%s", task_id)
                tracker.publish(task_id, "error", {"message": str(e)})

    executor.submit(_process_background)

    logger.info("[API_UPLOAD] Returning task_id=%s", task_id)
    return {"task_id": task_id}


@router.get("/progress/{task_id}")
async def document_progress(task_id: str):
    """SSE endpoint: stream progress events for a document processing task."""
    logger.info("[API_SSE] Client connected to documents/progress/%s", task_id)
    tracker = ProgressTracker()

    async def event_generator():
        try:
            async for event_str in tracker.subscribe(task_id):
                logger.info("[API_SSE] Streaming event for task=%s: %s", task_id, event_str.strip().replace("\n", " "))
                yield event_str
        except asyncio.CancelledError:
            logger.info("[API_SSE] Client disconnected from task=%s", task_id)
        finally:
            asyncio.create_task(tracker.cleanup(task_id))

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


_NFIR = "Not found in Receipt"
_SETTLEMENTS_DIR = STORAGE_DOCUMENTS_DIR


def _build_aggregated_from_settlement(
    settlement: TravelSettlement,
    docs: list,
    user_code: str = "",
    db: Session = None,
) -> dict:
    """Reconstruct aggregated_results from a TravelSettlement row + its SupportingDocuments."""
    from engine.agents.document_agent import _map_category_to_column

    # Build a map of document_id -> SupportingDocument for human-edit lookup
    doc_map = {str(d.document_id): d for d in docs}

    # Fetch settlement receipts from normalized table
    receipts = []
    totals: dict = {"transportation": 0.0, "accommodation": 0.0, "meals": 0.0, "others": 0.0}
    currency = settlement.currency or "MYR"

    settlement_receipts = []
    if db:
        settlement_receipts = db.exec(
            select(SettlementReceipt).where(SettlementReceipt.settlement_id == settlement.settlement_id)
        ).all()

    for sr in settlement_receipts:
        doc_id = str(sr.document_id) if sr.document_id else ""
        ed = {}
        if doc_id in doc_map:
            doc = doc_map[doc_id]
            ed = dict(doc.extracted_data or {})
            if doc.human_edited and doc.editable_fields:
                ed.update(doc.editable_fields)

        cat = sr.category or ed.get("category") or "No Reimbursement Policy for this receipt"
        amt = float(sr.claimed_amount or ed.get("total_amount") or 0)
        col = _map_category_to_column(cat)
        totals[col] += amt

        merchant = sr.merchant_name or ed.get("merchant_name") or ""
        summary = ed.get("items_summary") or ""
        description = " - ".join(p for p in [merchant, summary] if p and p != _NFIR)
        if not description:
            doc = doc_map.get(doc_id)
            description = doc.name if doc else ""

        receipts.append({
            "document_id": doc_id,
            "date": (sr.receipt_date.isoformat() if sr.receipt_date else None) or ed.get("date") or _NFIR,
            "description": description,
            "category": cat,
            "currency": sr.currency or currency,
            "amount": amt,
            "transportation": amt if col == "transportation" else 0.0,
            "accommodation": amt if col == "accommodation" else 0.0,
            "meals": amt if col == "meals" else 0.0,
            "others": amt if col == "others" else 0.0,
            "warnings": [],
            "extracted_data": ed,
        })

    totals["grand_total"] = sum(totals[k] for k in ["transportation", "accommodation", "meals", "others"])
    totals["currency"] = currency

    # Fetch categories
    categories = []
    if db:
        cats = db.exec(
            select(SettlementCategory).where(SettlementCategory.settlement_id == settlement.settlement_id)
        ).all()
        categories = [c.category for c in cats]

    # Fetch employee info
    employee_name = ""
    department_name = ""
    if db and settlement.user_id:
        emp = db.get(Employee, settlement.user_id)
        if emp:
            employee_name = emp.name
            if emp.department_id:
                from core.models import Department
                dept = db.get(Department, emp.department_id)
                if dept:
                    department_name = dept.name

    return {
        "document_ids": [r.get("document_id", "") for r in receipts],
        "employee": {
            "name": employee_name,
            "id": str(settlement.user_id) if settlement.user_id else "",
            "user_code": user_code,
            "department": department_name,
            "destination": settlement.destination or "",
            "departure_date": (settlement.departure_date.isoformat() if settlement.departure_date else "") or "",
            "arrival_date": (settlement.arrival_date.isoformat() if settlement.arrival_date else "") or "",
            "location": settlement.location or "",
            "overseas": settlement.overseas,
            "purpose": settlement.purpose or "",
        },
        "receipts": receipts,
        "totals": totals,
        "all_warnings": [],
    }


@router.post("/generate-template", response_class=HTMLResponse)
async def generate_template(
    document_ids: List[str] = Form(...),
    settlement_id: Optional[str] = Form(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> HTMLResponse:
    """
    Render a Business Travel Settlement HTML page.
    When settlement_id is provided, employee context is pulled from the settlement
    and the rendered HTML is saved to disk with its path stored in TravelSettlement.document_path.
    """
    from engine.agents.document_agent import _get_active_categories, _map_category_to_column

    doc_uuids = [UUID(d) for d in document_ids]
    docs = db.exec(
        select(SupportingDocument).where(
            SupportingDocument.document_id.in_(doc_uuids),
            SupportingDocument.user_id == current_user.user_id,
        )
    ).all()

    if not docs:
        raise HTTPException(status_code=404, detail="No documents found for given IDs")

    # If a settlement_id is given, use its stored employee context
    settlement: Optional[TravelSettlement] = None
    if settlement_id:
        try:
            settlement = db.get(TravelSettlement, UUID(settlement_id))
        except Exception:
            pass

    if settlement:
        aggregated = _build_aggregated_from_settlement(
            settlement, docs, user_code=current_user.user_code or "", db=db
        )
    else:
        # Fallback: build from document list only (no settlement context)
        categories = _get_active_categories(db)
        currency = "MYR"
        receipts = []
        totals: dict = {"transportation": 0.0, "accommodation": 0.0, "meals": 0.0, "others": 0.0}

        for doc in docs:
            ed = dict(doc.extracted_data or {})
            if doc.human_edited and doc.editable_fields:
                ed.update(doc.editable_fields)

            c = ed.get("currency") or ""
            if c and c != _NFIR:
                currency = c

            cat = ed.get("category") or "No Reimbursement Policy for this receipt"
            amt = float(ed.get("total_amount") or 0)
            col = _map_category_to_column(cat)
            totals[col] += amt

            merchant = ed.get("merchant_name") or ""
            summary = ed.get("items_summary") or ""
            description = " - ".join(p for p in [merchant, summary] if p and p != _NFIR) or doc.name

            receipts.append({
                "document_id": str(doc.document_id),
                "date": ed.get("date") or _NFIR,
                "description": description,
                "category": cat,
                "currency": currency,
                "amount": amt,
                "transportation": amt if col == "transportation" else 0.0,
                "accommodation": amt if col == "accommodation" else 0.0,
                "meals": amt if col == "meals" else 0.0,
                "others": amt if col == "others" else 0.0,
                "warnings": [],
                "extracted_data": ed,
            })

        totals["grand_total"] = sum(totals[k] for k in ["transportation", "accommodation", "meals", "others"])
        totals["currency"] = currency

        aggregated = {
            "document_ids": document_ids,
            "employee": {
                "name": current_user.name,
                "id": str(current_user.user_id),
                "user_code": current_user.user_code or "",
                "department": "",
                "destination": "",
                "departure_date": "",
                "arrival_date": "",
                "location": "",
                "overseas": None,
                "purpose": ", ".join(categories[:3]) if categories else "",
            },
            "receipts": receipts,
            "totals": totals,
            "all_warnings": [],
        }

    try:
        html = generate_reimbursement_template(aggregated)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template rendering failed: {e}")

    # Save HTML and record path in TravelSettlement.document_path
    if settlement:
        user_dir = _SETTLEMENTS_DIR / str(current_user.user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        html_path = user_dir / f"settlement_{settlement_id}.html"
        html_path.write_text(html, encoding="utf-8")
        settlement.document_path = str(html_path)
        db.add(settlement)
        db.commit()

    return HTMLResponse(content=html, status_code=200)


@router.get("/settlement/{settlement_id}/template", response_class=HTMLResponse)
def get_settlement_template(
    settlement_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> HTMLResponse:
    """
    Serve the saved settlement HTML (or re-render from DB if not yet generated).
    Applies current human edits so the template always reflects the latest corrections.
    """
    try:
        s_uuid = UUID(settlement_id)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid settlement_id: {settlement_id}")

    settlement = db.get(TravelSettlement, s_uuid)
    if not settlement:
        raise HTTPException(status_code=404, detail="Settlement not found")

    # Auth: only the settlement owner (or HR) can view
    if str(settlement.user_id) != str(current_user.user_id):
        if current_user.role != UserRole.HR:
            raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch all SupportingDocuments for this settlement (needed for human-edit overlay)
    docs = db.exec(
        select(SupportingDocument).where(
            SupportingDocument.settlement_id == s_uuid
        )
    ).all()

    aggregated = _build_aggregated_from_settlement(
        settlement, docs, user_code=current_user.user_code or "", db=db
    )

    try:
        html = generate_reimbursement_template(aggregated)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template rendering failed: {e}")

    # Refresh saved file so it stays in sync with latest edits
    if settlement.document_path:
        try:
            Path(settlement.document_path).write_text(html, encoding="utf-8")
        except Exception:
            pass

    return HTMLResponse(content=html, status_code=200)


@router.post("/{document_id}/edits")
def edit_receipt_fields(
    document_id: str,
    edits: dict,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """
    User edits receipt fields post-OCR. Original extracted_data is preserved.
    Edits are stored in editable_fields; change severity is pre-computed.
    """
    try:
        doc_uuid = UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document_id: {document_id}")

    doc = db.get(SupportingDocument, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if str(doc.user_id) != str(current_user.user_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    invalid_fields = set(edits.keys()) - EDITABLE_FIELDS
    if invalid_fields:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot edit fields: {sorted(invalid_fields)}. Allowed: {sorted(EDITABLE_FIELDS)}",
        )

    change_summary = detect_changes(doc.extracted_data or {}, edits)

    if not change_summary["has_changes"]:
        raise HTTPException(
            status_code=400,
            detail="No actual changes detected; edits match original values",
        )

    # Log each changed field to document_change_logs
    for field_name, info in change_summary.get("changes_by_field", {}).items():
        log = DocumentChangeLog(
            document_id=doc.document_id,
            changed_by=current_user.user_id,
            field_name=field_name,
            old_value=str(info.get("original", "")) if info.get("original") is not None else None,
            new_value=str(info.get("edited", "")) if info.get("edited") is not None else None,
        )
        db.add(log)

    doc.editable_fields = edits
    doc.human_edited = True

    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "document_id": str(doc.document_id),
        "human_edited": doc.human_edited,
        "change_count": change_summary.get("change_count", 0),
        "high_risk_count": change_summary.get("high_risk_count", 0),
    }


@router.patch("/{document_id}/fields")
def update_document_field(
    document_id: str,
    body: DocumentFieldEditRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Formal PATCH endpoint for editing document fields."""
    return edit_receipt_fields(document_id, body.edits, db, current_user)


@router.get("/{document_id}/history")
def get_document_history(
    document_id: str,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[DocumentChangeLogResponse]:
    """Return the change history for a document."""
    try:
        doc_uuid = UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid document_id: {document_id}")

    doc = db.get(SupportingDocument, doc_uuid)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Auth: only the document owner (or HR) can view history
    if str(doc.user_id) != str(current_user.user_id):
        if current_user.role != UserRole.HR:
            raise HTTPException(status_code=403, detail="Not authorized")

    logs = db.exec(
        select(DocumentChangeLog)
        .where(DocumentChangeLog.document_id == doc_uuid)
        .order_by(DocumentChangeLog.changed_at.desc())
    ).all()

    return [
        DocumentChangeLogResponse(
            log_id=l.log_id,
            document_id=l.document_id,
            changed_by=l.changed_by,
            field_name=l.field_name,
            old_value=l.old_value,
            new_value=l.new_value,
            changed_at=l.changed_at,
        )
        for l in logs
    ]
