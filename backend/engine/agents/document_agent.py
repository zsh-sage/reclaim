import re
import math
import json
import base64
from pathlib import Path
from typing import List, Dict, Optional
from uuid import UUID

from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlmodel import Session
import pymupdf4llm

from core.models import SupportingDocument, SupportingDocumentEmbedding
from engine.llm import get_vision_llm, get_embeddings
from engine.prompts.document_prompts import RECEIPT_OCR_PROMPT


def _ocr_receipt(file_path: str) -> dict:
    """Use Vision LLM to extract structured data from a receipt image."""
    with open(file_path, "rb") as f:
        image_bytes = f.read()

    # Detect MIME type from extension
    ext = Path(file_path).suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    mime_type = mime_map.get(ext, "image/jpeg")

    b64_str = base64.b64encode(image_bytes).decode("utf-8")

    message = HumanMessage(content=[
        {"type": "text", "text": RECEIPT_OCR_PROMPT},
        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_str}"}},
    ])

    response = get_vision_llm().invoke([message])
    content = response.content

    # Try JsonOutputParser first, fall back to regex extraction
    try:
        parser = JsonOutputParser()
        result = parser.parse(content)
    except Exception:
        try:
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                result = json.loads(match.group())
            else:
                raise ValueError("No JSON found in vision LLM response")
        except Exception as e:
            print(f"Failed to parse receipt OCR response: {e}")
            result = {}

    return result


def _build_warnings(extracted_data: dict, employee_name: str) -> List[str]:
    """Build list of warning messages from OCR result."""
    warnings = []

    confidence = extracted_data.get("confidence", 1.0) or 1.0
    if confidence < 0.7:
        warnings.append(f"Low confidence OCR result: {confidence:.2f}")

    required_fields = ["date", "currency", "total_amount", "receipt_number", "receipt_name"]
    for field in required_fields:
        if extracted_data.get(field) is None:
            warnings.append(f"Missing required field: {field}")

    if extracted_data.get("visual_anomalies_detected"):
        desc = extracted_data.get("anomaly_description", "Unknown anomaly")
        warnings.append(f"Visual anomaly detected: {desc}")

    receipt_name = extracted_data.get("receipt_name") or ""
    if receipt_name and employee_name:
        if receipt_name.lower().strip() != employee_name.lower().strip():
            warnings.append(
                f"Receipt name '{receipt_name}' does not match employee name '{employee_name}'"
            )

    return warnings


def _process_supporting_doc(file_path: str, session: Session, document_id: UUID) -> None:
    """Extract text from PDF, embed chunks, and save SupportingDocumentEmbedding rows."""
    try:
        md_text = pymupdf4llm.to_markdown(file_path)
    except Exception as e:
        print(f"Failed to parse supporting doc {file_path}: {e}")
        return

    if len(md_text) > 1500:
        num_chunks = math.ceil(len(md_text) / 1000)
        target_chunk_size = len(md_text) // num_chunks
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=target_chunk_size + 100,
            chunk_overlap=150,
            separators=["\n\n", "\n", "(?<=\\. )", " ", ""],
        )
        chunks = splitter.create_documents([md_text])
        chunk_texts = [c.page_content for c in chunks]
    else:
        chunk_texts = [md_text]

    if not chunk_texts:
        return

    embeddings_list = get_embeddings().embed_documents(chunk_texts)

    for i, (text, embedding) in enumerate(zip(chunk_texts, embeddings_list)):
        emb_row = SupportingDocumentEmbedding(
            document_id=document_id,
            content=text,
            embedding=embedding,
            metadata_data={"chunk_index": i},
        )
        session.add(emb_row)


def run_document_workflow(
    file_path: str,
    file_type: str,  # "image" or "pdf"
    is_main: bool,
    document_name: str,
    user_id: str,
    employee_name: str,
    session: Session,
) -> dict:
    """
    Process a single uploaded document.

    Returns:
        {
            "document_id": str,
            "is_main": bool,
            "extracted_data": dict,
            "warnings": List[str],
        }
    """
    # Relative path for DB storage (always use forward slashes)
    relative_path = f"/storage/documents/{user_id}/{Path(file_path).name}"

    extracted_data: dict = {}
    warnings: List[str] = []

    if is_main:
        # Receipt path: Vision LLM OCR
        extracted_data = _ocr_receipt(file_path)
        warnings = _build_warnings(extracted_data, employee_name)
        document_class = "RECEIPT"
    else:
        # Supporting document path
        document_class = "SUPPORTING"
        extracted_data = {}

    # Save SupportingDocument row
    doc = SupportingDocument(
        user_id=UUID(user_id),
        name=document_name,
        path=relative_path,
        type=file_type,
        is_main=is_main,
        document_class=document_class,
        extracted_data=extracted_data,
    )
    session.add(doc)
    session.flush()  # Get doc.document_id before embedding insert

    # For supporting docs: embed and save chunks
    if not is_main and file_type == "pdf":
        _process_supporting_doc(file_path, session, doc.document_id)

    session.commit()

    return {
        "document_id": str(doc.document_id),
        "is_main": is_main,
        "extracted_data": extracted_data,
        "warnings": warnings,
    }
