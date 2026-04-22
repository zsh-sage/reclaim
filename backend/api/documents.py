import os
from pathlib import Path
from typing import List, Optional
from uuid import UUID

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlmodel import Session, select

from api import deps
from core.models import User, SupportingDocument
from engine.agents.document_agent import run_document_workflow

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
            "is_main": d.is_main,
            "document_class": d.document_class,
            "extracted_data": d.extracted_data,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]


@router.post("/upload")
async def upload_document(
    is_main: bool = Form(...),
    document_name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Upload a single document (receipt image or supporting PDF)."""
    user_id_str = str(current_user.user_id)
    user_dir = STORAGE_DOCUMENTS_DIR / user_id_str
    user_dir.mkdir(parents=True, exist_ok=True)

    fname = file.filename or "unnamed_upload"
    dest = user_dir / fname
    async with aiofiles.open(dest, "wb") as out:
        content = await file.read()
        await out.write(content)

    # Detect file type
    content_type = file.content_type or ""
    file_type = "image" if content_type.startswith("image/") else "pdf"

    result = run_document_workflow(
        file_path=str(dest),
        file_type=file_type,
        is_main=is_main,
        document_name=document_name,
        user_id=user_id_str,
        employee_name=current_user.name,
        session=db,
    )

    return result
