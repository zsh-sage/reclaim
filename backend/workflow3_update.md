# Workflow 3 — Compliance Agent Redesign

**Status:** Implemented  
**Date:** 2026-04-24  
**Scope:** `backend/engine/agents/compliance_agent.py`, `backend/engine/tools/compliance_tools.py`, `backend/engine/prompts/compliance_prompts.py`

---

## Problems Being Solved

| # | Issue | Root Cause |
|---|-------|------------|
| 1 | Policy search ignores stored embeddings | `search_policy_rag` does keyword matching; never calls embedding model |
| 2 | Single monolithic LLM reasons over all receipts at once | Hard to get accurate audit_notes per receipt; grows unbounded with receipt count |
| 3 | Tool-call limit enforced by injecting a message post-hoc | LLM may still attempt calls; no graph-level enforcement |
| 4 | Human edit metadata loaded but never clearly surfaced in the prompt | `change_summary` / `editable_fields` sit in DB; LLM gets vague context |
| 5 | Line items, totals, and judgment are all one LLM output | LLM does math (unreliable) and synthesis in the same pass |

---

## New Graph Architecture

```
load_context
    │
    ▼
analyze_receipts          ← parallel per-receipt ReAct loops (ThreadPoolExecutor)
    │
    ▼
aggregate_totals          ← pure Python, no LLM
    │
    ▼
final_judgment            ← single LLM with tools, produces overall verdict
    │
    ▼
save_reimbursement
```

---

## Node-by-Node Design

### Node 1 — `load_context` (modified)

**Current behaviour:** loads user, policy, receipts, mandatory conditions, human edits.  
**Changes:**
- For each SupportingDocument, merge `editable_fields` over `extracted_data` so downstream nodes always see the final effective receipt values.
- Attach a `_human_edit` block to each receipt dict:
  ```python
  receipt["_human_edit"] = {
      "has_changes": doc.human_edited,
      "overall_risk": doc.change_summary.get("overall_risk", "NONE"),
      "changes_by_field": doc.change_summary.get("changes_by_field", {})
  }
  ```
- Source: `SupportingDocument.human_edited`, `.editable_fields`, `.change_summary` (pre-computed by `detect_changes()` in `documents.py:331-381`).

### Node 2 — `analyze_receipts` (new, replaces monolithic `agent` node)

- Spawn one task per receipt using `ThreadPoolExecutor(max_workers=4)`.
- Each task runs a **per-receipt ReAct loop** via LangGraph subgraph (or direct `create_react_agent`).
- Each per-receipt agent receives:
  - Employee: rank, department, currency
  - Single receipt dict (merged view, with `_human_edit` block)
  - Mandatory conditions (pre-filtered to the receipt's category)
  - System instructions (see `RECEIPT_ANALYSIS_PROMPT` below)
- Tools available: `get_current_date`, `search_policy_rag`
- **Tool-call limit:** 5 per receipt — enforced via `tool_call_count` field in per-receipt state + conditional edge that routes to `force_output` if `tool_call_count >= 5`.
- Each per-receipt agent outputs one `ReceiptLineItem`:
  ```json
  {
    "receipt_id": "uuid",
    "merchant": "str",
    "date": "YYYY-MM-DD",
    "category": "str",
    "claimed_amount": 0.00,
    "approved_amount": 0.00,
    "compliance_flag": "APPROVE | FLAG | REJECT",
    "audit_notes": ["note1", "note2"],
    "human_edit_risk": "NONE | LOW | MEDIUM | HIGH",
    "risk_summary": "brief explanation of the risk or none if no risk"
  }
  ```

### Node 3 — `aggregate_totals` (new, pure Python)

No LLM call. Computes:
```python
totals = {
    "gross_claimed": sum(item.claimed_amount for item in line_items),
    "net_approved":  sum(item.approved_amount for item in line_items),
    "by_category": defaultdict(lambda: {"claimed": 0, "approved": 0}),
}
for item in line_items:
    totals["by_category"][item.category]["claimed"] += item.claimed_amount
    totals["by_category"][item.category]["approved"] += item.approved_amount
```

### Node 4 — `final_judgment` (replaces `build_judgment`)

- Single LLM call with full line_items list + aggregated totals.
- Tools available (for edge-case lookups): `get_current_date`, `search_policy_rag`.
- Tool-call limit: 3 (graph-level enforcement same pattern as per-receipt).
- Output JSON:
  ```json
  {
    "overall_judgment": "APPROVE | FLAG | MANUAL REVIEW",
    "confidence": 0.85,
    "summary": "brief narrative"
  }
  ```
- Merged with line_items + totals before `save_reimbursement`.

### Node 5 — `save_reimbursement` (minimal change)

- Write `Reimbursement` row with `line_items`, `totals`, `judgment`, `confidence`, `summary`.
- No logic change — just ensure field mapping matches new output shape.

---

## Tool Changes — `compliance_tools.py`

### `search_policy_rag(query, policy_id, session)` — full rewrite

Current: keyword ILIKE scan on PolicySection.content.  
New: semantic embedding search via pgvector.

```
1. Call OpenRouter embeddings API with `query` string
   → model: text-embedding-3-small (or whatever is in config)
   → returns vector of dim 1536

2. SQL (raw or SQLAlchemy):
   SELECT content
   FROM policy_sections
   WHERE policy_id = :policy_id
   ORDER BY embedding <=> :query_vector   -- pgvector cosine
   LIMIT 5;

3. Return joined content string.
   Fallback on OpenRouter error: ILIKE keyword scan (current behaviour).
```

Config keys needed in `core/config.py`:
- `OPENROUTER_API_KEY` (already present)
- `OPENROUTER_EMBEDDING_MODEL` (add if not present, default `"text-embedding-3-small"`)

### `get_current_date()` — no change

---

## Prompt Changes — `compliance_prompts.py`

### RECEIPT_ANALYSIS_PROMPT (new)

Covers one receipt. Key sections:

```
Employee context: rank={rank}, department={dept}, currency={currency}

Receipt data:
{receipt_json}

Human edits (if any):
  Overall risk: {overall_risk}
  Changed fields:
    - {field}: {original} → {edited}  [Severity: HIGH]
    ...

Mandatory conditions applicable to this receipt:
{conditions_json}

Your task:
1. Check the submission date against today's date (use get_current_date tool). Check the maximum submit date from the policy (use search_policy_rag tool).
2. Check whether this category is eligible for reimbursement (use search_policy_rag).
3. Check rank-based or category-based amount caps (use search_policy_rag).
4. Assess human edit risk — if overall_risk is HIGH, reduce confidence signal.
5. Return ONLY the JSON below. No prose outside the JSON block.

{output_schema_json}

You may call tools up to 5 times. Use tools only when you need policy facts
you do not already have from context.
```

### FINAL_JUDGMENT_PROMPT (new)

```
All receipts have been individually analyzed. Below are the line items and totals.

Line items:
{line_items_json}

Aggregated totals:
{totals_json}

Policy overview:
{policy_overview}

Your task:
Produce an overall judgment for this travel claim.
- APPROVE: all receipts compliant, no high risks.
- FLAG: minor issues, likely approvable with reviewer note.
- MANUAL REVIEW: policy violations, HIGH human-edit risk, or conflicting signals.

Return ONLY:
{
  "overall_judgment": "...",
  "confidence": 0.0-1.0,
  "summary": "2-3 sentence plain-English summary for the approver"
}
```

---

## Human Edit Integration (issue #4 detail)

**Data flow:**
```
SupportingDocument.change_summary   →  load_context enriches receipt dict
                                    →  RECEIPT_ANALYSIS_PROMPT renders _human_edit block
                                    →  LLM sees: field, original, edited, severity
                                    →  LLM produces: human_edit_risk in ReceiptLineItem
                                    →  final_judgment sees human_edit_risk per receipt
                                    →  summary reflects edit risk narrative
```

Fields used (all pre-computed by `detect_changes()` in `change_detector.py`):
- `change_summary.overall_risk` → injected as-is into prompt
- `change_summary.changes_by_field` → rendered per-field with original/edited/severity
- `document.editable_fields` → merged over extracted_data so approved_amount math is on corrected values

---

## Tool-Call Limit Enforcement (issue #3)

Replace the current message-injection hack with graph-level enforcement:

```python
# In per-receipt state
class ReceiptAgentState(TypedDict):
    messages: list
    tool_call_count: int   # incremented in tools node

# Conditional edge after tools node
def route_receipt_agent(state: ReceiptAgentState):
    if state["tool_call_count"] >= 5:
        return "force_output"   # node that sends final "produce JSON now" message
    last = state["messages"][-1]
    if last.tool_calls:
        return "tools"
    return "parse_output"
```

Same pattern for `final_judgment` with limit = 3.

---

## Files to Modify

| File | Changes |
|------|---------|
| `engine/agents/compliance_agent.py` | Full rewrite of graph: add `analyze_receipts`, `aggregate_totals`, `final_judgment` nodes; enforce tool limits in state; parallelize with ThreadPoolExecutor |
| `engine/tools/compliance_tools.py` | Rewrite `search_policy_rag` to use OpenRouter embeddings + pgvector; add embedding fallback |
| `engine/prompts/compliance_prompts.py` | Replace `AGENT_EVALUATION_PROMPT` with `RECEIPT_ANALYSIS_PROMPT` + `FINAL_JUDGMENT_PROMPT` |
| `core/config.py` | Add `OPENROUTER_EMBEDDING_MODEL` setting if missing |

**Do not modify:** `change_detector.py`, `models.py`, `documents.py` — these are correct and reused as-is.

---

## Verification Plan

1. **Unit: embedding search**  
   - Upload a policy, verify PolicySection rows have embedding vectors in DB.  
   - Call `search_policy_rag("amount limit for rank 5")` directly; confirm it returns relevant content.

2. **Unit: human edit injection**  
   - Edit a receipt via `POST /{document_id}/edits` (change total_amount).  
   - Call `load_context`; assert `_human_edit.overall_risk == "HIGH"` and `changes_by_field` has the amount change.

3. **Integration: per-receipt analysis**  
   - Submit a settlement with 2 receipts: one within 90 days, one outside.  
   - Assert line_items has two entries; the late one has `compliance_flag = "FLAG"` and audit_note mentioning 90-day rule.

4. **Integration: totals**  
   - Assert `totals.gross_claimed == sum of all claimed_amount` (Python math, exact).  
   - Assert `totals.net_approved <= totals.gross_claimed`.

5. **End-to-end: full workflow**  
   - `POST /api/v1/reimbursements/analyze` with a real settlement_id.  
   - Check Reimbursement row in DB: `judgment`, `confidence`, `summary`, `line_items` all populated.  
   - Run `docker exec -it reclaim_db psql -U admin -d smart_reimburse -c "SELECT judgment, confidence, summary FROM reimbursements ORDER BY created_at DESC LIMIT 1;"`
