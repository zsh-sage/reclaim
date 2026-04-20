# Reclaim - Project Status & Plan

## Current Status (As of April 20, 2026)

**Phase 1: Authentication & Core Setup is Complete**

*   **Backend (FastAPI):**
    *   Basic JWT authentication is implemented and functional.
    *   Database connection (SQLAlchemy + asyncpg) is set up.
    *   The `User` model is defined with Role-Based Access Control (HR vs. Employee).
    *   Endpoints for `/login`, `/register`, and `/me` are functional in `backend/api/auth.py`.
*   **Frontend (Next.js):**
    *   The login page (`frontend/app/login/page.tsx`) is built with a modern UI, form validation (Zod + React Hook Form), and demo login buttons.
    *   The `AuthContext` (`frontend/context/AuthContext.tsx`) is set up to handle token storage, API header injection, and role-based redirection (HR goes to `/hr/dashboard`, Employees go to `/employee/submit`).

## Upcoming Plan

Based on the project specifications (`docs/backend_plan.md` and `docs/spec.md`), the following phases are pending:

### Phase 2: Database Schema & Vector Store (pgvector)
**Goal:** Define the remaining data models and set up `pgvector` for RAG capabilities.
1.  **Expand Models (`backend/core/models.py`):** Add `Timeline`, `Workflow`, `Reimbursement`, and `Document` (using `Vector` type from `pgvector.sqlalchemy`).
2.  **Database Initialization:** Ensure `CREATE EXTENSION IF NOT EXISTS vector;` is in `database/init.sql`.
3.  **Migrations:** Initialize Alembic (`alembic init alembic`) to manage schema changes.

### Phase 3: External Integrations (S3/Spaces & LLM)
**Goal:** Connect to Digital Ocean Spaces for image storage and configure LLM/Embedding clients.
1.  **Storage Client (`backend/core/storage.py`):** Create a client for Digital Ocean Spaces (using `boto3` or `aioboto3`) to generate pre-signed URLs for direct-to-S3 uploads.
2.  **LLM Configuration:** Add API keys for the chosen LLM provider to `backend/core/config.py`.
3.  **Embeddings Utility (`backend/core/embeddings.py`):** Create a utility using LangChain to generate vector embeddings for policy documents.

### Phase 4: LangGraph AI Orchestration
**Goal:** Implement the core stateful reimbursement evaluation engine.
1.  **State Definition (`backend/agents/graph.py`):** Define `GraphState` to hold receipt data, flags, and decisions.
2.  **Prompts (`backend/agents/prompts.py`):** Define system prompts for Vision Extractor and Main Evaluator.
3.  **Tools (`backend/agents/tools.py`):** Implement `fetch_policy_rag`, `check_timeline`, and `convert_currency`.
4.  **Nodes (`backend/agents/graph.py`):** Implement `vision_extractor_node`, `timeline_verification_node`, `rag_fetcher_node`, and `main_evaluator_node`.
5.  **Graph Construction:** Build the `StateGraph` with conditional routing for quality control.
6.  **Persistence:** Configure `AsyncPostgresSaver` for state checkpointing.

### Phase 5: FastAPI Routers & Endpoints
**Goal:** Expose functionality via REST APIs for the Next.js frontend.
1.  **Reimbursement Router (`backend/api/reimbursements.py`):** Endpoints for upload URLs, submission, and status retrieval.
2.  **HR Dashboard Router (`backend/api/hr.py`):** Endpoints for workflow generation, escalations, manual overrides, and knowledge base uploads (protected by HR role).
3.  **Integration:** Include routers in `backend/main.py`.

### Phase 6: Frontend Development (Post-Auth)
**Goal:** Build the core user interfaces.
1.  **Employee Portal (`/employee/submit`):** Mobile-responsive receipt scanning, direct-to-S3 upload, and submission form.
2.  **HR Dashboard (`/hr/dashboard`):** Workflow builder (React Flow), escalation queue, and knowledge base management.
