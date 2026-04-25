import re
import json
import base64
import concurrent.futures
from pathlib import Path
from typing import List, Optional
from uuid import UUID

import pymupdf4llm
from langchain_core.messages import HumanMessage
from sqlmodel import Session, select

from core.models import SupportingDocument, Policy, User, TravelSettlement
from engine.llm import get_vision_llm, get_text_llm
from engine.prompts.document_prompts import RECEIPT_OCR_PROMPT, RECEIPT_OCR_PROMPT_WITH_CATEGORIES
from engine.tools.generate_reimbursement_template import generate_reimbursement_template  # noqa: F401 (re-exported)

# ---------------------------------------------------------------------------
# Category → expense column keyword sets
# ---------------------------------------------------------------------------
_TRANSPORT_KW = {
    "transport", "travel", "air", "flight", "taxi", "uber", "grab",
    "bus", "train", "car", "fuel", "petrol", "mileage", "toll", "vehicle", "rental",
}
_ACCOMMODATION_KW = {
    "hotel", "accommodation", "lodging", "stay", "hostel", "airbnb", "room", "motel", "resort",
}
_MEALS_KW = {
    "meal", "food", "dining", "restaurant", "beverage", "lunch", "dinner",
    "breakfast", "coffee", "snack", "catering", "f&b",
}

_NFIR = "Not found in Receipt"

# Fields whose presence indicates a readable receipt
_READABILITY_FIELDS = [
    "merchant_name", "date", "total_amount", "currency",
    "receipt_number", "items_summary",
]


# ---------------------------------------------------------------------------
# JSON extraction helper
# ---------------------------------------------------------------------------

def _normalize_llm_content(content) -> str:
    """Flatten LangChain content that may be a list of content blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                parts.append(block.get("text", ""))
            elif isinstance(block, str):
                parts.append(block)
        return "\n".join(parts)
    return str(content)


def _extract_json_object(text: str) -> dict:
    """Extract the first complete JSON object from text that may contain surrounding prose."""
    stripped = re.sub(r"```(?:json)?\s*", "", text).strip()
    stripped = stripped.replace("{{", "{").replace("}}", "}")

    start = stripped.find("{")
    if start == -1:
        raise ValueError("No JSON object found in response")

    depth = 0
    in_string = False
    escape_next = False
    for i, ch in enumerate(stripped[start:], start=start):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return json.loads(stripped[start : i + 1])

    raise ValueError("Unbalanced braces — could not extract JSON object")


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(categories: List[str]) -> str:
    if categories:
        return RECEIPT_OCR_PROMPT_WITH_CATEGORIES.replace(
            "{categories}",
            "\n".join(f"- {c}" for c in categories),
        )
    return RECEIPT_OCR_PROMPT


# ---------------------------------------------------------------------------
# LLM OCR routes
# ---------------------------------------------------------------------------

def _ocr_image(file_path: str, prompt: str) -> dict:
    """Vision LLM path for image receipts."""
    with open(file_path, "rb") as f:
        image_bytes = f.read()

    ext = Path(file_path).suffix.lower()
    mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
    mime_type = mime_map.get(ext, "image/jpeg")
    b64_str = base64.b64encode(image_bytes).decode("utf-8")

    message = HumanMessage(content=[
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{b64_str}"}},
    ])
    response = get_vision_llm().invoke([message])
    try:
        return _extract_json_object(_normalize_llm_content(response.content))
    except Exception as e:
        print(f"Failed to parse image OCR response: {e}")
        return {}


def _ocr_pdf(file_path: str, prompt: str) -> dict:
    """Standard text LLM path for PDF receipts — extracts markdown then queries LLM."""
    try:
        md_text = pymupdf4llm.to_markdown(file_path)
    except Exception as e:
        print(f"Failed to extract PDF text from {file_path}: {e}")
        return {}

    full_prompt = f"{prompt}\n\nDocument Text:\n{md_text[:8000]}"
    response = get_text_llm().invoke([HumanMessage(content=full_prompt)])
    try:
        return _extract_json_object(_normalize_llm_content(response.content))
    except Exception as e:
        print(f"Failed to parse PDF OCR response: {e}")
        return {}


# ---------------------------------------------------------------------------
# Unreadability check
# ---------------------------------------------------------------------------

def _is_unreadable(extracted_data: dict) -> bool:
    """Return True if all readability fields are absent/null/default — receipt is effectively empty."""
    if not extracted_data:
        return True
    for field in _READABILITY_FIELDS:
        val = extracted_data.get(field)
        if val is not None and val != _NFIR and val != "" and val != 0:
            return False
    return True


# ---------------------------------------------------------------------------
# Warnings
# ---------------------------------------------------------------------------

def _build_warnings(extracted_data: dict, employee_name: str, is_pdf: bool = False) -> List[str]:
    warnings = []

    if _is_unreadable(extracted_data):
        warnings.append("Receipt is unreadable or contains no extractable data.")
        return warnings  # no point checking further fields

    confidence = extracted_data.get("confidence", 1.0) or 1.0
    if isinstance(confidence, (int, float)) and confidence < 0.7:
        warnings.append(f"Low confidence OCR result: {confidence:.2f}")

    required_fields = ["currency", "total_amount"]
    for field in required_fields:
        val = extracted_data.get(field)
        if val is None or val == _NFIR or val == 0:
            if field == "total_amount" and val == 0:
                pass  # zero amount is valid
            else:
                warnings.append(f"Missing required field: {field}")

    is_anomaly = extracted_data.get("visual_anomalies_detected")
    desc = extracted_data.get("anomaly_description")
    if isinstance(is_anomaly, str):
        is_anomaly = is_anomaly.lower() in ("true", "1", "yes")
    if is_anomaly:
        warnings.append(f"Visual anomaly detected: {desc}")

    return warnings


# ---------------------------------------------------------------------------
# Category → expense column mapper
# ---------------------------------------------------------------------------

def _map_category_to_column(category: str) -> str:
    cat_lower = category.lower()
    if any(kw in cat_lower for kw in _TRANSPORT_KW):
        return "transportation"
    if any(kw in cat_lower for kw in _ACCOMMODATION_KW):
        return "accommodation"
    if any(kw in cat_lower for kw in _MEALS_KW):
        return "meals"
    return "others"


# ---------------------------------------------------------------------------
# Per-file LLM processing (thread-safe — no DB access)
# ---------------------------------------------------------------------------

def _process_single_receipt_llm(
    file_path: str,
    file_type: str,
    document_name: str,
    employee_name: str,
    categories: List[str],
) -> dict:
    prompt = _build_prompt(categories)
    is_pdf = file_type == "pdf"

    extracted_data = _ocr_pdf(file_path, prompt) if is_pdf else _ocr_image(file_path, prompt)
    warnings = _build_warnings(extracted_data, employee_name, is_pdf=is_pdf)

    category = extracted_data.get("category") or "No Reimbursement Policy for this receipt"
    amount = float(extracted_data.get("total_amount") or 0)
    col = _map_category_to_column(category)

    return {
        "file_path": file_path,
        "file_type": file_type,
        "document_name": document_name,
        "extracted_data": extracted_data,
        "warnings": warnings,
        "category": category,
        "amount": amount,
        "column": col,
    }


# ---------------------------------------------------------------------------
# Active categories query
# ---------------------------------------------------------------------------

def _get_active_categories(session: Session) -> List[str]:
    policies = session.exec(select(Policy).where(Policy.status == "ACTIVE")).all()
    seen = set()
    categories = []
    for p in policies:
        for cat in (p.reimbursable_category or []):
            if cat not in seen:
                seen.add(cat)
                categories.append(cat)
    return categories


# ---------------------------------------------------------------------------
# Main entry point — parallel LLM calls, serial DB writes
# ---------------------------------------------------------------------------

def process_receipts(
    files: List[dict],
    user_id: str,
    employee_name: str,
    session: Session,
    policies_db: Optional[List[str]] = None,
) -> dict:
    """
    Process a list of receipt files.

    files: [{"file_path": str, "document_name": str, "file_type": str}]
    policies_db: pre-fetched list of reimbursable categories; queried from session if None.

    Returns aggregated_results dict ready for generate_reimbursement_template().
    """
    categories = policies_db if policies_db is not None else _get_active_categories(session)

    # Parallel LLM calls (no session access in workers)
    llm_results: List[dict] = []
    max_workers = min(len(files), 4) if files else 1
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(
                _process_single_receipt_llm,
                f["file_path"],
                f.get("file_type", "image"),
                f.get("document_name", Path(f["file_path"]).name),
                employee_name,
                categories,
            ): f
            for f in files
        }
        for future in concurrent.futures.as_completed(futures):
            try:
                llm_results.append(future.result())
            except Exception as e:
                orig = futures[future]
                print(f"Error processing {orig['file_path']}: {e}")
                llm_results.append({
                    "file_path": orig["file_path"],
                    "file_type": orig.get("file_type", "image"),
                    "document_name": orig.get("document_name", ""),
                    "extracted_data": {},
                    "warnings": [f"Processing error: {e}"],
                    "category": "No Reimbursement Policy for this receipt",
                    "amount": 0.0,
                    "column": "others",
                })

    # Serial DB writes — save all receipts as SupportingDocuments
    document_ids: List[str] = []
    for r in llm_results:
        relative_path = f"/storage/documents/{user_id}/{Path(r['file_path']).name}"
        doc = SupportingDocument(
            user_id=UUID(user_id),
            name=r["document_name"],
            path=relative_path,
            type=r["file_type"],
            extracted_data=r["extracted_data"],
        )
        session.add(doc)
        session.flush()
        r["document_id"] = str(doc.document_id)
        document_ids.append(str(doc.document_id))

    user = session.exec(select(User).where(User.user_id == UUID(user_id))).first()
    user_code = user.user_code if user and user.user_code else ""
    department = user.department if user else ""
    rank = user.rank if user else None

    destination = ""
    departure_date = ""
    arrival_date = ""
    location = ""
    overseas = None

    for r in llm_results:
        ed = r["extracted_data"]
        if not destination and ed.get("destination") and ed.get("destination") != _NFIR:
            destination = ed.get("destination")
        if not departure_date and ed.get("departure_date") and ed.get("departure_date") != _NFIR:
            departure_date = ed.get("departure_date")
        if not arrival_date and ed.get("arrival_date") and ed.get("arrival_date") != _NFIR:
            arrival_date = ed.get("arrival_date")
        if not location and ed.get("location") and ed.get("location") != _NFIR:
            location = ed.get("location")
        if overseas is None and ed.get("overseas") is not None:
            overseas = ed.get("overseas")

    # Build aggregated results
    currency = "MYR"
    for r in llm_results:
        c = (r["extracted_data"].get("currency") or "")
        if c and c != _NFIR:
            currency = c
            break

    # Only include receipts without warnings in the template
    receipts = []
    skipped_receipts = []
    totals = {"transportation": 0.0, "accommodation": 0.0, "meals": 0.0, "others": 0.0}

    for r in llm_results:
        ed = r["extracted_data"]
        col = r["column"]
        amt = r["amount"]

        merchant = ed.get("merchant_name") or ""
        summary = ed.get("items_summary") or ""
        description = " - ".join(p for p in [merchant, summary] if p and p != _NFIR) or r["document_name"]

        receipt_entry = {
            "document_id": r.get("document_id", ""),
            "date": ed.get("date") or _NFIR,
            "description": description,
            "category": r["category"],
            "currency": currency,
            "amount": amt,
            "transportation": amt if col == "transportation" else 0.0,
            "accommodation": amt if col == "accommodation" else 0.0,
            "meals": amt if col == "meals" else 0.0,
            "others": amt if col == "others" else 0.0,
            "warnings": r["warnings"],
            "extracted_data": ed,
        }

        if r["warnings"]:
            skipped_receipts.append(receipt_entry)
        else:
            totals[col] += amt
            receipts.append(receipt_entry)

    totals["grand_total"] = sum(totals[k] for k in ["transportation", "accommodation", "meals", "others"])
    totals["currency"] = currency

    all_warnings = [w for r in llm_results for w in r.get("warnings", [])]

    # Collect unique categories (no duplicates, exclude no-policy sentinel)
    _no_policy = "No Reimbursement Policy for this receipt"
    seen_cats: set = set()
    all_category: List[str] = []
    for r in llm_results:
        cat = r["category"]
        if cat and cat != _no_policy and cat not in seen_cats:
            seen_cats.add(cat)
            all_category.append(cat)

    # Derive main_category as the most frequent valid category
    cat_counts: dict = {}
    for r in llm_results:
        cat = r["category"]
        if cat and cat != _no_policy:
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
    main_category = max(cat_counts, key=lambda k: cat_counts[k]) if cat_counts else None

    purpose = ", ".join(categories[:3]) if categories else ""

    employee_context = {
        "name": employee_name,
        "id": user_id,
        "user_code": user_code,
        "department": department,
        "rank": rank,
        "destination": destination,
        "departure_date": departure_date,
        "arrival_date": arrival_date,
        "location": location,
        "overseas": overseas,
        "purpose": purpose,
    }

    # Save TravelSettlement and link SupportingDocuments
    settlement = TravelSettlement(
        all_category=all_category,
        main_category=main_category,
        employee_name=employee_name,
        employee_id=user_id,
        employee_code=user_code,
        employee_department=department,
        employee_rank=rank,
        destination=destination,
        departure_date=departure_date,
        arrival_date=arrival_date,
        location=location,
        overseas=overseas,
        purpose=purpose,
        currency=currency,
        receipts=receipts + skipped_receipts,
        totals=totals,
    )
    session.add(settlement)
    session.flush()

    # Link all SupportingDocuments to this settlement
    doc_uuid_list = [UUID(did) for did in document_ids]
    docs = session.exec(
        select(SupportingDocument).where(SupportingDocument.document_id.in_(doc_uuid_list))
    ).all()
    for doc in docs:
        doc.settlement_id = settlement.settlement_id
        session.add(doc)

    session.commit()
    session.refresh(settlement)

    return {
        "settlement_id": str(settlement.settlement_id),
        "document_ids": document_ids,
        "employee": employee_context,
        "receipts": receipts,
        "skipped_receipts": skipped_receipts,
        "totals": totals,
        "all_warnings": all_warnings,
        "all_category": all_category,
        "main_category": main_category,
    }


# ---------------------------------------------------------------------------
# Backward-compatible single-file wrapper (used by existing API endpoint)
# ---------------------------------------------------------------------------

def run_document_workflow(
    file_path: str,
    file_type: str,
    is_main: bool,
    document_name: str,
    user_id: str,
    employee_name: str,
    session: Session,
) -> dict:
    """Single-file wrapper preserved for backward compatibility."""
    result = process_receipts(
        files=[{"file_path": file_path, "file_type": file_type, "document_name": document_name}],
        user_id=user_id,
        employee_name=employee_name,
        session=session,
    )
    doc_id = result["document_ids"][0] if result["document_ids"] else ""
    first = result["receipts"][0] if result["receipts"] else {}
    return {
        "document_id": doc_id,
        "is_main": True,
        "extracted_data": first.get("extracted_data", {}),
        "warnings": result.get("all_warnings", []),
        "aggregated_results": result,
    }
