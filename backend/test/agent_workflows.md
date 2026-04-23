# Reclaim — Agent Workflows Documentation

## Overview

Reclaim uses three AI-powered workflows to automate HR reimbursement processing.
All LLM calls are routed through **OpenRouter** (vision/text) and **ILMU API** (chat) and traced in **LangSmith** (project: `um_hackathon`).

```
Employee                HR                   AI Agents                    Database
   │                     │                       │                            │
   │      Upload PDFs     │                       │                            │
   │─────────────────────>│                       │                            │
   │                     │── run_policy_workflow─>│                            │
   │                     │                       │──── Policy row ───────────>│
   │                     │                       │                            │
   │── Upload Receipts ──────────────────────────>│                            │
   │          process_receipts (parallel OCR)     │                            │
   │                     │                       │──── SupportingDocument ───>│
   │                     │                       │                            │
   │── Analyze claim ─────────────────────────────>│                           │
   │       run_compliance_workflow                │                            │
   │                     │                       │──── Reimbursement ────────>│
   │<─── Judgment ─────────────────────────────────│                           │
```

---

## Workflow 1 — HR Policy Upload

**Trigger**: `POST /api/v1/policies/upload` (HR role required)
**File**: `backend/engine/agents/policy_agent.py`
**LangGraph**: Sequential 4-node pipeline

### Flow

```
[START]
   │
   ▼
┌────────────────────────────────────────────────────────┐
│  Node 1: process_pdfs                                  │
│  • pymupdf4llm converts each PDF → Markdown text       │
│  • Strips image placeholders                           │
│  State: markdown_docs = [{file, text}]                 │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 2: extract_categories_and_summary                │
│  • Combines all markdown (cap 80k chars)               │
│  • Chat LLM (JSON mode)                                │
│  • Prompt: POLICY_CATEGORY_SUMMARY_PROMPT              │
│  • Extracts: title, categories[], overview_summary     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 3: extract_conditions                            │
│  • Combines all markdown (cap 80k chars)               │
│  • Chat LLM (JSON mode)                                │
│  • Prompt: POLICY_CONDITIONS_PROMPT                    │
│  • Extracts: {CategoryName: {required_documents,       │
│    condition[]}}                                       │
│  State: mandatory_procedures                           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 4: save_to_db                                    │
│  • Creates Policy row (alias, title, categories,       │
│    overview_summary, mandatory_conditions as JSON,     │
│    status=ACTIVE)                                      │
│  • session.commit()                                    │
│  Returns: policy_id                                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                         [END]
```

### Database Writes

| Table | Fields Written |
|-------|---------------|
| `policies` | alias, title, reimbursable_category[], overview_summary, mandatory_conditions (JSON string), source_file_url, status="ACTIVE" |

### API Input

```http
POST /api/v1/policies/upload
Authorization: Bearer <HR token>
Content-Type: multipart/form-data

alias=Business Travel Policy 2024
files=policy_main.pdf
files=appendix_forms.pdf
```

### API Output

```json
{
  "policy_id": "uuid",
  "alias": "Business Travel Policy 2024",
  "title": "Business Travel Reimbursement Policy",
  "reimbursable_category": ["Air Transportation", "Hotel Accommodation"],
  "overview_summary": "This policy governs...",
  "status": "ACTIVE"
}
```

---

## Workflow 2 — Multi-Receipt OCR (Parallel)

**Trigger**: `POST /api/v1/documents/upload`
**File**: `backend/engine/agents/document_agent.py`
**Pattern**: `process_receipts()` with `ThreadPoolExecutor` for parallel LLM calls + serial DB writes

### Flow

```
[Upload 1..N files]
        │
        ▼
┌────────────────────────────────────────────────────────┐
│  Query active policies → build categories list         │
│  (used for LLM category matching)                      │
└──────────────────────────┬─────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │  ThreadPoolExecutor     │  (up to 4 workers)
              │  per file in parallel:  │
              │                         │
              │  if image:              │
              │    _ocr_image()         │
              │    Vision LLM + base64  │
              │                         │
              │  if PDF:                │
              │    pymupdf4llm → text   │
              │    _ocr_pdf()           │
              │    Text LLM (JSON mode) │
              │                         │
              │  Both use same          │
              │  RECEIPT_OCR_PROMPT +   │
              │  injected categories    │
              └────────────┬────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  _build_warnings() per receipt                         │
│  • confidence < 0.7                                    │
│  • Missing required fields                             │
│  • Images: visual anomaly check                        │
│  • PDFs: "standard visual anomaly detection bypassed"  │
│  • Receipt name ≠ employee name                        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Serial DB writes (thread-safe)                        │
│  • SupportingDocument row per file                     │
│  • extracted_data = full OCR JSON                      │
│  • session.commit()                                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Build aggregated_results dict                         │
│  • Map category → expense column                       │
│    (transportation / accommodation / meals / others)   │
│  • Calculate sub-totals and grand total                │
└──────────────────────────┬─────────────────────────────┘
                           │
                         [END]
```

### OCR Prompt Behaviour

- **Missing fields**: LLM returns `"Not found in Receipt"` (not null) for all missing string fields
- **Category**: LLM selects from the injected active policy categories list, or returns exactly `"No Reimbursement Policy for this receipt"`
- All fields in `extracted_data` are stored in the DB `supporting_documents.extracted_data` JSONB column

### Expense Column Mapping

| Category keyword contains | → Column |
|---------------------------|----------|
| transport, travel, air, flight, taxi, ... | transportation |
| hotel, accommodation, lodging, ... | accommodation |
| meal, food, dining, restaurant, ... | meals |
| anything else | others |

### HTML-to-PDF Settlement Form

```python
generate_reimbursement_template(aggregated_results, output_path)
```

- Template: `backend/engine/templates/reimbursement_template.html` (Jinja2)
- Renderer: `xhtml2pdf` (pure Python)
- Output: Business Travel Settlement PDF with header, expense table (Transport/Accommodation/Meals/Others), Sub-Total, Amount Due, and signature rows (Approved by / Verified by left blank)
- API: `POST /api/v1/documents/generate-template`

### Database Writes

| Table | Fields Written |
|-------|---------------|
| `supporting_documents` | user_id, name, path, type, is_main=True (default), document_class="RECEIPT" (default), extracted_data |

### API Input

```http
POST /api/v1/documents/upload
Authorization: Bearer <Employee token>
Content-Type: multipart/form-data

files=receipt1.jpg
files=receipt2.pdf
files=receipt3.png
```

### API Output

```json
{
  "document_ids": ["uuid1", "uuid2", "uuid3"],
  "employee": { "name": "John Doe", "id": "uuid", "department": "", "purpose": "Air Transportation, Meals" },
  "receipts": [
    {
      "document_id": "uuid1",
      "date": "2026-04-20",
      "description": "AirAsia - Air Travel",
      "category": "Air Transportation",
      "currency": "MYR",
      "amount": 350.00,
      "transportation": 350.00,
      "accommodation": 0.0,
      "meals": 0.0,
      "others": 0.0,
      "warnings": []
    }
  ],
  "totals": {
    "transportation": 350.00,
    "accommodation": 0.0,
    "meals": 25.50,
    "others": 0.0,
    "grand_total": 375.50,
    "currency": "MYR"
  },
  "all_warnings": []
}
```

---

## Workflow 3 — Compliance Analysis

**Trigger**: `POST /api/v1/reimbursements/analyze`
**File**: `backend/engine/agents/compliance_agent.py`
**LangGraph**: Sequential 4-node pipeline (direct LLM evaluation, no RAG)

### Flow

```
[START]
   │
   ▼
┌────────────────────────────────────────────────────────┐
│  Node 1: load_context                                  │
│  • Fetch User (name, department, rank)                 │
│  • Fetch Policy, parse mandatory_conditions JSON       │
│  • Extract category_data = conditions[sub_category]    │
│  • Fetch main receipt OCR data (is_main=True)          │
│  State: user, policy, category_data,                   │
│         receipt_extracted_data, currency, amount       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 2: check_conditions  (direct LLM call)           │
│  • AGENT_EVALUATION_PROMPT with all context injected   │
│  • Chat LLM (JSON mode) evaluates each condition       │
│  • Returns chain_of_thought:                           │
│    {condition_label: {flag, reason, note}}             │
│  Flags: PASS / FAIL / MANUAL_REVIEW                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 3: build_judgment                                │
│  • JUDGMENT_SYNTHESIS_PROMPT (JSON mode LLM)           │
│  • Rules:                                              │
│    - All PASS → APPROVE                                │
│    - Any clear violation → FLAG                        │
│    - Ambiguous/borderline → MANUAL REVIEW              │
│  State: judgment, summary                              │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│  Node 4: save_reimbursement                            │
│  • Creates Reimbursement row (status="REVIEW")         │
│  • Updates SupportingDocument.reim_id for all docs     │
│  • session.commit()                                    │
└──────────────────────────┬─────────────────────────────┘
                           │
                         [END]
```

### LLM Instances Used

| Instance | Model | Mode | Used For |
|----------|-------|------|----------|
| `get_chat_llm()` | ilmu-glm-5.1 (ILMU API) | JSON mode | check_conditions + build_judgment |

### Database Writes

| Table | Fields Written |
|-------|---------------|
| `reimbursements` | user_id, policy_id, main_category, sub_category, employee_department, employee_rank, currency, amount, judgment, status="REVIEW", chain_of_thought (JSON), summary |
| `supporting_documents` | reim_id (updated for all input document_ids) |

### API Input

```http
POST /api/v1/reimbursements/analyze
Authorization: Bearer <Employee token>
Content-Type: application/json

{
  "document_ids": ["uuid-receipt1", "uuid-receipt2"],
  "policy_id": "uuid-policy",
  "main_category": "Business Travel",
  "sub_category": "Air Transportation"
}
```

### API Output

```json
{
  "reim_id": "uuid",
  "judgment": "APPROVE",
  "status": "REVIEW",
  "summary": "All conditions satisfied. Receipt confirms economy class booking.",
  "chain_of_thought": {
    "Required Documents": { "flag": "PASS", "reason": "Original e-receipt present.", "note": "" },
    "Economy class for all employees": { "flag": "PASS", "reason": "AirAsia economy confirmed.", "note": "" }
  },
  "amount": 350.0,
  "currency": "MYR"
}
```

---

## LangSmith Tracing

All workflows are automatically traced when these env vars are set in `backend/.env`:

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=um_hackathon
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
```

**View at**: https://smith.langchain.com → project `um_hackathon`

---

## LLM Models Used

| Model | Provider | Used For |
|-------|----------|----------|
| `ilmu-glm-5.1` | ILMU API | Policy extraction, compliance evaluation, judgment synthesis |
| `meta-llama/llama-3.2-11b-vision-instruct` | OpenRouter | Receipt image OCR (Vision LLM) |
| `ilmu-glm-5.1` (text/JSON mode) | ILMU API | PDF receipt text extraction |

---

## File Storage Layout

```
backend/storage/
├── policies/           # HR uploaded policy PDFs
│   └── *.pdf
└── documents/          # Employee uploaded receipts
    └── {user_id}/
        ├── *.jpg / *.pdf / *.png
        └── reimbursement_settlement.pdf   ← generated by generate-template
```

---

## Running the Backend

```bash
# Ensure Docker DB is running
docker compose up -d db

# Start backend
cd backend && uv run uvicorn main:app --reload --port 8000

# Demo UI:   http://localhost:8000/test/demo
# DB Viewer: http://localhost:8000/test/
# Swagger:   http://localhost:8000/docs
```

## DB Migration (run once after this refactor)

```sql
-- Remove RAG embeddings tables
DROP TABLE IF EXISTS supporting_documents_embeddings;
ALTER TABLE policy_sections DROP COLUMN IF EXISTS embedding;
```
