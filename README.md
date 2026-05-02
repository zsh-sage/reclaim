<div align="center">

# 🧾 Reclaim

### AI-assisted expense reimbursement with intelligent decision support.

[![UM Hackathon 2026](https://img.shields.io/badge/UM%20Hackathon-2026%20Final%20Round-blue?style=for-the-badge)](https://hackathon.um.edu.mo/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-reclaimai.dev-brightgreen?style=for-the-badge)](https://reclaimai.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.129-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.1.5-purple?style=for-the-badge)](https://langchain-ai.github.io/langgraph/)

</div>

---

## 🏆 Final Round Submission

> **Team Bogosort — UM Hackathon 2026 Final Round**

### 🌐 Live Platform

**Access the full platform at:** [**https://reclaimai.dev**](https://reclaimai.dev)

- **Employee Portal:** Submit expense claims, track approvals, and manage reimbursements
- **HR Portal:** Review policies, triage claims, and make final decisions

### 📋 Submission Documents

All final round submission materials are centralized in:

**📁 [Google Drive — Reclaim Final Round Submission](https://drive.google.com/drive/folders/1f5yyRZrRANP7g13lGEje9fE3dvRdjUnb?usp=sharing)**

**Includes:**
- 📊 **Pitch Deck** — Product overview, market positioning, team vision
- 📄 **Business Proposal** — Market analysis, financial projections, go-to-market strategy
- 🚀 **Deployment Plan** — Infrastructure setup, scaling strategy, DevOps procedures
- 🧪 **Quality Assurance Report** — Testing strategy, edge cases, performance benchmarks

### Quick Links

| Resource | Link |
|---|---|
| 🎥 **Demo & Pitch Video Pre-eliminary Round** | [Watch on YouTube](https://youtu.be/9N3So5Cx0YU) |
| 🌍 **Live Platform** | [reclaimai.dev](https://reclaimai.dev) |
| 📁 **All Submission Docs** | [Google Drive Folder](https://drive.google.com/drive/folders/1f5yyRZrRANP7g13lGEje9fE3dvRdjUnb?usp=sharing) |
| 🐙 **GitHub Repository** | [zsh-sage/reclaim](https://github.com/zsh-sage/reclaim) |

---

## 💡 About The Project

Enterprise expense reimbursement is broken. The industry standard is a **5–10 business day manual review cycle** in which HR staff open receipts one by one, cross-reference a policy PDF on a shared drive, calculate any deductions or ineligible items, and draft a response — often days later. At scale, this creates a structural bottleneck: claim volume scales linearly with headcount, but the review process stays unchanged. HR teams are buried in low-complexity compliance checks, employees wait weeks for routine reimbursements, and no auditable decision trail is produced.

**Reclaim** is an AI-native expense reimbursement platform that places an intelligent compliance agent between receipt upload and HR review. It acts as a **digital compliance officer** — reading receipts, interpreting active HR policy, detecting fraud signals, and delivering a structured, deterministic recommendation before a human ever opens a claim.

The system is built around the **Intelligent Automation + Human Oversight** model: the AI pre-classifies the entire claim volume before HR opens a single case using a **dual-condition auto-approval engine**:
1. **AI Confidence Threshold** — Claims with >70% confidence pass the first gate
2. **Policy Amount Constraint** — Claims below the HR-defined auto-approval limit (e.g., RM100) pass the second gate

When both conditions are met, claims are **automatically approved without HR review**, eliminating processing delays for routine, low-risk expenses. All other claims — edge cases, violations, fraud signals, or high-confidence rejections — are isolated for mandatory HR attention. In practice, this means HR spends zero time re-verifying a clean RM50 travel claim and full attention on the receipt that was manually inflated by 10×.

Reclaim is not a black box. Every judgment is explainable — every policy rule applied, every deduction calculated, and every AI-extracted value verified against the original document. The system is designed to **augment HR judgment, not replace it.** While low-risk claims are auto-approved, HR retains full visibility, can override any decision, and maintains final authority over the reimbursement process.

*Grounded in a real-world case study of a multinational insurance company in Indonesia, Reclaim was architected against actual reimbursement policy documents, expense categories, rank-based caps, and Business Travel Settlement forms — not synthetic requirements.*

---

## ✨ Features

### Core Reimbursement Processing

- 📸 **Multi-Modal OCR Submission**
  Employees upload up to 10 receipt files (JPEG, PNG, PDF) per submission. Image receipts are routed to **`qwen3.5-flash-02-23`** (via OpenRouter) using multimodal base64 prompting. PDF receipts are converted to markdown via **PyMuPDF4LLM** and routed to **`gemini-3.1-flash-lite-preview`** in JSON mode. Both routes extract the same structured payload: merchant name, date, amount, currency, category, items summary, confidence score, and anomaly flags. Up to 4 receipts are processed in parallel via `ThreadPoolExecutor`, keeping processing time proportional to the slowest individual receipt rather than the sum.

- 🔄 **Resilient LLM Architecture with Live Fallback**
  GLM-5.1 (ILMU API) is the primary text engine. If GLM fails or returns an empty response on any call, the system transparently retries that call using **`google/gemini-3.1-flash-lite-preview`** via OpenRouter — no request is dropped. When the fallback is triggered, a system notification is pushed to all authenticated users for 5 minutes: *"AI model degraded — using Gemini backup model."* All three agent workflows (Policy, Document, Compliance) work seamlessly on either engine.

- 🧠 **Living Policy Intelligence (Policy Studio)**
  HR uploads company policy PDFs via the Policy Studio. The **Policy Agent** runs a 5-node LangGraph pipeline: `process_pdfs → extract_categories_and_summary → extract_conditions → save_to_db → embed_and_save_sections`. Gemini is called twice — once to extract reimbursable categories and a 150-word overview summary, and once to extract per-category mandatory conditions as structured JSON. A fifth node batch-embeds all policy text chunks via `text-embedding-3-small` and writes them as `policy_sections` rows with 1536-dim **pgvector** embeddings, enabling RAG-based policy lookup by the Compliance Agent at evaluation time.

- 🚨 **The Fraud Trap — Immutable Human Edit Detection**
  After OCR, employees review extracted data in a **side-by-side verification UI**: the left panel is an editable AI-pre-filled form; the right panel is the original document. If an employee modifies any AI-extracted field, the system fires silently — setting `human_edited = True`, recording the original AI value vs. the employee-submitted value in a `change_summary` JSONB field, and assigning a risk severity: **HIGH** (amount multiplied significantly), **MEDIUM** (amount increased), **LOW** (minor field edits), or **NONE**. This fraud signal is permanent, immutable, and surfaced to HR as a prominent audit trail entry before they open the claim.

- ⚖️ **Compliance Agent — Deterministic AI Judgment**
  Upon submission, the **Compliance Agent** runs a 5-node LangGraph pipeline: `load_context → analyze_receipts → aggregate_totals → final_judgment → save_reimbursement`. Per-receipt ReAct agents run in parallel (up to 4 concurrent workers, hard-capped at 5 tool calls each), evaluating category eligibility, late submission, rank-based amount caps, and mandatory conditions against the active policy. An `aggregate_totals` node (pure Python, no LLM) calculates financial totals. A final ReAct agent synthesizes the overall verdict: **APPROVE**, **PARTIAL_APPROVE**, **REJECT**, or **MANUAL REVIEW** — with a confidence score (0.0–1.0) and a structured 2–3 sentence rationale. Any unrecoverable pipeline failure defaults to `MANUAL REVIEW`, ensuring no claim is ever silently dropped.

- 🎯 **Efficiency by Exception — Triage Dashboard**
  The HR Portal triage dashboard organizes all submitted claims into three buckets: **"Auto-Approved"** (AI confidence >0.7 AND claim amount < policy auto-approval threshold — automatically approved without HR review), **"Passed AI Review"** (APPROVE recommendation with high confidence, no HIGH-risk fraud edits, still awaiting HR confirmation), and **"Requires Attention"** (REJECT, PARTIAL_APPROVE, MANUAL REVIEW, or HIGH-risk fraud signals). Every flagged claim surfaces the specific policy clause that was violated, the exact amounts involved, the human-edit deviation detail, and the AI confidence score — in a single evidence panel. HR reviews, exercises judgment, and issues the final decision for non-auto-approved claims: Force Full Approval, Approve Adjusted Amount, or Confirm Rejection.

### Intelligent Auto-Approval

- 🤖 **Dual-Condition Auto-Approval Engine**
  When both conditions are met, the Compliance Agent automatically approves or rejects claims without requiring HR review:
  1. **AI Confidence Threshold** — The AI's compliance judgment confidence score must exceed **0.7 (70%)**
  2. **Policy Auto-Approval Constraint** — The total reimbursement amount must be below a threshold defined in the active HR policy (e.g., RM100)
  
  Claims meeting these criteria bypass HR triage and automatically transition to `APPROVED` or `REJECTED` status. This enables fast-track processing of low-risk, policy-compliant claims. Future enhancement: autonomous direct payout to employee bank accounts for approved auto-approval claims. HR retains full visibility and can override any auto-approval decision.

### User Experience & Mobile

- 📱 **Progressive Web App (PWA) with Push Notifications**
  Reclaim is a fully capable PWA, installable on desktop and mobile devices. Employees and HR staff receive real-time push notifications for claim updates, policy changes, and payout confirmations. Push notifications work across iOS, Android, and desktop browsers (with Safari support on iOS via manifest). Safe-area insets are applied on notched devices (iPhone X+, modern Android phones) for immersive, edge-to-edge UI.

- 📲 **Mobile-First Responsive Design**
  The entire Employee and HR Portal is optimized for mobile devices. Navigation is touch-friendly, form inputs are sized for thumb interaction, and the UI adapts seamlessly from small phones (320px) to tablets and desktops. PWA fullscreen mode hides browser chrome for an app-like experience.

- ✨ **Polished UI/UX with Animations**
  Landing page features accessibility-first design with smooth Framer Motion animations, deep-link demo login flows, and tight, information-dense sections. Employee and HR portals use a clean, modern design system with intuitive navigation.

---

## 🏗️ Architecture & Tech Stack

### 🖥️ Client Tier

| Technology | Version | Role |
|---|---|---|
| Next.js | `16.2.4` | React framework, App Router, Server Actions, SSR |
| React | `19.2.4` | UI component model |
| Tailwind CSS | `4` | Utility-first styling, mobile-first responsive layout |
| React Hook Form | `7.72.1` | Form state management |
| Zod | `4.3.6` | Schema-level form validation |
| TypeScript | `5` | End-to-end type safety |
| Lucide React | `1.8.0` | Icon library |
| Framer Motion | `latest` | Smooth animations and transitions |

**PWA & Notifications:**
- Web Push API — Real-time push notifications across all browsers
- Service Worker — Background sync, offline support, push event handling
- Manifest.json — Installable on mobile and desktop

### ⚙️ Application Tier

| Technology | Version | Role |
|---|---|---|
| Python FastAPI | `0.129.1` | Async REST API, auto-generated OpenAPI docs at `/docs` |
| LangGraph | `1.1.5` | Stateful agent graph orchestration (Policy & Compliance agents) |
| LangChain | `1.2.15` | LLM abstraction layer, `ChatOpenAI`-compatible client |
| LangSmith | `0.1.99` | LLM observability and distributed tracing (project: `um_hackathon`) |
| PyMuPDF4LLM | `0.27.2.2` | PDF-to-markdown conversion for document ingestion |
| Pillow | `12.2.0` | Image preprocessing (resize, compression) before vision LLM calls |
| xhtml2pdf + Jinja2 | `0.2.16` | Settlement form PDF rendering from HTML template |
| python-jose | `3.3.0` | JWT authentication |
| passlib | `1.7.4` | Password hashing |
| Uvicorn | `0.30.1` | ASGI production server |
| UV | `latest` | Python dependency and virtual environment management |

**LangGraph Agentic Pipelines:**

```text
Policy Agent (5 nodes):
  process_pdfs → extract_categories_and_summary → extract_conditions
  → save_to_db → embed_and_save_sections

Document Agent (parallel workers):
  [Image] → qwen3.5-flash-02-23 (OpenRouter, multimodal)
  [PDF]   → PyMuPDF4LLM → Gemini 3.1 Flash Lite (OpenRouter, JSON mode)
  Up to 4 concurrent ThreadPoolExecutor workers

Compliance Agent (5 nodes):
  load_context → analyze_receipts (parallel ReAct, ≤4 workers, ≤5 tool calls each)
  → aggregate_totals (pure Python) → final_judgment (ReAct, ≤3 tool calls)
  → save_reimbursement
```

### 🗄️ Data Tier

| Technology | Version | Role |
|---|---|---|
| PostgreSQL | `16` | Primary relational database (containerized via Docker) |
| SQLModel ORM | `0.0.22` | Type-safe models combining SQLAlchemy 2.0 + Pydantic 2 |
| pgvector | `0.3.6` | 1536-dim vector storage on `policy_sections` — cosine-similarity RAG queries by Compliance Agent |
| Alembic | `1.13.1` | Schema migrations with automatic column conflict prevention |

**Schema (11 tables, 3NF):** `employees` · `policies` · `policy_sections` · `travel_settlements` · `reimbursements` · `supporting_documents` · `push_subscriptions` · `notifications` · and more.

### 🤖 AI / LLMs

| Model | Provider | Route | Role |
|---|---|---|---|
| `ilmu-glm-5.1` | ILMU API | Primary text | Policy extraction, PDF receipt OCR (JSON mode), per-receipt & final compliance ReAct agents |
| `google/gemini-3.1-flash-lite-preview` | OpenRouter | Text fallback | Automatic per-call fallback when GLM fails or returns empty. Triggers a 5-minute push notification to all users. |
| `qwen/qwen3.5-flash-02-23` | OpenRouter | Vision | Image receipt OCR (JPEG/PNG) — multimodal base64 prompting |
| `text-embedding-3-small` | OpenRouter | Embedding | Policy section chunk embeddings (1536-dim, pgvector, batch at policy upload) + RAG query embeddings at evaluation time |

### 📈 Infrastructure & Observability

| Technology | Role |
|---|---|
| Docker Compose | Containerized PostgreSQL (pgvector) + FastAPI backend + Next.js frontend with persistent volumes and `.env` injection |
| LangSmith | Per-call LLM tracing, token counts, node-level debugging — project: `um_hackathon` |
| Web Push API | Real-time notifications to all authenticated clients |

### 🌐 Deployment

**Production Deployment (reclaimai.dev):**
- Docker Compose orchestration on cloud VM
- PostgreSQL 16 with pgvector
- Next.js frontend with static/dynamic rendering
- FastAPI backend with 4+ uvicorn workers
- HTTPS/SSL via reverse proxy
- Database backups and replication
- LangSmith tracing for all LLM calls

---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- [UV](https://docs.astral.sh/uv/) (Python package manager)
- Docker & Docker Compose

### 1. Clone the Repository

```bash
git clone https://github.com/zsh-sage/reclaim.git
cd reclaim
```

### 2. Environment Configuration

Copy the root `.env.example` file:

```bash
cp .env.example .env
```

```env
# Database
POSTGRES_USER=admin
POSTGRES_PASSWORD=password
POSTGRES_DB=smart_reimburse
DATABASE_URL=postgresql://admin:password@localhost:5432/smart_reimburse

# Auth
SECRET_KEY=your_secret_key_here

# CORS
FRONTEND_URLS="https://reclaimai.dev,http://localhost:3000"

# Primary text LLM (GLM-5.1 via ILMU)
LLM_API_KEY=your_ilmu_api_key
LLM_BASE_URL=https://api.ilmu.ai/v1
CHAT_MODEL=ilmu-glm-5.1

# Vision + embedding + Gemini fallback (OpenRouter)
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
VISION_MODEL=qwen/qwen3.5-flash-02-23
EMBEDDING_MODEL=openai/text-embedding-3-small

# Observability (optional — tracing disabled if unset)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
LANGCHAIN_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=um_hackathon

# Frontend + Backend (Docker Compose)
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://reclaimai.dev
INTERNAL_API_URL=http://backend:8000
```

### 3. Start the Application

Both the frontend and backend are run via Docker Compose for maximum stability and to ensure a consistent environment.

```bash
# Build and start the database, backend API, and frontend client
docker compose up --build -d
```

> **Note:** Resilience is enforced per-call via the `_GLMWithGeminiFallback` wrapper: if GLM returns an error or an empty body, the same request is retried transparently on Gemini and all authenticated users receive a temporary push notification.

The services will be available at:
- **Frontend App:** `http://localhost:3000`
- **Backend API (auto-generated docs):** `http://localhost:8000/docs`
- **Production (live):** `https://reclaimai.dev`

---

## 📖 Usage

Reclaim operates as a **two-portal system** with JWT-based, role-isolated access control.

### 🧑‍💼 Employee Portal

1. **Submit a Claim** — Select an expense category (populated from the active HR policy), upload up to 10 receipt files (JPEG, PNG, or PDF). The Document Agent processes all files in parallel, extracting structured data within seconds.

2. **Verify Extraction (The Fraud Trap)** — Review the AI-extracted fields in the side-by-side verification UI. Confirm or correct the data. Any modifications to AI-extracted amounts are silently logged as fraud signals and risk-scored before the claim enters the compliance pipeline.

3. **Track Status** — Monitor claim status (`PENDING REVIEW`, `APPROVED`, `PARTIALLY APPROVED`, `REJECTED`) with per-receipt AI verdicts and the final HR decision visible from the claims dashboard.

4. **Receive Notifications** — Get push notifications when your claim is reviewed, approved, or decision is made.

### 👩‍💻 HR Portal

1. **Policy Studio** — Upload the company reimbursement policy PDF. The Policy Agent extracts all categories, mandatory conditions, amount caps, and the auto-approval threshold into structured data. Review the AI-generated summary and conditions checklist — confirm accuracy before activating. The activated policy becomes the enforcement baseline for all subsequent claims, including the auto-approval constraint amount (e.g., RM100) used by the Compliance Agent to auto-process low-risk claims.

3. **Triage Dashboard** — Review the pre-bucketed claim queue. **"Passed AI Review"** claims are ready for fast-track approval. **"Requires Attention"** claims surface the full evidence panel: AI reasoning, specific policy clause violated, human-edit deviation detail, confidence score, and financial summary.

4. **Decision Engine** — Issue the final decision per claim: **Force Full Approval**, **Approve Adjusted Amount** (edit per-receipt amounts before finalizing), or **Confirm Rejection**. Add an HR note to communicate the decision rationale to the employee. No claim is approved or rejected without this explicit HR action.

5. **Push Notifications** — Receive alerts on new claim submissions, policy updates, and system events.

---

## 👥 Contributors

Built for **UM Hackathon 2026 Final Round** by **Team Bogosort**.

| Name | Role |
|---|---|
| **Filbert Ng** | Backend architecture; all three LangGraph agent workflows (Policy, Document, Compliance); LLM integration (ILMU GLM-5.1, OpenRouter); FastAPI API layer; LangSmith observability; Docker & deployment |
| **Chingiz Iskakov** | Database design & schema (SQLModel, Alembic migrations); backend endpoint implementation; frontend–backend API integration; PostgreSQL Docker setup; compliance agent deduction calculation |
| **Darrell Benedict Setiawan** | Frontend development (Employee & HR portals, responsive UI/UX); PWA implementation & push notifications; product documentation (PRD, SAD, QATD, Business Proposal, Deployment Plan); Pitch Deck; product testing & QA |
| **Michael** | Frontend development; UI/UX design & refinement; PWA mobile optimization; product documentation & QA |
| **Christian Rafael Santoso** | Frontend development; UI/UX design & refinement; landing page animations; product documentation & QA |

---

<div align="center">

**🏆 UM Hackathon 2026 Final Round**

*Built with intent. Deployed to production. Ready for scale.*

[🌍 Visit reclaimai.dev](https://reclaimai.dev) · [📁 Submission Documents](https://drive.google.com/drive/folders/1f5yyRZrRANP7g13lGEje9fE3dvRdjUnb?usp=sharing) · [🐙 GitHub](https://github.com/zsh-sage/reclaim)

</div>