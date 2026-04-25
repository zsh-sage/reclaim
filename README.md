<div align="center">

# Reclaim

### AI-assisted expense reimbursement with intelligent decision support.

![UM Hackathon 2026](https://img.shields.io/badge/UM%20Hackathon-2026-blue?style=for-the-badge)
![Built in 10 Days](https://img.shields.io/badge/Built%20in-10%20Days-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.129-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph-1.1.5-purple?style=for-the-badge)

</div>

---

## Hackathon Submission Materials

> **Team Bogosort — UM Hackathon 2026**

| Resource | Link |
|---|---|
| **Demo Video** | *[To Be Added]* |
| **Pitch Deck** | [final_pitch_deck.pdf](docs/submission/final_pitch_deck.pdf) |
| **PRD** | [final_product_requirement_documentation.pdf](docs/submission/final_product_requirement_documentation.pdf) |
| **SAD** | [final_system_analysis_documentation.pdf](docs/submission/final_system_analysis_documentation.pdf) |
| **QATD** | *[To Be Added]* |

---

## About The Project

Enterprise expense reimbursement is broken. The industry standard is a **5–10 business day manual review cycle** in which HR staff open receipts one by one, cross-reference a policy PDF on a shared drive, calculate any deductions or ineligible items, and draft a response — often days later. At scale, this creates a structural bottleneck: claim volume scales linearly with headcount, but the review process stays unchanged. HR teams are buried in low-complexity compliance checks, employees wait weeks for routine reimbursements, and no auditable decision trail is produced.

**Reclaim** is an AI-native expense reimbursement platform that places an intelligent compliance agent between receipt upload and HR review. It acts as a **digital compliance officer** — reading receipts, interpreting active HR policy, detecting fraud signals, and delivering a structured, deterministic recommendation before a human ever opens a claim.

The system is built around the **Efficiency by Exception** model: the AI pre-classifies the entire claim volume before HR opens a single case. High-confidence, policy-compliant claims are surfaced in a fast-track lane. Edge cases, policy violations, and fraud signals are isolated for mandatory HR attention. In practice, this means HR spends zero time re-verifying a clean travel claim and full attention on the receipt that was manually inflated by 10×.

Reclaim is not a black box. Every judgment is explainable — every policy rule applied, every deduction calculated, and every AI-extracted value verified against the original document. The system is designed to **augment HR judgment, not replace it.** No claim transitions to APPROVED or REJECTED without an explicit human action. The AI recommends; HR decides.

Grounded in a real-world case study of a multinational insurance company in Indonesia, Reclaim was architected against actual reimbursement policy documents, expense categories, rank-based caps, and Business Travel Settlement forms — not synthetic requirements.

---

## Features

- **Multi-Modal OCR Submission**
  Employees upload up to 10 receipt files (JPEG, PNG, PDF) per submission. Image receipts are routed to **qwen3.5-flash-02-23** (via OpenRouter) using multimodal base64 prompting. PDF receipts are converted to markdown via **PyMuPDF4LLM** and routed to **GLM-5.1** in JSON mode. Both routes extract the same structured payload: merchant name, date, amount, currency, category, items summary, confidence score, and anomaly flags. Up to 4 receipts are processed in parallel via `ThreadPoolExecutor`, keeping processing time proportional to the slowest individual receipt rather than the sum.

- **Startup Health Check & Automatic Failover**
  At application startup, the backend probes GLM-5.1 with a 15-second timeout. If GLM-5.1 is unreachable, all text LLM calls transparently fall back to **`google/gemini-3.1-flash-lite-preview`** via OpenRouter for the process lifetime — with no code changes and no prompt changes required. The switch is logged at `WARNING` level. All three agent workflows (Policy, Document, Compliance) continue operating identically on either provider.

- **Living Policy Intelligence (Policy Studio)**
  HR uploads company policy PDFs via the Policy Studio. The **Policy Agent** runs a 5-node LangGraph pipeline: `process_pdfs → extract_categories_and_summary → extract_conditions → save_to_db → embed_and_save_sections`. GLM-5.1 is called twice — once to extract reimbursable categories and a 150-word overview summary, and once to extract per-category mandatory conditions as structured JSON. A fifth node batch-embeds all policy text chunks via `text-embedding-3-small` and writes them as `policy_sections` rows with 1536-dim **pgvector** embeddings, enabling RAG-based policy lookup by the Compliance Agent at evaluation time.

- **The Fraud Trap — Immutable Human Edit Detection**
  After OCR, employees review extracted data in a **side-by-side verification UI**: the left panel is an editable AI-pre-filled form; the right panel is the original document. If an employee modifies any AI-extracted field, the system fires silently — setting `human_edited = True`, recording the original AI value vs. the employee-submitted value in a `change_summary` JSONB field, and assigning a risk severity: **HIGH** (amount multiplied significantly), **MEDIUM** (amount increased), **LOW** (minor field edits), or **NONE**. This fraud signal is permanent, immutable, and surfaced to HR as a prominent audit trail entry before they open the claim.

- **Compliance Agent — Deterministic AI Judgment**
  Upon submission, the **Compliance Agent** runs a 5-node LangGraph pipeline: `load_context → analyze_receipts → aggregate_totals → final_judgment → save_reimbursement`. Per-receipt ReAct agents run in parallel (up to 4 concurrent workers, hard-capped at 5 tool calls each), evaluating category eligibility, late submission, rank-based amount caps, and mandatory conditions against the active policy. An `aggregate_totals` node (pure Python, no LLM) calculates financial totals. A final ReAct agent synthesizes the overall verdict: **APPROVE**, **PARTIAL_APPROVE**, **REJECT**, or **MANUAL REVIEW** — with a confidence score (0.0–1.0) and a structured 2–3 sentence rationale. Any unrecoverable pipeline failure defaults to `MANUAL REVIEW`, ensuring no claim is ever silently dropped.

- **Efficiency by Exception — Triage Dashboard**
  The HR Portal triage dashboard pre-buckets all submitted claims before HR opens a single case: **"Passed AI Review"** (APPROVE, high confidence, no HIGH-risk edits) and **"Requires Attention"** (REJECT, PARTIAL_APPROVE, MANUAL REVIEW, or HIGH-risk fraud signals). Every flagged claim surfaces the specific policy clause that was violated, the exact amounts involved, the human-edit deviation detail, and the AI confidence score — in a single evidence panel. HR reviews, exercises judgment, and issues the final decision: Force Full Approval, Approve Adjusted Amount, or Confirm Rejection.

---

## Architecture & Tech Stack

### Client Tier

| Technology | Version | Role |
|---|---|---|
| Next.js | 16.2.4 | React framework, App Router, Server Actions |
| React | 19.2.4 | UI component model |
| Tailwind CSS | 4 | Utility-first styling, mobile-first responsive layout |
| React Hook Form | 7.72.1 | Form state management |
| Zod | 4.3.6 | Schema-level form validation |
| TypeScript | 5 | End-to-end type safety |
| Lucide React | 1.8.0 | Icon library |

### Application Tier

| Technology | Version | Role |
|---|---|---|
| Python FastAPI | 0.129.1 | Async REST API, auto-generated OpenAPI docs at `/docs` |
| LangGraph | 1.1.5 | Stateful agent graph orchestration (Policy & Compliance agents) |
| LangChain | 1.2.15 | LLM abstraction layer, `ChatOpenAI`-compatible client |
| LangSmith | 0.1.99 | LLM observability and distributed tracing (project: `um_hackathon`) |
| PyMuPDF4LLM | 0.27.2.2 | PDF-to-markdown conversion for document ingestion |
| Pillow | 12.2.0 | Image preprocessing (resize, compression) before vision LLM calls |
| xhtml2pdf + Jinja2 | 0.2.16 | Settlement form PDF rendering from HTML template |
| python-jose + bcrypt | 3.3.0 / 4.0.1 | JWT authentication and password hashing |
| Uvicorn | 0.30.1 | ASGI production server |
| UV | latest | Python dependency and virtual environment management |

**LangGraph Agentic Pipelines:**

```
Policy Agent (5 nodes):
  process_pdfs → extract_categories_and_summary → extract_conditions
  → save_to_db → embed_and_save_sections

Document Agent (parallel workers):
  [Image] → qwen3.5-flash-02-23 (OpenRouter, multimodal)
  [PDF]   → PyMuPDF4LLM → GLM-5.1 (ILMU API, JSON mode)
  Up to 4 concurrent ThreadPoolExecutor workers

Compliance Agent (5 nodes):
  load_context → analyze_receipts (parallel ReAct, ≤4 workers, ≤5 tool calls each)
  → aggregate_totals (pure Python) → final_judgment (ReAct, ≤3 tool calls)
  → save_reimbursement
```

### Data Tier

| Technology | Version | Role |
|---|---|---|
| PostgreSQL | 16 | Primary relational database (containerized via Docker) |
| SQLModel ORM | 0.0.22 | Type-safe models combining SQLAlchemy 2.0 + Pydantic 2 |
| pgvector | 0.3.6 | 1536-dim vector storage on `policy_sections` — cosine-similarity RAG queries by Compliance Agent |
| Alembic | 1.13.1 | Schema migrations |

**Schema (6 tables, 3NF):** `employees` · `policies` · `policy_sections` · `travel_settlements` · `reimbursements` · `supporting_documents`

### AI / LLMs

| Model | Provider | Route | Role |
|---|---|---|---|
| `GLM-5.1` | ILMU API | Primary text/chat | Policy extraction, PDF receipt OCR (JSON mode), per-receipt & final compliance ReAct agents |
| `qwen/qwen3.5-flash-02-23` (qwen3.5-flash-02-23) | OpenRouter | Vision | Image receipt OCR (JPEG/PNG) — multimodal base64 prompting |
| `text-embedding-3-small` | OpenRouter | Embedding | Policy section chunk embeddings (1536-dim, pgvector, batch at policy upload) + RAG query embeddings at evaluation time |
| `google/gemini-3.1-flash-lite-preview` | OpenRouter | Fallback text | Automatic process-lifetime fallback if GLM-5.1 health check fails at startup |

### Infrastructure & Observability

| Technology | Role |
|---|---|
| Docker Compose | Containerized PostgreSQL + FastAPI backend with persistent volume and `.env` injection |
| LangSmith | Per-call LLM tracing, token counts, node-level debugging — project: `um_hackathon` |

---

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- [UV](https://docs.astral.sh/uv/) (Python package manager)
- Docker & Docker Compose

### 1. Clone the Repository

```bash
git clone https://github.com/<your-org>/reclaim.git
cd reclaim
```

### 2. Environment Configuration

**Backend:**
```bash
cp backend/.env.example backend/.env
```

```env
# backend/.env

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/reclaim

# LLM Providers
ILMU_API_KEY=your_ilmu_api_key           # GLM-5.1 primary text model
OPENROUTER_API_KEY=your_openrouter_key   # qwen3.5-flash-02-23 vision + Gemini fallback + embeddings

# Auth
SECRET_KEY=your_secret_key_here

# Observability (optional — tracing disabled if unset)
LANGSMITH_API_KEY=your_langsmith_api_key
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=um_hackathon
```

**Frontend:**
```bash
cp frontend/.env.example frontend/.env.local
```

```env
# frontend/.env.local

NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Start the Database

```bash
docker compose up -d
```

### 4. Start the Backend

```bash
cd backend

# Install dependencies via UV
uv sync

# Activate virtual environment
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Run database migrations
alembic upgrade head

# Start the API server (startup health check runs automatically)
fastapi dev main.py
# or: uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> **Note:** On startup, the backend probes GLM-5.1 with a 15-second health check. If GLM-5.1 is unreachable, all LLM calls automatically fall back to `google/gemini-3.1-flash-lite-preview` via OpenRouter. Watch the startup log for `INFO: GLM-5.1 healthy` or `WARNING: Falling back to Gemini`.

### 5. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

**API documentation** (auto-generated) is available at `http://localhost:8000/docs`.

---

## Usage

Reclaim operates as a **two-portal system** with JWT-based, role-isolated access control.

### Employee Portal

1. **Submit a Claim** — Select an expense category (populated from the active HR policy), upload up to 10 receipt files (JPEG, PNG, or PDF). The Document Agent processes all files in parallel, extracting structured data within seconds.
2. **Verify Extraction (The Fraud Trap)** — Review the AI-extracted fields in the side-by-side verification UI. Confirm or correct the data. Any modifications to AI-extracted amounts are silently logged as fraud signals and risk-scored before the claim enters the compliance pipeline.
3. **Track Status** — Monitor claim status (`PENDING REVIEW`, `APPROVED`, `PARTIALLY APPROVED`, `REJECTED`) with per-receipt AI verdicts and the final HR decision visible from the claims dashboard.

### HR Portal

1. **Policy Studio** — Upload the company reimbursement policy PDF. The Policy Agent extracts all categories, mandatory conditions, and amount caps into structured data. Review the AI-generated summary and conditions checklist — confirm accuracy before activating. The activated policy becomes the enforcement baseline for all subsequent claims.
2. **Triage Dashboard** — Review the pre-bucketed claim queue. **"Passed AI Review"** claims are ready for fast-track approval. **"Requires Attention"** claims surface the full evidence panel: AI reasoning, specific policy clause violated, human-edit deviation detail, confidence score, and financial summary.
3. **Decision Engine** — Issue the final decision per claim: **Force Full Approval**, **Approve Adjusted Amount** (edit per-receipt amounts before finalizing), or **Confirm Rejection**. Add an HR note to communicate the decision rationale to the employee. No claim is approved or rejected without this explicit HR action.

---

## Contributors

Built in 10 days for **UM Hackathon 2026** by **Team Bogosort**.

| Name | Role |
|---|---|
| **Filbert Ng** | Backend architecture; all three LangGraph agent workflows (Policy, Document, Compliance); LLM integration (ILMU GLM-5.1, OpenRouter); FastAPI API layer; LangSmith observability; Docker & deployment |
| **Chingiz Iskakov** | Database design & schema (SQLModel, Alembic migrations); backend endpoint implementation; frontend–backend API integration; PostgreSQL Docker setup; compliance agent deduction calculation |
| **Darrell Benedict Setiawan** | Frontend development (Employee & HR portals, responsive UI/UX); product documentation (PRD, SAD, QATD); Pitch Deck; product testing & QA |
| **Michael** | Frontend development; UI/UX design & refinement; product documentation (PRD, SAD, QATD); Pitch Deck; product testing & QA |
| **Christian Rafael Santoso** | Frontend development; UI/UX design & refinement; product documentation (PRD, SAD, QATD); Pitch Deck; product testing & QA |

---

<div align="center">

*Built with intent at UM Hackathon 2026.*

</div>
