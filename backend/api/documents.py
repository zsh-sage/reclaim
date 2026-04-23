from pathlib import Path
from typing import List, Optional
from uuid import UUID

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import HTMLResponse
from sqlmodel import Session, select

from api import deps
from core.models import User, SupportingDocument, TravelSettlement
from engine.agents.document_agent import process_receipts
from engine.tools.change_detector import detect_changes, EDITABLE_FIELDS
from engine.tools.generate_reimbursement_template import generate_reimbursement_template

router = APIRouter()

STORAGE_DOCUMENTS_DIR = Path(__file__).parent.parent / "storage" / "documents"


@router.get("/health")
def health():
    return {"status": "ok", "workflow": "document_ocr"}


@router.get("/")
def list_documents(
    reim_id: Optional[str] = Query(None),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[dict]:
    stmt = select(SupportingDocument).where(
        SupportingDocument.user_id == current_user.user_id
    )
    if reim_id:
        stmt = stmt.where(SupportingDocument.reim_id == UUID(reim_id))
    docs = db.exec(stmt).all()
    return [
        {
            "document_id": str(d.document_id),
            "reim_id": str(d.reim_id) if d.reim_id else None,
            "name": d.name,
            "path": d.path,
            "type": d.type,
            "extracted_data": d.extracted_data,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
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

    return process_receipts(
        files=file_infos,
        user_id=user_id_str,
        employee_name=current_user.name,
        session=db,
    )


_NFIR = "Not found in Receipt"
_SETTLEMENTS_DIR = STORAGE_DOCUMENTS_DIR


def _build_aggregated_from_settlement(
    settlement: TravelSettlement,
    docs: list,
    user_code: str = "",
) -> dict:
    """Reconstruct aggregated_results from a TravelSettlement row + its SupportingDocuments."""
    from engine.agents.document_agent import _map_category_to_column

    # Build a map of document_id → SupportingDocument for human-edit lookup
    doc_map = {str(d.document_id): d for d in docs}

    # Re-derive receipts from settlement.receipts, applying any human edits
    receipts = []
    totals: dict = {"transportation": 0.0, "accommodation": 0.0, "meals": 0.0, "others": 0.0}
    currency = settlement.currency or "MYR"

    for r in (settlement.receipts or []):
        ed = dict(r.get("extracted_data") or {})
        doc_id = r.get("document_id", "")
        if doc_id in doc_map:
            doc = doc_map[doc_id]
            if doc.human_edited and doc.editable_fields:
                ed.update(doc.editable_fields)

        cat = ed.get("category") or r.get("category") or "No Reimbursement Policy for this receipt"
        amt = float(ed.get("total_amount") or r.get("amount") or 0)
        col = _map_category_to_column(cat)
        totals[col] += amt

        merchant = ed.get("merchant_name") or ""
        summary = ed.get("items_summary") or ""
        description = " - ".join(p for p in [merchant, summary] if p and p != _NFIR) or r.get("description", "")

        receipts.append({
            "document_id": doc_id,
            "date": ed.get("date") or r.get("date") or _NFIR,
            "description": description,
            "category": cat,
            "currency": currency,
            "amount": amt,
            "transportation": amt if col == "transportation" else 0.0,
            "accommodation": amt if col == "accommodation" else 0.0,
            "meals": amt if col == "meals" else 0.0,
            "others": amt if col == "others" else 0.0,
            "warnings": r.get("warnings", []),
            "extracted_data": ed,
        })

    totals["grand_total"] = sum(totals[k] for k in ["transportation", "accommodation", "meals", "others"])
    totals["currency"] = currency

    return {
        "document_ids": [r.get("document_id", "") for r in (settlement.receipts or [])],
        "employee": {
            "name": settlement.employee_name or "",
            "id": settlement.employee_id or "",
            "user_code": user_code or settlement.employee_code or "",
            "department": settlement.employee_department or "",
            "destination": settlement.destination or "",
            "departure_date": settlement.departure_date or "",
            "arrival_date": settlement.arrival_date or "",
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
        doc_map = {str(d.document_id): d for d in docs}
        aggregated = _build_aggregated_from_settlement(
            settlement, docs, user_code=current_user.user_code or ""
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
                "department": current_user.department or "",
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
    if str(settlement.employee_id) != str(current_user.user_id):
        from core.models import UserRole
        if current_user.role != UserRole.HR:
            raise HTTPException(status_code=403, detail="Not authorized")

    # Fetch all SupportingDocuments for this settlement (needed for human-edit overlay)
    docs = db.exec(
        select(SupportingDocument).where(
            SupportingDocument.settlement_id == s_uuid
        )
    ).all()

    aggregated = _build_aggregated_from_settlement(
        settlement, docs, user_code=current_user.user_code or ""
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

    doc.editable_fields = edits
    doc.human_edited = True
    doc.change_summary = change_summary

    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "document_id": str(doc.document_id),
        "human_edited": doc.human_edited,
        "change_summary": doc.change_summary,
    }
