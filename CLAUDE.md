# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Reclaim** is an AI-native expense reimbursement platform built for UM Hackathon 2026. It uses three LangGraph agentic pipelines to automate compliance evaluation of expense claims. Two user-facing portals: Employee (submit claims) and HR (policy management, triage, and decisions).

## Commands

### Full Stack (Recommended)
```bash
# Build and start all services (DB + Backend + Frontend)
docker compose up --build -d

# Services: Frontend at http://localhost:3000, Backend at http://localhost:8000
```

### Backend (standalone)
```bash
cd backend

# Install dependencies with UV
uv sync

# Run dev server (requires DB running)
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Database migrations
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "description"

# Seed demo data (runs automatically in Docker)
uv run python seed_demo_employees.py
uv run python seed_mock_policy.py
uv run python seed_mock_data.py

# Run tests
uv run pytest
uv run pytest backend/test/  # single test file
```

### Frontend (standalone)
```bash
cd frontend

npm install
npm run dev    # http://localhost:3000
npm run build
npm run lint
```

## Architecture

### Backend (`backend/`)

**Entry point:** [backend/main.py](backend/main.py) — FastAPI app, mounts all routers under `/api/v1/`, health check at `/health`.

**Layers:**
- `core/` — configuration (`config.py`), database engine (`database.py`), SQLModel ORM models (`models.py`), enums (`enums.py`), JWT auth (`security.py`)
- `api/` — FastAPI routers per domain: `auth`, `documents`, `policies`, `reimbursements`, `departments`, `notifications`. Shared deps in `deps.py`, Pydantic response schemas in `schemas.py`
- `engine/` — all AI logic:
  - `llm.py` — LLM client factory (`get_agent_llm`), GLM health check
  - `agents/` — three LangGraph pipelines (see below)
  - `tools/` — LangChain tools used by agents: `compliance_tools.py` (policy RAG, date tool), `rag_tool.py`, `change_detector.py`, `generate_reimbursement_template.py`
  - `prompts/` — system prompt strings
  - `templates/` — Jinja2 HTML templates for PDF rendering (xhtml2pdf)

**Database:** PostgreSQL 16 + pgvector. 13 SQLModel tables defined in `core/models.py`. Alembic manages migrations. The `policy_sections` table stores 1536-dim embeddings for RAG.

### Three LangGraph Agentic Pipelines

| Agent | File | Pipeline |
|---|---|---|
| Policy Agent | `engine/agents/policy_agent.py` | `process_pdfs → extract_categories_and_summary → extract_conditions → save_to_db → embed_and_save_sections` |
| Document Agent | `engine/agents/document_agent.py` | Parallel OCR workers (ThreadPoolExecutor, max 4): image → Qwen vision, PDF → PyMuPDF4LLM → Gemini text |
| Compliance Agent | `engine/agents/compliance_agent.py` | `load_context → analyze_receipts → aggregate_totals → final_judgment → save_reimbursement` |

Compliance per-receipt ReAct agents run in parallel (≤4 workers, ≤5 tool calls each). `aggregate_totals` is pure Python (no LLM). Final judgment produces: `APPROVE`, `PARTIAL_APPROVE`, `REJECT`, or `MANUAL_REVIEW`.

### LLM Configuration (`core/config.py`)

Three model roles, all configurable via `.env`:
- `CHAT_MODEL` via `LLM_BASE_URL` (primary text — currently Gemini via OpenRouter, GLM-5.1 deactivated)
- `VISION_MODEL` via `OPENROUTER_BASE_URL` (image OCR — Qwen3.5-flash)
- `EMBEDDING_MODEL` via OpenRouter (policy embeddings — text-embedding-3-small)

LangSmith tracing activates automatically when `LANGSMITH_API_KEY` and `LANGCHAIN_TRACING_V2=true` are set.

### Frontend (`frontend/`)

**Framework:** Next.js 16 App Router, TypeScript, Tailwind CSS 4, React Hook Form + Zod.

**App structure:**
- `app/login/` — shared login page (JWT stored in AuthContext)
- `app/employee/` — Employee Portal: `dashboard`, `submit`, `claims`, `history`, `settings`, `support`
- `app/hr/` — HR Portal: `dashboard`, `policy`, `review`, `view`, `history`, `settings`, `support`

**Key shared code:**
- `context/AuthContext.tsx` — JWT auth state, user role, login/logout
- `lib/api/client.ts` — Axios instance with auth headers pointing to `NEXT_PUBLIC_API_URL`
- `lib/api/` — per-domain API modules: `auth.ts`, `claims.ts`, `policies.ts`, `hr.ts`, `dashboard.ts`, `notifications.ts`, `settings.ts`
- `lib/actions/` — Next.js Server Actions

**Proxy:** `proxy.ts` used to route `INTERNAL_API_URL` (container-to-container) vs `NEXT_PUBLIC_API_URL` (browser).

## Environment Setup

Backend `.env` (copy from `backend/.env.example`):
```env
DATABASE_URL=postgresql://admin:password@localhost:5432/smart_reimburse
OPENROUTER_API_KEY=...
CHAT_MODEL=google/gemini-3.1-flash-lite-preview
VISION_MODEL=qwen/qwen3.5-flash-02-23
EMBEDDING_MODEL=openai/text-embedding-3-small
SECRET_KEY=...
LANGSMITH_API_KEY=...   # optional
```

Frontend `.env.local` (copy from `frontend/.env.example`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Key Design Constraints

- **Human-in-the-loop required:** No claim reaches `APPROVED`/`REJECTED` status without an explicit HR action. The AI produces a `judgment` field; the `status` field reflects the final HR decision.
- **Fraud trap is immutable:** When an employee edits an AI-extracted field, `human_edited=True` and the `change_summary` JSONB are written once and never overwritten. Do not add update paths for these fields.
- **Pipeline failures default to MANUAL_REVIEW:** Any unhandled exception in the Compliance Agent must resolve to `MANUAL_REVIEW`, not a dropped claim. This is enforced in the final `save_reimbursement` node.
- **GLM-5.1 is deactivated:** The `check_glm_health()` call in `main.py` and ILMU API references remain in the codebase but are bypassed. Do not remove the dead code — it may be re-enabled when upstream stabilizes.
