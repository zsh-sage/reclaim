# Reclaim — Agent Workflows Documentation

## Overview

Reclaim uses three LangGraph-powered AI agent workflows to automate the HR reimbursement process.
All LLM calls are routed through **OpenRouter** and traced in **LangSmith** (project: `um_hackathon`).

```
Employee                HR                   AI Agents (LangGraph)          Database
   │                     │                          │                           │
   │      Upload PDFs     │                          │                           │
   │─────────────────────>│                          │                           │
   │                     │──── run_policy_workflow ─>│                           │
   │                     │                          │──── Policy + Sections ───>│
   │                     │                          │                           │
   │── Upload Receipt ───>│                          │                           │
   │── run_document_workflow ──────────────────────>│                           │
   │                     │                          │──── SupportingDocument ──>│
   │                     │                          │                           │
   │── Analyze claim ────────────────────────────────>│                         │
   │          run_compliance_workflow                │                           │
   │                     │                          │──── Reimbursement ───────>│
   │<─── Judgment ───────────────────────────────────│                           │
```

---

## Workflow 1 — HR Policy Upload

**Trigger**: `POST /api/v1/policies/upload` (HR role required)  
**File**: `backend/engine/agents/policy_agent.py`  
**LangGraph**: Sequential 5-node pipeline

### Flow

```
[START]
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 1: process_pdfs                                           │
│  • Reads each PDF with pymupdf4llm → Markdown text             │
│  • Strips image placeholders → [IMAGE - OCR not available]     │
│  State: markdown_docs = [{file, text}]                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 2: split_markdown                                         │
│  • RecursiveCharacterTextSplitter (dynamic chunk size)         │
│  • chunk_size ≈ len(text)/num_chunks + 100, overlap=150        │
│  • Skip splitting if text < 1500 chars                         │
│  State: split_chunks = [{file, text, metadata}]               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 3: extract_categories_and_summary                         │
│  • Combines all markdown (cap 80k chars)                       │
│  • Calls arcee-ai/trinity-large-preview (JSON mode)            │
│  • Prompt: POLICY_CATEGORY_SUMMARY_PROMPT                      │
│  • Extracts: title, reimbursement_available_category[], summary│
│  State: title, extracted_categories, overview_summary          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 4: extract_conditions                                     │
│  • Combines all chunks (cap 80k chars)                         │
│  • Calls arcee-ai/trinity-large-preview (JSON mode)            │
│  • Prompt: POLICY_CONDITIONS_PROMPT                            │
│  • Extracts: {CategoryName: {required_documents, condition[]}} │
│  State: mandatory_procedures                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 5: save_to_db                                             │
│  • Generates embeddings via openai/text-embedding-3-small      │
│    (1536 dims) for all chunks                                  │
│  • Creates Policy row (alias, title, categories, summary,      │
│    mandatory_conditions as JSON string, status=ACTIVE)         │
│  • Creates PolicySection row per chunk with pgvector embedding  │
│  • session.commit()                                            │
│  Returns: policy_id                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                           [END]
```

### Database Writes

| Table | Fields Written |
|-------|---------------|
| `policies` | alias, title, reimbursable_category[], overview_summary, mandatory_conditions (JSON), source_file_url, status="ACTIVE" |
| `policy_sections` | policy_id, content (chunk text), embedding (Vector(1536)), metadata_data |

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
  "reimbursable_category": ["Business Travel", "Hotel Accommodation"],
  "overview_summary": "This policy governs...",
  "status": "ACTIVE"
}
```

---

## Workflow 2 — Document & Receipt OCR

**Trigger**: `POST /api/v1/documents/upload`  
**File**: `backend/engine/agents/document_agent.py`  
**Pattern**: Plain function (no LangGraph — two code paths)

### Flow: Receipt (is_main=true, image file)

```
[Upload]
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  _ocr_receipt(file_path)                                        │
│  • Read image → Base64 encode                                  │
│  • Build HumanMessage with image_url content block             │
│  • Call meta-llama/llama-3.2-11b-vision-instruct (Vision LLM)  │
│  • Parse JSON from response (JsonOutputParser → regex fallback) │
│  Extracts 12 fields:                                           │
│    merchant_name, date, time, currency, total_amount,          │
│    tax_amount, receipt_number, receipt_name,                   │
│    visual_anomalies_detected, anomaly_description,             │
│    items_summary, confidence                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  _build_warnings(extracted_data, employee_name)                 │
│  Checks:                                                       │
│    • confidence < 0.7 → "Low confidence OCR"                   │
│    • Missing: date, currency, total_amount, receipt_number,    │
│      receipt_name                                              │
│    • visual_anomalies_detected = True                          │
│    • receipt_name ≠ employee_name (case-insensitive)           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Save SupportingDocument                                        │
│  • document_class = "RECEIPT", is_main = True                  │
│  • extracted_data = OCR result dict                            │
│  • No embedding (receipt images don't need RAG)               │
└─────────────────────────────────────────────────────────────────┘
```

### Flow: Supporting Document (is_main=false, PDF)

```
[Upload]
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  pymupdf4llm.to_markdown(file_path)                             │
│  • Converts PDF → Markdown text                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  RecursiveCharacterTextSplitter                                 │
│  • Same chunking logic as Workflow 1                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  get_embeddings().embed_documents(chunks)                       │
│  • openai/text-embedding-3-small via OpenRouter               │
│  • Creates SupportingDocumentEmbedding rows                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Save SupportingDocument                                        │
│  • document_class = "SUPPORTING", is_main = False              │
│  • extracted_data = {}                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Database Writes

| Table | Fields Written |
|-------|---------------|
| `supporting_documents` | user_id, name, path, type, is_main, document_class, extracted_data |
| `supporting_documents_embeddings` | document_id, content (chunk), embedding (Vector(1536)), metadata_data |

### API Input

```http
POST /api/v1/documents/upload
Authorization: Bearer <Employee token>
Content-Type: multipart/form-data

is_main=true
document_name=Hotel Receipt KL Trip
file=receipt.jpg
```

### API Output

```json
{
  "document_id": "uuid",
  "is_main": true,
  "extracted_data": {
    "merchant_name": "Grand Hyatt KL",
    "date": "2024-03-15",
    "currency": "MYR",
    "total_amount": 450.00,
    "receipt_name": "John Doe",
    "confidence": 0.92,
    "visual_anomalies_detected": false
  },
  "warnings": []
}
```

---

## Workflow 3 — Compliance Analysis

**Trigger**: `POST /api/v1/reimbursements/analyze`  
**File**: `backend/engine/agents/compliance_agent.py`  
**LangGraph**: Sequential 4-node pipeline with optional RAG tools

### Key Design Decisions

- Only the **`sub_category`** entry from `mandatory_conditions` is evaluated (e.g., passing `"Air Transportation"` evaluates only that category's required documents and conditions — not all other categories).
- The **main receipt** (is_main=True) OCR data is always injected directly into the agent prompt as structured context.
- **RAG is optional**: the agent has two tools it can call if it needs extra context. It skips them if the receipt data + policy overview is sufficient.
- **Policy RAG** and **Document RAG** are separate tools — some conditions need only one, some both, some neither.
- Only `is_main=False` documents (supporting PDFs) are searchable via RAG. Main receipts have no embeddings.

### Flow

```
[START]
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 1: load_context                                           │
│  • Fetch User (employee info, rank, department)                │
│  • Fetch Policy, parse mandatory_conditions JSON               │
│  • Extract category_data = conditions[sub_category]            │
│    (exact match first, case-insensitive fallback)              │
│  • Fetch main receipt OCR data (is_main=True) → injected direct│
│  • Collect supporting_doc_ids (is_main=False) → for RAG only  │
│  State: user, policy, category_data, receipt_extracted_data,  │
│         supporting_doc_ids                                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 2: check_conditions  (tool-calling agent)                 │
│                                                                 │
│  Two optional RAG tools available to the agent:                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ search_policy_sections(query)                           │   │
│  │  → pgvector cosine search on policy_sections            │   │
│  │  → use when exact policy wording/limits are needed      │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ search_supporting_documents(query)                      │   │
│  │  → pgvector cosine search on supporting_doc embeddings  │   │
│  │  → use only for is_main=False PDFs; skipped if none     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Agent loop (max 6 iterations):                                │
│    1. Invoke LLM with receipt data + category requirements     │
│    2. If LLM calls a tool → execute → append result → repeat  │
│    3. If no tool calls → parse JSON response → done           │
│                                                                 │
│  Prompt (AGENT_EVALUATION_PROMPT) asks agent to evaluate:      │
│    • Required Documents: are they present in the claim?        │
│    • Each condition string in category_data["condition"]       │
│                                                                 │
│  State: chain_of_thought = {label: {flag, reason, note}}      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 3: build_judgment                                         │
│  • Invoke JUDGMENT_SYNTHESIS_PROMPT (JSON mode LLM)            │
│  • Rules:                                                      │
│    - All PASS → APPROVE                                        │
│    - Any clear violation → FLAG                                │
│    - Ambiguous/missing data → MANUAL REVIEW                    │
│  State: judgment (APPROVE / FLAG / MANUAL REVIEW), summary     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Node 4: save_reimbursement                                     │
│  • Creates Reimbursement row (status always "REVIEW")          │
│  • Updates SupportingDocument.reim_id for all document_ids    │
│  • session.commit()                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                           [END]
```

### RAG Tools (called on demand by the agent)

```
search_policy_sections(query):
  SELECT content FROM policy_sections
  WHERE policy_id = :policy_id
  ORDER BY embedding <=> CAST(:vec AS vector)   -- cosine distance
  LIMIT 3

search_supporting_documents(query):
  SELECT content FROM supporting_documents_embeddings
  WHERE document_id = ANY(:supporting_doc_ids)  -- is_main=False only
  ORDER BY embedding <=> CAST(:vec AS vector)
  LIMIT 3
```

Both tools are defined as closures inside `check_conditions`, bound to the current session and IDs. If no supporting documents exist, `search_supporting_documents` returns immediately without embedding.

### LLM Instances Used in Workflow 3

| Instance | Model | Mode | Used For |
|----------|-------|------|----------|
| `get_agent_llm()` | arcee-ai/trinity-large-preview | No JSON mode | Tool-calling agent loop in `check_conditions` |
| `get_chat_llm()` | arcee-ai/trinity-large-preview | JSON mode | `build_judgment` (JUDGMENT_SYNTHESIS_PROMPT) |

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
  "document_ids": ["uuid-receipt", "uuid-supporting-doc"],
  "policy_id": "uuid-policy",
  "main_category": "Business Travel",
  "sub_category": "Air Transportation",
  "currency": "MYR",
  "amount": 850.00
}
```

### API Output

```json
{
  "reim_id": "uuid",
  "judgment": "APPROVE",
  "status": "REVIEW",
  "summary": "All mandatory conditions satisfied for Air Transportation. Receipt confirms economy class booking within policy limits.",
  "chain_of_thought": {
    "Required Documents": {
      "flag": "PASS",
      "reason": "Original e-receipt present. Business Travel Settlement Form detected in supporting documents.",
      "note": ""
    },
    "Economy class for all employees (non-executives)": {
      "flag": "PASS",
      "reason": "Receipt shows economy class booking on AirAsia (budget airline).",
      "note": ""
    },
    "Changing issued ticket to and from destination city will be subject to President Director approval": {
      "flag": "MANUAL_REVIEW",
      "reason": "No information available about whether the ticket was changed.",
      "note": "Requires manual check if ticket was amended."
    }
  },
  "amount": 850.0,
  "currency": "MYR"
}
```

---

## LangSmith Tracing

All three workflows are automatically traced in LangSmith when the following environment variables are set in `backend/.env`:

```
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_PROJECT=um_hackathon
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
```

These are loaded into `os.environ` at FastAPI startup via `python-dotenv` before any LangChain imports. Every LangGraph node invocation, every LLM call, and every embedding request will appear as a trace in the LangSmith project `um_hackathon`.

**View traces at**: https://smith.langchain.com → select project `um_hackathon`

---

## LLM Models Used

| Model | Provider | Used For |
|-------|----------|----------|
| `z-ai/glm-4.5-air:free` | OpenRouter | Policy extraction, compliance condition checking, judgment synthesis |
| `meta-llama/llama-3.2-11b-vision-instruct:free` | OpenRouter | Receipt image OCR |
| `openai/text-embedding-3-small` | OpenRouter | Policy chunk embeddings, document embeddings (1536 dims) |

---

## File Storage Layout

```
backend/storage/
├── policies/           # HR uploaded policy PDFs
│   └── *.pdf
└── documents/          # Employee uploaded receipts/docs
    └── {user_id}/
        └── *.jpg / *.pdf
```

---

## Running the Backend

```bash
# Ensure Docker DB is running
docker compose up -d db

# Start backend (from project root)
cd backend && uv run uvicorn main:app --reload --port 8000

# Access demo UI
http://localhost:8000/test/demo

# Access DB viewer
http://localhost:8000/test/

# Swagger docs
http://localhost:8000/api/v1/openapi.json
```
