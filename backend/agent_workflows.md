# Reclaim — Agent Workflow Documentation

> **Last updated:** 2026-04-25  
> **Stack:** FastAPI · LangChain · LangGraph · PostgreSQL (pgvector) · SQLModel

---

## Table of Contents

1. [Overview](#overview)
2. [Workflow 1 — Policy Ingestion Agent](#workflow-1--policy-ingestion-agent)
3. [Workflow 2 — Multi-Receipt OCR Agent](#workflow-2--multi-receipt-ocr-agent)
4. [Workflow 3 — Compliance Basket Evaluation Agent](#workflow-3--compliance-basket-evaluation-agent)
5. [Shared Infrastructure](#shared-infrastructure)
6. [Database Schema Quick Reference](#database-schema-quick-reference)

---

## Overview

Reclaim processes HR reimbursement claims through three sequential agent workflows:

```
[HR uploads policy PDF]
        ↓ Workflow 1
[Policy stored + conditions extracted + sections embedded for RAG]

[Employee uploads receipts]
        ↓ Workflow 2
[TravelSettlement created with receipts basket]

[HR/Employee triggers compliance check]
        ↓ Workflow 3
[Reimbursement record created with line_items + totals]
```

Each workflow is exposed as a FastAPI router and can be exercised from the demo page at `/test/demo`.

---

## Workflow 1 — Policy Ingestion Agent

**Router:** `backend/api/policies.py`  
**Agent:** `backend/engine/agents/policy_agent.py`  
**Prompt:** `backend/engine/prompts/policy_prompts.py`

### Purpose

Accepts one or more HR policy PDF files, extracts structured metadata via an LLM, persists the policy record, then embeds all policy section chunks into pgvector for RAG retrieval in Workflow 3.

### API Endpoint

```
POST /api/v1/policies/upload
Content-Type: multipart/form-data

Fields:
  alias   (str)         – Human-readable label e.g. "Business Travel Policy 2024"
  files   (File[])      – One or more .pdf files
```

**Requires:** HR role JWT.

### Processing Pipeline (5 nodes)

```
PDF files
  │
  ├─ Node 1: process_pdfs
  │   pymupdf4llm.to_markdown() per file → markdown text
  │   (image placeholders substituted: ![...](...) → [IMAGE - OCR not available])
  │
  ├─ Node 2: extract_categories_and_summary
  │   Input: combined markdown (≤80,000 chars) + POLICY_CATEGORY_SUMMARY_PROMPT
  │   LLM: GLM-5.1 (JSON mode)
  │   Output: title, reimbursable_category[], overview_summary
  │
  ├─ Node 3: extract_conditions
  │   Input: categories[] + combined markdown (≤80,000 chars) + POLICY_CONDITIONS_PROMPT
  │   LLM: GLM-5.1 (JSON mode)
  │   Output: mandatory_procedures dict (keyed by category)
  │
  ├─ Node 4: save_to_db
  │   Writes: Policy row (status=ACTIVE)
  │   Returns: policy_id
  │
  └─ Node 5: embed_and_save_sections
      Splits each markdown doc into ~1000-char chunks via MarkdownTextSplitter
      (short docs ≤1500 chars kept as single chunk)
      Batch-embeds all chunks: text-embedding-3-small via OpenRouter (1536 dims)
      Writes: PolicySection rows linked to policy_id
      (each row: content, metadata_data {source_file, chunk_index}, embedding vector)
```

### Output

```json
{
  "policy_id": "uuid",
  "title": "Business Travel and Expense Policy",
  "alias": "Business Travel Policy 2024",
  "reimbursable_category": ["meals", "accommodation", "transportation"],
  "overview_summary": "...",
  "effective_date": "2024-01-01T00:00:00Z",
  "status": "ACTIVE"
}
```

### DB Tables Written

| Table | Description |
|-------|-------------|
| `policies` | One row per uploaded policy (title, categories, conditions, status) |
| `policy_sections` | Chunked markdown sections with 1536-dim embeddings for RAG |

---

## Workflow 2 — Multi-Receipt OCR Agent

**Router:** `backend/api/documents.py`  
**Agent:** `backend/engine/agents/document_agent.py`  
**Prompts:** `backend/engine/prompts/document_prompts.py`

### Purpose

Accepts one or more receipt files (images or PDFs) and runs parallel OCR via the Vision LLM (images) or Text LLM (PDFs). Results are aggregated into a `TravelSettlement` basket ready for Workflow 3.

### API Endpoint

```
POST /api/v1/documents/upload
Content-Type: multipart/form-data

Fields:
  files   (File[])  – JPEG / PNG / WEBP / PDF receipt files
```

**Requires:** Any authenticated user JWT.

### Processing Pipeline

```
Files[]
  │
  ├─ Active categories fetched from DB (ACTIVE policies)
  │
  ├─ Parallel LLM calls — ThreadPoolExecutor (max 4 workers, no DB access in workers)
  │   │
  │   ├─ [Image: .jpg/.png/.webp]         ├─ [PDF: .pdf]
  │   │   Vision LLM (Llama 3.2 Vision)   │   pymupdf4llm → Markdown (≤8000 chars)
  │   │   base64-encoded image payload     │   Text LLM (GLM-5.1 JSON mode)
  │   │   RECEIPT_OCR_PROMPT_WITH_CATEGORIES                              │
  │   │                                    RECEIPT_OCR_PROMPT_WITH_CATEGORIES
  │   │
  │   └─ Per receipt: extract fields, detect warnings, map to expense column
  │        Columns: transportation | accommodation | meals | others
  │        (Keyword-based mapper; unrecognised → others)
  │
  ├─ Serial DB writes (after all LLM calls complete):
  │    SupportingDocument row per file (with extracted_data JSON)
  │
  ├─ User context enrichment:
  │    Fetch User row for user_code, department, rank
  │    Derive destination/dates/location from first non-null receipt fields
  │
  └─ Aggregate into TravelSettlement:
       receipts[]          – valid receipts (no warnings)
       skipped_receipts[]  – receipts with warnings
       totals{}            – per-column subtotals + grand_total + currency
       all_category[]      – unique expense categories found (no sentinels)
       main_category       – most frequent valid category
```

### Readability Check

A receipt is considered **unreadable** (moved to `skipped_receipts`) if all of these fields are absent/null/`"Not found in Receipt"`: `merchant_name`, `date`, `total_amount`, `currency`, `receipt_number`, `items_summary`.

### Output

```json
{
  "settlement_id": "uuid",
  "document_ids": ["uuid", "uuid", "..."],
  "receipts": [
    {
      "document_id": "uuid",
      "date": "2026-04-18",
      "description": "Sushi Zanmai - Client dinner",
      "category": "meals",
      "currency": "MYR",
      "amount": 150.00,
      "transportation": 0.0,
      "accommodation": 0.0,
      "meals": 150.00,
      "others": 0.0,
      "warnings": [],
      "extracted_data": { "...": "..." }
    }
  ],
  "skipped_receipts": [],
  "totals": {
    "transportation": 0.0,
    "accommodation": 1200.0,
    "meals": 150.0,
    "others": 0.0,
    "grand_total": 1350.0,
    "currency": "MYR"
  },
  "all_warnings": [],
  "all_category": ["meals", "accommodation"],
  "main_category": "accommodation"
}
```

### DB Tables Written

| Table | Description |
|-------|-------------|
| `supporting_documents` | One row per uploaded file, stores `extracted_data` JSON |
| `travel_settlements` | Aggregated basket record; `receipts[]` JSONB holds all receipt rows |

### PDF Generation (optional)

```
POST /api/v1/documents/generate-template
Body: { document_ids: ["uuid", ...] }
```

Renders `reimbursement_template.html` via `xhtml2pdf` and saves a Business Travel Settlement PDF to `/storage/pdfs/`.

---

## Workflow 3 — Compliance Basket Evaluation Agent

**Router:** `backend/api/reimbursements.py`  
**Agent:** `backend/engine/agents/compliance_agent.py`  
**Prompts:** `backend/engine/prompts/compliance_prompts.py`  
**Tools:** `backend/engine/tools/compliance_tools.py`, `backend/engine/tools/rag_tool.py`

### Purpose

Evaluates an **entire `TravelSettlement` basket** of receipts against an HR policy, producing per-receipt verdicts (`line_items`) and settlement-level totals. Per-receipt ReAct agents run in parallel; a final ReAct agent produces the overall verdict.

### API Endpoint

```
POST /api/v1/reimbursements/analyze
Content-Type: application/json

{
  "settlement_id": "uuid",        ← required; from Workflow 2 output
  "policy_id": "uuid",            ← required; from Workflow 1 output
  "main_category": "Business Travel",
  "sub_category": "Hotel Accommodation",
  "all_category": ["meals", "accommodation", "transportation"],  ← optional, auto-derived from settlement
  "document_ids": ["uuid", "..."]  ← optional (ignored; basket sourced from settlement)
}
```

**Requires:** Any authenticated user JWT.

### LangGraph Architecture (5 nodes)

```
START
  │
  ▼
Node 1: load_context
  │  Fetch User, Policy, TravelSettlement.receipts[] from DB
  │  Parse mandatory_conditions JSON → combined_conditions[]
  │  Enrich receipts: apply editable_fields + attach _human_edit metadata
  │  (for any SupportingDocument where human_edited=True)
  │
  ▼
Node 2: analyze_receipts
  │  Parallel ReAct agents — ThreadPoolExecutor (max 4 workers)
  │  Per-receipt: RECEIPT_ANALYSIS_PROMPT + get_current_date + search_policy_rag
  │  Max tool calls per agent: 5
  │  LLM: GLM-5.1 (no JSON mode, tool-calling enabled)
  │  Output: line_item JSON per receipt
  │
  ▼
Node 3: aggregate_totals
  │  Pure Python (no LLM): sums line_items into totals dict
  │  Fields: total_requested, total_deduction, net_approved, by_category{}
  │
  ▼
Node 4: final_judgment
  │  Single ReAct agent: FINAL_JUDGMENT_PROMPT + search_policy_rag
  │  Max tool calls: 3
  │  LLM: GLM-5.1 (no JSON mode, tool-calling enabled)
  │  Output: overall_judgment, confidence (0.0-1.0), summary
  │
  ▼
Node 5: save_reimbursement
     Write Reimbursement row to DB
     Back-link: set TravelSettlement.reimbursement_id FK
  │
  ▼
 END
```

### Agent Tools

| Tool | Signature | Purpose |
|------|-----------|---------|
| `get_current_date` | `() → str` | Returns today's date (`YYYY-MM-DD`) — used to check late submission policy |
| `search_policy_rag` | `(query: str) → str` | Vector search over `PolicySection` rows using pgvector cosine similarity (1536-dim embeddings). Falls back to in-Python keyword/ILIKE filtering if vector search fails. Returns up to 6 section excerpts (≤1500 chars each) as a single concatenated string. |

The `search_policy_rag` tool is created per-request via `make_search_policy_rag_tool(policy_id, session)` in `compliance_tools.py`. A thread lock (`_session_lock`) ensures concurrent per-receipt workers share the SQLAlchemy session safely.

### Evaluation Logic (enforced via RECEIPT_ANALYSIS_PROMPT)

The per-receipt agent checks each receipt for:

| Check | Tag | Result |
|-------|-----|--------|
| Receipt older than allowed days (default 90 days; verified via `search_policy_rag`) | `[LATE_SUBMISSION]` | `REJECTED` |
| Category not reimbursable under policy | `[INELIGIBLE_CATEGORY]` | `REJECTED` |
| Amount exceeds rank-based or category-based cap | `[OVER_LIMIT]` | `PARTIAL_APPROVE` with deduction |
| Mandatory condition unmet | `[MANDATORY_CONDITION_FAIL]` | per-agent judgment |
| Critical field missing (date, amount, merchant) | `[MISSING_INFO]` | per-agent judgment |
| Employee edited a critical field (date/amount/vendor) from valid OCR | `[HUMAN_EDIT_HIGH_RISK]` | surfaced to HR |
| Amount change that looks like decimal/placement OCR error | `[HUMAN_EDIT_MEDIUM]` | surfaced to HR |
| Edit of originally null/unfound field | `[HUMAN_EDIT]` | informational only |
| All conditions pass | — | `APPROVED` |

### Output Schema

```json
{
  "reim_id": "uuid",
  "settlement_id": "uuid",
  "judgment": "PARTIAL_APPROVE",
  "status": "REVIEW",
  "confidence": 0.92,
  "currency": "MYR",
  "summary": "Settlement partially approved. Accommodation exceeded rank limit...",
  "line_items": [
    {
      "document_id": "uuid",
      "date": "2026-04-18",
      "category": "meals",
      "description": "Client dinner at Sushi Zanmai",
      "status": "APPROVED",
      "requested_amount": 150.00,
      "approved_amount": 150.00,
      "deduction_amount": 0.00,
      "audit_notes": [],
      "human_edit_risk": "NONE"
    },
    {
      "document_id": "uuid",
      "date": "2025-10-12",
      "category": "transportation",
      "description": "Taxi to airport",
      "status": "REJECTED",
      "requested_amount": 80.00,
      "approved_amount": 0.00,
      "deduction_amount": 80.00,
      "audit_notes": [
        {
          "tag": "[LATE_SUBMISSION]",
          "message": "Receipt date is over 6 months old. Policy requires submission within 90 days."
        }
      ],
      "human_edit_risk": "NONE"
    },
    {
      "document_id": "uuid",
      "date": "2026-04-20",
      "category": "accommodation",
      "description": "Hilton Hotel",
      "status": "PARTIAL_APPROVE",
      "requested_amount": 1200.00,
      "approved_amount": 1000.00,
      "deduction_amount": 200.00,
      "audit_notes": [
        {
          "tag": "[OVER_LIMIT]",
          "message": "Policy caps accommodation for Rank 2 employees at 500.00 per night."
        }
      ],
      "human_edit_risk": "NONE"
    }
  ],
  "totals": {
    "total_requested": 1430.00,
    "total_deduction": 280.00,
    "net_approved": 1150.00,
    "by_category": {
      "meals": {"claimed": 150.00, "approved": 150.00},
      "accommodation": {"claimed": 1200.00, "approved": 1000.00}
    }
  },
  "main_category": "Business Travel",
  "sub_category": "Hotel Accommodation",
  "created_at": "2026-04-23T14:20:00Z"
}
```

### `overall_judgment` Values

| Value | Meaning |
|-------|---------|
| `APPROVE` | All receipts approved, no significant risks |
| `REJECT` | All receipts rejected |
| `PARTIAL_APPROVE` | Mix of APPROVED / REJECTED / PARTIAL_APPROVE receipts |
| `MANUAL REVIEW` | Conflicting signals, HIGH human-edit risk, or insufficient confidence |

### Per-receipt `status` Values

| Value | Meaning |
|-------|---------|
| `APPROVED` | Receipt fully approved at requested amount |
| `REJECTED` | Receipt fully rejected |
| `PARTIAL_APPROVE` | Receipt approved at a reduced amount (cap applied) |

### `status` Values (on the saved `Reimbursement` row)

| Value | Meaning |
|-------|---------|
| `REVIEW` | Default — awaiting HR manual review |
| `APPROVED` | HR manually approved |
| `REJECTED` | HR manually rejected |
| `PAID` | Disbursement processed |

### DB Tables Written

| Table | Description |
|-------|-------------|
| `reimbursements` | One row per compliance run: stores `line_items[]`, `totals{}`, `judgment`, `confidence`, `summary` |
| `travel_settlements` | Back-linked: `reimbursement_id` FK is set on the corresponding settlement row |

---

## Shared Infrastructure

### LLM Clients (`backend/engine/llm.py`)

| Function | Model | Provider | Mode | Used by |
|----------|-------|----------|------|---------|
| `get_chat_llm()` | GLM-5.1 | ILMU API | JSON mode | Workflow 1 (nodes 2 & 3) |
| `get_vision_llm()` | Llama 3.2 11B Vision | OpenRouter | JSON mode | Workflow 2 (image receipts) |
| `get_text_llm()` | GLM-5.1 | ILMU API | JSON mode | Workflow 2 (PDF receipts) |
| `get_agent_llm()` | GLM-5.1 | ILMU API | Tool-calling (no JSON mode) | Workflow 3 (ReAct agents) |
| `get_embeddings()` | text-embedding-3-small | OpenRouter | 1536-dim vectors | Workflow 1 (node 5), Workflow 3 (RAG) |

All clients are `@lru_cache(maxsize=1)` — instantiated once per process.

### RAG Tool (`backend/engine/tools/rag_tool.py`)

`search_policy_sections(policy_id, session, keywords, limit=8)` — two-path retrieval:

1. **Vector path**: Embeds the query string via `text-embedding-3-small` and runs a pgvector cosine-distance query (`embedding <=> CAST(:qvec AS vector)`) against `policy_sections.embedding`. Returns the top `limit` sections ordered by similarity.
2. **Keyword fallback**: If the vector path raises an exception (e.g. embedding failure), fetches all sections for the policy and filters in-Python by substring match against the keyword list. Returns up to `limit` matched sections (or the first `limit` if no matches).

Returns concatenated section excerpts as a plain string, each up to 1500 chars, for injection into the LLM prompt.

### Compliance Tools (`backend/engine/tools/compliance_tools.py`)

Wraps the RAG tool and date tool for the compliance agent:
- `get_current_date()` — `@tool` returning today as `YYYY-MM-DD`
- `make_search_policy_rag_tool(policy_id, session)` — factory that closes over `policy_id` and `session`, applies a `threading.Lock` around `search_policy_sections` calls to guard the shared SQLAlchemy session under concurrent worker threads.

### Auth & Deps (`backend/api/deps.py`)

- `get_db()` — yields a SQLModel `Session`
- `get_current_user()` — decodes JWT, returns `User` model
- `require_hr()` — raises 403 if user role ≠ HR

---

## Database Schema Quick Reference

```
employees          ←→   supporting_documents
(users/auth)             (receipt files, OCR data, human edits)
                              │
                    travel_settlements
                    (WF2 output basket)
                              │
                    reimbursements
                    (WF3 verdict: line_items, totals)
                              │
policies           ←→   policy_sections
(WF1 output)             (chunked text + 1536-dim embeddings for RAG)
```

| Table | Key fields |
|-------|-----------|
| `employees` | `user_id`, `role` (HR/Employee), `rank`, `department` |
| `policies` | `policy_id`, `alias`, `reimbursable_category[]`, `mandatory_conditions` (JSON), `status` |
| `policy_sections` | `section_id`, `policy_id` FK, `content` (text), `embedding` (vector 1536-dim) |
| `travel_settlements` | `settlement_id`, `receipts[]` (JSONB), `totals{}`, `all_category[]`, `reimbursement_id` FK |
| `supporting_documents` | `document_id`, `settlement_id` FK, `reim_id` FK, `extracted_data{}`, `human_edited`, `change_summary{}` |
| `reimbursements` | `reim_id`, `settlement_id` FK, `line_items[]` (JSONB), `totals{}`, `judgment`, `confidence`, `status` |
