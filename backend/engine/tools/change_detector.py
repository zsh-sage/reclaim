from typing import Any, Dict

EDITABLE_FIELDS = {
    "merchant_name", "date", "time", "currency", "total_amount",
    "destination", "departure_date", "arrival_date", "location", "overseas"
}

SEVERITY_MATRIX = {
    "date": "HIGH",
    "total_amount": "HIGH",
    "departure_date": "HIGH",
    "arrival_date": "HIGH",
    "destination": "MEDIUM",
    "currency": "MEDIUM",
    "overseas": "MEDIUM",
    "merchant_name": "LOW",
    "time": "LOW",
    "location": "LOW",
}


def detect_changes(original_extracted_data: dict, human_edits: dict) -> Dict[str, Any]:
    """
    Compare original OCR data with human edits.
    Returns a change summary dict with has_changes, change_count, high_risk_count,
    changes_by_field, and overall_risk.
    """
    changes = {}
    high_risk_count = 0

    for field_name in EDITABLE_FIELDS:
        if field_name not in human_edits:
            continue

        original_val = original_extracted_data.get(field_name)
        edited_val = human_edits[field_name]

        if _values_equal(original_val, edited_val):
            continue

        # Determine severity based on field type and original value
        severity = _compute_severity(field_name, original_val, edited_val)
        if severity == "HIGH":
            high_risk_count += 1

        changes[field_name] = {
            "original": original_val,
            "edited": edited_val,
            "severity": severity,
            "description": _describe_change(field_name, original_val, edited_val),
        }

    has_changes = bool(changes)
    return {
        "has_changes": has_changes,
        "change_count": len(changes),
        "high_risk_count": high_risk_count,
        "changes_by_field": changes,
        "overall_risk": _compute_risk_level(changes),
    }


def _values_equal(v1: Any, v2: Any) -> bool:
    if v1 == v2:
        return True
    sentinel = {"", "Not found in Receipt"}
    if v1 is None and v2 in sentinel:
        return True
    if v2 is None and v1 in sentinel:
        return True
    if isinstance(v1, str) and isinstance(v2, str):
        return v1.strip() == v2.strip()
    if isinstance(v1, bool) or isinstance(v2, bool):
        return bool(v1) == bool(v2)
    return False


def _describe_change(field: str, orig: Any, edited: Any) -> str:
    if field == "total_amount":
        orig_num = float(orig or 0)
        edited_num = float(edited or 0)
        delta = edited_num - orig_num
        sign = "+" if delta >= 0 else ""
        return f"Amount changed from {orig_num:.2f} to {edited_num:.2f} (Δ {sign}{delta:.2f})"
    if field == "date":
        return f"Receipt date adjusted from '{orig}' to '{edited}'"
    if field in ("departure_date", "arrival_date"):
        return f"{field} changed from '{orig}' to '{edited}'"
    return f"{field} changed from '{orig}' to '{edited}'"


def _is_empty_or_missing(value: Any) -> bool:
    """Check if value is empty, null, or 'Not found in Receipt'."""
    if value is None:
        return True
    if isinstance(value, str):
        stripped = value.strip()
        return stripped == "" or stripped == "Not found in Receipt"
    return False


def _is_decimal_issue(orig_num: float, edited_num: float) -> bool:
    """
    Detect if amount change looks like a decimal point or placement issue.
    Focuses on specific OCR artifacts where decimals are misplaced.
    Examples (should return True):
      - 100.4 -> 10.04 (misplaced decimal: should be 10.04, OCR read 100.4)
      - 500 -> 5.00 (missing decimal: should be 5.00, OCR read 500)
      - 1000 -> 10.00 (missing decimal position)
    """
    if orig_num == 0 or edited_num == 0:
        return False

    ratio = edited_num / orig_num if orig_num != 0 else 0

    # Pattern 1: Original has single decimal digit AND result < 100 (e.g., 100.4 -> 10.04)
    # This strongly suggests OCR misread the decimal
    orig_str = str(orig_num)
    if "." in orig_str:
        decimal_part = orig_str.split(".")[1]
        # If original had exactly 1 decimal digit and ratio is ~0.1 and result is small
        if (len(decimal_part) == 1 and 
            abs(ratio - 0.1) < 0.05 and 
            edited_num < 100):
            return True
    
    # Pattern 2: Large round numbers dropping to small amounts (e.g., 500->5, 1000->10)
    # This suggests a decimal point was misplaced/missing
    if orig_num >= 100 and 0 < edited_num < 100 and abs(ratio - 0.01) < 0.02:
        return True
    
    return False


def _compute_severity(field_name: str, original_val: Any, edited_val: Any) -> str:
    """
    Compute severity for a field change, considering OCR reliability.
    
    Rules:
    - Non-amount fields: LOW if original was empty/null/"Not found in Receipt", else SEVERITY_MATRIX
    - Amount: MEDIUM if looks like decimal issue, else HIGH
    """
    if field_name == "total_amount":
        try:
            orig_num = float(original_val or 0)
            edited_num = float(edited_val or 0)
            if _is_decimal_issue(orig_num, edited_num):
                return "MEDIUM"
            return "HIGH"
        except (ValueError, TypeError):
            return "HIGH"
    
    # For non-amount fields, check if original was empty
    if _is_empty_or_missing(original_val):
        return "LOW"
    
    # Use base severity from matrix
    return SEVERITY_MATRIX.get(field_name, "LOW")


def _compute_risk_level(changes: dict) -> str:
    if not changes:
        return "NONE"
    if any(c["severity"] == "HIGH" for c in changes.values()):
        return "HIGH"
    if any(c["severity"] == "MEDIUM" for c in changes.values()):
        return "MEDIUM"
    return "LOW"
