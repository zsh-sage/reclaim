# Human Receipt Edits with Compliance Detection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow employees to edit OCR-extracted receipt fields post-upload while preserving original data, tracking change severity, and feeding that context to the compliance agent for confidence-adjusted re-evaluation.

**Architecture:** Three new DB columns on `SupportingDocument` hold human-edited values, a boolean edit flag, and a pre-computed change severity summary. A new `change_detector.py` module computes the diff; a new `POST /documents/{id}/edits` endpoint accepts edits; `load_context()` in the compliance agent enriches receipts with edit metadata; and `POST /reimbursements/analyze` returns a cached result when no edits have been made.

**Tech Stack:** FastAPI, SQLModel, PostgreSQL (JSONB), LangGraph, Python 3.11+

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/core/models.py` | Modify | Add 3 new fields to `SupportingDocument` |
| `backend/engine/tools/change_detector.py` | Create | Diff logic, severity matrix, risk aggregation |
| `backend/api/documents.py` | Modify | Add `POST /{document_id}/edits` endpoint |
| `backend/engine/agents/compliance_agent.py` | Modify | `load_context()` enriches receipts with human edit context |
| `backend/engine/prompts/compliance_prompts.py` | Modify | Add human-edit instructions to evaluation prompt |
| `backend/api/reimbursements.py` | Modify | Cache check — skip re-evaluation if no edits |

---

### Task 1: DB Model — Add 3 new fields to SupportingDocument

**Files:**
- Modify: `backend/core/models.py`

- [ ] **Step 1: Add the three new fields to SupportingDocument**

In `backend/core/models.py`, add to the `SupportingDocument` class after the `extracted_data` field (line 143):

```python
    editable_fields: dict = Field(
        default={},
        sa_column=Column(JSONB),
    )
    human_edited: bool = Field(
        default=False,
        sa_column=Column(Boolean),
    )
    change_summary: dict = Field(
        default={},
        sa_column=Column(JSONB),
    )
```

The full `SupportingDocument` class should look like:

```python
class SupportingDocument(SQLModel, table=True):
    __tablename__ = "supporting_documents"

    document_id: UUID = Field(default_factory=uuid4, primary_key=True)
    reim_id: Optional[UUID] = Field(default=None, foreign_key="reimbursements.reim_id")
    settlement_id: Optional[UUID] = Field(default=None, foreign_key="travel_settlements.settlement_id")
    user_id: UUID = Field(foreign_key="employees.user_id")
    name: str = Field(sa_column=Column(Text))
    path: str = Field(sa_column=Column(String))
    type: str = Field(sa_column=Column(String))
    is_main: bool = Field(default=True, sa_column=Column(Boolean))
    document_class: str = Field(default="RECEIPT", sa_column=Column(String))
    extracted_data: dict = Field(default={}, sa_column=Column(JSONB))
    editable_fields: dict = Field(default={}, sa_column=Column(JSONB))
    human_edited: bool = Field(default=False, sa_column=Column(Boolean))
    change_summary: dict = Field(default={}, sa_column=Column(JSONB))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True))
    )
```

- [ ] **Step 2: Run DB migration to add the 3 columns**

```bash
docker exec -it reclaim_db psql -U admin -d smart_reimburse -c "ALTER TABLE supporting_documents ADD COLUMN IF NOT EXISTS editable_fields JSONB DEFAULT '{}';"
docker exec -it reclaim_db psql -U admin -d smart_reimburse -c "ALTER TABLE supporting_documents ADD COLUMN IF NOT EXISTS human_edited BOOLEAN DEFAULT FALSE;"
docker exec -it reclaim_db psql -U admin -d smart_reimburse -c "ALTER TABLE supporting_documents ADD COLUMN IF NOT EXISTS change_summary JSONB DEFAULT '{}';"
```

Expected output (for each): `ALTER TABLE`

- [ ] **Step 3: Verify columns exist**

```bash
docker exec -it reclaim_db psql -U admin -d smart_reimburse -c "\d supporting_documents"
```

Expected: Three new rows `editable_fields`, `human_edited`, `change_summary` appear in the column list.

- [ ] **Step 4: Commit**

```bash
git add backend/core/models.py
git commit -m "feat(models): add editable_fields, human_edited, change_summary to SupportingDocument"
```

---

### Task 2: Change Detector Module

**Files:**
- Create: `backend/engine/tools/change_detector.py`

- [ ] **Step 1: Create the change_detector.py file**

Create `backend/engine/tools/change_detector.py` with the full content below:

```python
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

        severity = SEVERITY_MATRIX.get(field_name, "LOW")
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


def _compute_risk_level(changes: dict) -> str:
    if not changes:
        return "NONE"
    if any(c["severity"] == "HIGH" for c in changes.values()):
        return "HIGH"
    if any(c["severity"] == "MEDIUM" for c in changes.values()):
        return "MEDIUM"
    return "LOW"
```

- [ ] **Step 2: Quick smoke test in Python REPL**

From `backend/` directory:

```bash
cd "C:/Main Storage/Programming/Hackathon/um_hackathon_bogosort/reclaim/backend"
uv run python -c "
from engine.tools.change_detector import detect_changes

# LOW risk: typo fix
r = detect_changes({'merchant_name': 'Mariot', 'total_amount': 500}, {'merchant_name': 'Marriott'})
assert r['has_changes'] == True
assert r['overall_risk'] == 'LOW'
assert r['changes_by_field']['merchant_name']['severity'] == 'LOW'

# HIGH risk: amount change
r2 = detect_changes({'total_amount': 500}, {'total_amount': 750})
assert r2['has_changes'] == True
assert r2['overall_risk'] == 'HIGH'
assert r2['high_risk_count'] == 1

# No change: same value
r3 = detect_changes({'merchant_name': 'Mariot'}, {'merchant_name': 'Mariot'})
assert r3['has_changes'] == False

print('All assertions passed')
"
```

Expected output: `All assertions passed`

- [ ] **Step 3: Commit**

```bash
git add backend/engine/tools/change_detector.py
git commit -m "feat(tools): add change_detector with field severity matrix"
```

---

### Task 3: Edit Endpoint — POST /documents/{document_id}/edits

**Files:**
- Modify: `backend/api/documents.py`

- [ ] **Step 1: Add the edit endpoint to documents.py**

At the end of `backend/api/documents.py`, add:

```python
from engine.tools.change_detector import detect_changes, EDITABLE_FIELDS


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
```

Also add the import for `detect_changes` and `EDITABLE_FIELDS` at the top of the file. The existing imports block should get:

```python
from engine.tools.change_detector import detect_changes, EDITABLE_FIELDS
```

- [ ] **Step 2: Verify the server starts without errors**

```bash
cd "C:/Main Storage/Programming/Hackathon/um_hackathon_bogosort/reclaim/backend"
uv run uvicorn main:app --port 8001 --no-access-log &
sleep 3
curl -s http://localhost:8001/health | python -c "import sys,json; d=json.load(sys.stdin); print(d)"
kill %1
```

Expected: `{'status': 'healthy', 'database': 'connected'}` (or similar).

- [ ] **Step 3: Commit**

```bash
git add backend/api/documents.py
git commit -m "feat(api): add POST /documents/{id}/edits endpoint for receipt field corrections"
```

---

### Task 4: Compliance Agent — Inject Human Edit Context into load_context()

**Files:**
- Modify: `backend/engine/agents/compliance_agent.py`

- [ ] **Step 1: Update the load_context() function to enrich receipts with human edit data**

In `backend/engine/agents/compliance_agent.py`, find the `load_context` function. After the block that loads `receipts` from the settlement (lines ~118–127), and before the `# Fallback: derive currency` comment, add the following block:

```python
    # Enrich receipts with human edit context if any documents were edited
    if receipts and state.get("settlement_id"):
        docs = session.exec(
            select(SupportingDocument).where(
                SupportingDocument.settlement_id == UUID(state["settlement_id"])
            )
        ).all()
        doc_map = {str(d.document_id): d for d in docs}
        for receipt in receipts:
            doc_id = receipt.get("document_id")
            if doc_id and doc_id in doc_map:
                doc = doc_map[doc_id]
                if doc.human_edited:
                    receipt["human_edits"] = {
                        "editable_fields": doc.editable_fields,
                        "change_summary": doc.change_summary,
                    }
```

The full updated `load_context` function should be:

```python
def load_context(state: ComplianceWorkflowState, session: Session) -> dict:
    """Load user, policy, and TravelSettlement basket from the database."""
    user = session.get(User, UUID(state["user_id"]))
    policy = session.get(Policy, UUID(state["policy_id"]))

    try:
        conditions_dict = (
            json.loads(policy.mandatory_conditions)
            if policy and policy.mandatory_conditions
            else {}
        )
    except (json.JSONDecodeError, TypeError):
        conditions_dict = {}

    all_category = state.get("all_category") or []
    receipts: List[dict] = []
    currency = ""

    if state.get("settlement_id"):
        try:
            settlement = session.get(TravelSettlement, UUID(state["settlement_id"]))
            if settlement:
                if not all_category:
                    all_category = settlement.all_category or []
                receipts = settlement.receipts or []
                currency = settlement.currency or ""
        except Exception:
            pass

    # Enrich receipts with human edit context if any documents were edited
    if receipts and state.get("settlement_id"):
        docs = session.exec(
            select(SupportingDocument).where(
                SupportingDocument.settlement_id == UUID(state["settlement_id"])
            )
        ).all()
        doc_map = {str(d.document_id): d for d in docs}
        for receipt in receipts:
            doc_id = receipt.get("document_id")
            if doc_id and doc_id in doc_map:
                doc = doc_map[doc_id]
                if doc.human_edited:
                    receipt["human_edits"] = {
                        "editable_fields": doc.editable_fields,
                        "change_summary": doc.change_summary,
                    }

    if not currency and receipts:
        currency = receipts[0].get("currency", "") or ""
    if currency == "Not found in Receipt":
        currency = ""

    combined_conditions: List[str] = []
    seen: set = set()
    for cat in all_category:
        cat_data = conditions_dict.get(cat) or {}
        if not cat_data:
            matched_key = next(
                (k for k in conditions_dict if k.lower() == cat.lower()), None
            )
            cat_data = conditions_dict[matched_key] if matched_key else {}
        for cond in cat_data.get("condition", []):
            if cond not in seen:
                seen.add(cond)
                combined_conditions.append(cond)

    policy_sections_text = search_policy_sections(
        policy_id=state["policy_id"],
        session=session,
        keywords=all_category + [state.get("main_category", ""), "amount", "limit", "rate", "maximum", "cap"],
    )

    return {
        "user": user,
        "policy": policy,
        "receipts": receipts,
        "all_category": all_category,
        "combined_conditions": combined_conditions,
        "policy_sections_text": policy_sections_text,
        "currency": currency,
        "messages": [],
        "line_items": [],
        "totals": {},
        "judgment": "",
        "confidence": 0.0,
        "summary": "",
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/engine/agents/compliance_agent.py
git commit -m "feat(agent): inject human edit context into compliance load_context"
```

---

### Task 5: Compliance Prompt — Add Human Edit Instructions

**Files:**
- Modify: `backend/engine/prompts/compliance_prompts.py`

- [ ] **Step 1: Replace the AGENT_EVALUATION_PROMPT with the human-edit-aware version**

Replace the entire contents of `backend/engine/prompts/compliance_prompts.py` with:

```python
AGENT_EVALUATION_PROMPT = """You are an expert HR Reimbursement Compliance Officer evaluating a Travel Settlement basket.

Employee: {employee_name} | Department: {department} | Rank: {rank}
All Expense Categories in this Settlement: {all_category}
Currency: {currency}
Today's Date: {{today}}

--- Policy Overview ---
{policy_overview}

--- Policy Effective Date ---
{effective_date}

--- Mandatory Conditions (all applicable categories) ---
{conditions}

--- Policy Text Excerpts (use these for rank-based limits, rate caps, per-night caps, etc.) ---
{policy_sections}

--- Receipt Basket (JSON array of extracted receipt data) ---
{receipts_json}

---

You have access to tools:
- `get_current_date`: Call this to confirm today's date for the 90-day late-submission policy check.
- `search_policy_rag(query)`: Call this to look up specific policy conditions you are uncertain about (e.g. rank limits, per diem rates, category eligibility).

Instructions:
1. Evaluate EVERY receipt in the basket individually.
2. For each receipt, check:
   a. **Late Submission**: Is the receipt date more than 90 days before today? If so, tag [LATE_SUBMISSION] and REJECT.
   b. **Category Eligibility**: Is the category reimbursable under the policy?
   c. **Amount Limits**: Does the requested amount exceed rank-based caps or nightly limits? Apply PARTIAL_APPROVE with deductions if so, tagging [OVER_LIMIT].
   d. **Mandatory Conditions**: Does the receipt satisfy all applicable mandatory conditions?
   e. **HUMAN EDITS** (if "human_edits" key is present in the receipt JSON):
      - If change_summary.overall_risk == "HIGH":
        * Add audit note: [HUMAN_EDIT_HIGH_RISK] with the change description.
        * Reduce your confidence by 0.15 to 0.25 depending on the number of HIGH risk edits.
        * Set status to PARTIAL_APPROVE and add [MANUAL_REVIEW_REQUIRED] tag.
      - If change_summary.overall_risk == "MEDIUM":
        * Add audit note: [HUMAN_EDIT_MEDIUM] with the change description.
        * Reduce your confidence by 0.05 to 0.15.
      - If change_summary.overall_risk == "LOW":
        * Add audit note: [HUMAN_EDIT] with the change description (informational only).
        * No confidence reduction.
3. Compute totals across all line items.
4. Determine an overall_judgment: APPROVE (all approved), REJECT (all rejected), or PARTIAL_APPROVE (mixed).
5. Provide a confidence score (0.0–1.0) and a brief summary.

Return ONLY a valid JSON object with exactly this structure (no markdown, no extra keys):
{{
  "line_items": [
    {{
      "document_id": "<uuid from receipt data, or 'unknown' if missing>",
      "date": "<YYYY-MM-DD>",
      "category": "<category string>",
      "description": "<merchant / description>",
      "status": "APPROVED | REJECTED | PARTIAL_APPROVE",
      "requested_amount": <float>,
      "approved_amount": <float>,
      "deduction_amount": <float>,
      "audit_notes": [
        {{"tag": "[TAG]", "message": "Explanation."}}
      ]
    }}
  ],
  "totals": {{
    "total_requested": <float>,
    "total_deduction": <float>,
    "net_approved": <float>
  }},
  "overall_judgment": "APPROVE | REJECT | PARTIAL_APPROVE",
  "confidence": <float 0.0–1.0>,
  "summary": "<2-3 sentence explanation of the overall decision>"
}}
"""
```

- [ ] **Step 2: Commit**

```bash
git add backend/engine/prompts/compliance_prompts.py
git commit -m "feat(prompts): add human edit awareness to compliance evaluation prompt"
```

---

### Task 6: Reimbursements API — Cache Check

**Files:**
- Modify: `backend/api/reimbursements.py`

- [ ] **Step 1: Update the analyze endpoint to check for human edits before running**

Replace the `analyze_reimbursement` function body in `backend/api/reimbursements.py` with the version below. The function signature stays the same; only the body changes.

```python
@router.post("/analyze")
def analyze_reimbursement(
    request: AnalyzeReimbursementRequest,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> dict:
    """Run basket compliance analysis on a TravelSettlement against a policy."""
    try:
        settlement_uuid = UUID(request.settlement_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid settlement_id: {request.settlement_id}",
        )

    settlement = db.get(TravelSettlement, settlement_uuid)
    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Settlement {request.settlement_id} not found",
        )

    # Cache check: if settlement was already evaluated and no receipts were edited, return cached result
    has_edits = bool(
        db.exec(
            select(SupportingDocument).where(
                SupportingDocument.settlement_id == settlement_uuid,
                SupportingDocument.human_edited == True,  # noqa: E712
            )
        ).first()
    )

    if not has_edits and settlement.reimbursement_id:
        cached = db.get(Reimbursement, settlement.reimbursement_id)
        if cached:
            return {
                "reim_id": str(cached.reim_id),
                "settlement_id": str(cached.settlement_id) if cached.settlement_id else None,
                "judgment": cached.judgment,
                "status": cached.status,
                "summary": cached.summary,
                "line_items": cached.line_items,
                "totals": cached.totals,
                "confidence": cached.confidence,
                "currency": cached.currency,
                "main_category": cached.main_category,
                "sub_category": cached.sub_category,
                "created_at": cached.created_at.isoformat() if cached.created_at else None,
                "cached": True,
                "message": "Using cached result (no human edits detected)",
            }

    all_category = request.all_category
    if not all_category:
        all_category = settlement.all_category or []
    if not all_category:
        all_category = [request.main_category] if request.main_category else []

    try:
        result = run_compliance_workflow(
            settlement_id=request.settlement_id,
            policy_id=request.policy_id,
            main_category=request.main_category,
            sub_category=request.sub_category,
            user_id=str(current_user.user_id),
            all_category=all_category,
            session=db,
            document_ids=request.document_ids,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compliance workflow failed: {e}")

    if result.get("reimbursement_id"):
        reim = db.get(Reimbursement, UUID(result["reimbursement_id"]))
        if reim:
            return {
                "reim_id": str(reim.reim_id),
                "settlement_id": str(reim.settlement_id) if reim.settlement_id else None,
                "judgment": reim.judgment,
                "status": reim.status,
                "summary": reim.summary,
                "line_items": reim.line_items,
                "totals": reim.totals,
                "confidence": reim.confidence,
                "currency": reim.currency,
                "main_category": reim.main_category,
                "sub_category": reim.sub_category,
                "created_at": reim.created_at.isoformat() if reim.created_at else None,
                "cached": False,
                "message": "Re-evaluated due to human edits" if has_edits else "First-time evaluation",
            }

    return {**result, "cached": False, "message": "First-time evaluation"}
```

- [ ] **Step 2: Commit**

```bash
git add backend/api/reimbursements.py
git commit -m "feat(api): add cache check in /reimbursements/analyze — skip re-evaluation if no edits"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Confirm Docker DB is running**

```bash
docker exec -it reclaim_db psql -U admin -d smart_reimburse -c "SELECT column_name FROM information_schema.columns WHERE table_name='supporting_documents' AND column_name IN ('editable_fields','human_edited','change_summary');"
```

Expected: 3 rows returned.

- [ ] **Step 2: Start the server and verify Swagger shows new endpoint**

```bash
cd "C:/Main Storage/Programming/Hackathon/um_hackathon_bogosort/reclaim/backend"
uv run uvicorn main:app --port 8000 --reload
```

Navigate to `http://localhost:8000/docs` and confirm `POST /api/v1/documents/{document_id}/edits` is listed.

- [ ] **Step 3: Final commit if any leftover files**

```bash
git status
# If any files remain unstaged:
git add -A
git commit -m "chore: finalize human receipt edits feature"
```
