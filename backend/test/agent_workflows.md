# Reclaim — Agent Workflow Documentation

> **Last updated:** 2026-04-23  
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
[Policy stored + conditions extracted]

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

Accepts one or more HR policy PDF files, extracts structured metadata via an LLM, and stores everything needed for Workflow 3's compliance checks.

### API Endpoint

```
POST /api/v1/policies/upload
Content-Type: multipart/form-data

Fields:
  alias   (str)         – Human-readable label e.g. "Business Travel Policy 2024"
  files   (File[])      – One or more .pdf files
```

**Requires:** HR role JWT.

### Processing Pipeline

```
PDF files
  │
  ├─ pymupdf4llm.to_markdown()   ← per file, extracted to Markdown text
  │
  └─ LLM (text model)
       Prompt: extract title, reimbursable_category[], overview_summary,
               mandatory_conditions (JSON by category → conditions[])
       │
       └─ saved to DB ──→ Policy row
                      ──→ PolicySection rows (chunked, for RAG keyword search)
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
| `policies` | One row per uploaded policy |
| `policy_sections` | Chunked text used by Workflow 3's RAG tool |

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
  ├─ [Image: .jpg/.png/.webp]          ├─ [PDF: .pdf]
  │   Vision LLM (base64 encoded)      │   pymupdf4llm → Markdown
  │   RECEIPT_OCR_PROMPT               │   Text LLM
  │                                    │   RECEIPT_OCR_PROMPT_WITH_CATEGORIES
  │
  └─ parallel via ThreadPoolExecutor (max 4 workers)
       │
       ├─ Per receipt: extract fields, detect warnings, map to expense column
       │    Columns: transportation | accommodation | meals | others
       │
       ├─ Serial DB writes:
       │    SupportingDocument row per file (with extracted_data JSON)
       │
       └─ Aggregate into TravelSettlement:
            receipts[]        – valid receipts (no warnings)
            skipped_receipts[] – receipts with warnings
            totals{}          – per-column subtotals + grand_total
            all_category[]    – unique expense categories found
            main_category     – most frequent category
```

### Readability Check

A receipt is considered **unreadable** (and moved to `skipped_receipts`) if all of these fields are absent/null: `merchant_name`, `date`, `total_amount`, `currency`, `receipt_number`, `items_summary`.

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
**Prompt:** `backend/engine/prompts/compliance_prompts.py`

### Purpose

Evaluates an **entire `TravelSettlement` basket** of receipts against an HR policy in one LLM call, producing per-receipt verdicts (`line_items`) and settlement-level totals. Uses a **ReAct-style LangGraph** so the agent can dynamically call tools to look up dates or policy limits mid-reasoning.

### API Endpoint

```
POST /api/v1/reimbursements/analyze
Content-Type: application/json

{
  "settlement_id": "uuid",        ← required; from Workflow 2 output
  "policy_id": "uuid",            ← required; from Workflow 1 output
  "main_category": "Business Travel",
  "sub_category": "Hotel Accommodation",
  "all_category": ["meals", "accommodation", "transportation"],  ← optional, auto-derived
  "document_ids": ["uuid", "..."]  ← optional (ignored; basket sourced from settlement)
}
```

**Requires:** Any authenticated user JWT.

### LangGraph Architecture

```
START
  │
  ▼
load_context          – Fetch User, Policy, TravelSettlement.receipts[]
  │                     Build combined_conditions[], policy_sections_text
  ▼
agent (LLM)           – First call: inject full HumanMessage with basket JSON
  │◄──────────────────┐
  │  tool_calls?       │
  ├──YES──► tools ─────┘   (loop back to agent after tool execution)
  │
  └──NO──► parse_output    – Extract line_items[], totals{}, overall_judgment, etc.
                │
                ▼
          save_reimbursement  – Write Reimbursement row to DB
                │
                ▼
               END
```

### Agent Tools

| Tool | Signature | Purpose |
|------|-----------|---------|
| `get_current_date` | `() → str` | Returns today's date (`YYYY-MM-DD`) — used to check 90-day late submission policy |
| `search_policy_rag` | `(query: str) → str` | Keyword search over `PolicySection` rows for the active policy — used to look up rank-based limits, per-diem rates, category caps |

Both tools are bound to the LLM via `llm.bind_tools([...])` so the model can call them in a ReAct loop before producing final output.

### Evaluation Logic (enforced via prompt)

The agent checks each receipt for:

| Check | Tag | Result |
|-------|-----|--------|
| Receipt older than 90 days | `[LATE_SUBMISSION]` | `REJECTED` |
| Category not reimbursable under policy | `[INELIGIBLE_CATEGORY]` | `REJECTED` |
| Amount exceeds rank-based cap | `[OVER_LIMIT]` | `PARTIAL_APPROVE` with deduction |
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
      "audit_notes": []
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
      ]
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
      ]
    }
  ],
  "totals": {
    "total_requested": 1430.00,
    "total_deduction": 280.00,
    "net_approved": 1150.00
  },
  "main_category": "Business Travel",
  "sub_category": "Hotel Accommodation",
  "created_at": "2026-04-23T14:20:00Z"
}
```

### `overall_judgment` Values

| Value | Meaning |
|-------|---------|
| `APPROVE` | All receipts approved, full amount reimbursed |
| `REJECT` | All receipts rejected |
| `PARTIAL_APPROVE` | Mix of approved / rejected / partially-approved receipts |

### `status` Values (on the saved `Reimbursement` row)

| Value | Meaning |
|-------|---------|
| `REVIEW` | Default — awaiting HR manual review |
| `APPROVED` | HR manually approved |
| `REJECTED` | HR manually rejected |

### DB Tables Written

| Table | Description |
|-------|-------------|
| `reimbursements` | One row per compliance run: stores `line_items[]`, `totals{}`, `judgment`, `confidence`, `summary` |
| `travel_settlements` | Back-linked: `reimbursement_id` FK is set on the corresponding settlement row |

---

## Shared Infrastructure

### LLM Clients (`backend/engine/llm.py`)

| Function | Model type | Used by |
|----------|-----------|---------|
| `get_chat_llm()` | Chat/reasoning model | Workflow 1, Workflow 3 |
| `get_vision_llm()` | Multimodal vision model | Workflow 2 (image receipts) |
| `get_text_llm()` | Text model | Workflow 2 (PDF receipts) |

### RAG Tool (`backend/engine/tools/rag_tool.py`)

`search_policy_sections(policy_id, session, keywords, limit=8)` — keyword-ILIKE search over `PolicySection.content`. No vector embeddings are used (pgvector is installed but the embedding pipeline was retired). Returns concatenated section excerpts as a plain string.

### Auth & Deps (`backend/api/deps.py`)

- `get_db()` — yields a SQLModel `Session`
- `get_current_user()` — decodes JWT, returns `User` model
- `require_hr()` — raises 403 if user role ≠ HR

---

## Database Schema Quick Reference

```
employees          ←→   supporting_documents
(users/auth)             (receipt files, OCR data)
                              │
                    travel_settlements
                    (WF2 output basket)
                              │
                    reimbursements
                    (WF3 verdict: line_items, totals)
                              │
policies           ←→   policy_sections
(WF1 output)             (RAG search chunks)
```

| Table | Key fields |
|-------|-----------|
| `employees` | `user_id`, `role` (HR/Employee), `rank`, `department` |
| `policies` | `policy_id`, `alias`, `reimbursable_category[]`, `mandatory_conditions` (JSON), `status` |
| `policy_sections` | `section_id`, `policy_id` FK, `content` (text) |
| `travel_settlements` | `settlement_id`, `receipts[]` (JSONB), `totals{}`, `all_category[]`, `reimbursement_id` FK |
| `supporting_documents` | `document_id`, `settlement_id` FK, `reim_id` FK, `extracted_data{}` |
| `reimbursements` | `reim_id`, `settlement_id` FK, `line_items[]` (JSONB), `totals{}`, `judgment`, `confidence`, `status` |
