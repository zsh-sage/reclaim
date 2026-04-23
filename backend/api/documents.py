import os
from pathlib import Path
from typing import List, Optional
from uuid import UUID

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlmodel import Session, select

from api import deps
from core.models import User, SupportingDocument
from engine.agents.document_agent import process_receipts, generate_reimbursement_template

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


@router.post("/generate-template")
async def generate_template(
    document_ids: List[str] = Form(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Generate a Business Travel Settlement PDF from previously uploaded receipts."""
    from engine.agents.document_agent import _get_active_categories
    from core.models import Policy
    import json

    doc_uuids = [UUID(d) for d in document_ids]
    docs = db.exec(
        select(SupportingDocument).where(
            SupportingDocument.document_id.in_(doc_uuids),
            SupportingDocument.user_id == current_user.user_id,
        )
    ).all()

    if not docs:
        raise HTTPException(status_code=404, detail="No documents found for given IDs")

    categories = _get_active_categories(db)
    currency = "MYR"
    receipts = []
    totals = {"transportation": 0.0, "accommodation": 0.0, "meals": 0.0, "others": 0.0}

    from engine.agents.document_agent import _map_category_to_column

    for doc in docs:
        ed = doc.extracted_data or {}
        c = ed.get("currency") or ""
        if c and c != "Not found in Receipt":
            currency = c

        cat = ed.get("category") or "No Reimbursement Policy for this receipt"
        amt = float(ed.get("total_amount") or 0)
        col = _map_category_to_column(cat)
        totals[col] += amt

        merchant = ed.get("merchant_name") or ""
        summary = ed.get("items_summary") or ""
        description = " - ".join(p for p in [merchant, summary] if p and p != "Not found in Receipt") or doc.name

        receipts.append({
            "document_id": str(doc.document_id),
            "date": ed.get("date") or "Not found in Receipt",
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
            "department": current_user.department or "",
            "destination": "",
            "purpose": ", ".join(categories[:3]) if categories else "",
        },
        "receipts": receipts,
        "totals": totals,
        "all_warnings": [],
    }

    user_dir = STORAGE_DOCUMENTS_DIR / str(current_user.user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    output_path = str(user_dir / "reimbursement_settlement.pdf")

    try:
        generate_reimbursement_template(aggregated, output_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

    return {
        "pdf_path": f"/storage/documents/{current_user.user_id}/reimbursement_settlement.pdf",
        "aggregated_results": aggregated,
    }
