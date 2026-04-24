### Phase 1: Authentication & Core Setup (Priority 1) [DONE]
**Goal:** Establish secure JWT-based authentication, basic user management, and Role-Based Access Control (RBAC).

1.  **Dependencies:** Add required packages to `backend/requirements.txt`: `fastapi`, `uvicorn`, `sqlalchemy`, `asyncpg`, `passlib[bcrypt]`, `python-jose[cryptography]`, `pydantic-settings`.
2.  **Configuration (`backend/core/config.py`):** Create a `Settings` class using `pydantic-settings` to manage environment variables (e.g., `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`).
3.  **Database Connection (`backend/core/database.py`):** Set up the SQLAlchemy async engine, session maker, and declarative base.
4.  **User Model (`backend/core/models.py`):** Define the `User` SQLAlchemy model with fields: `id`, `role` (Enum: HR, Employee), `name`, `department`, `privilege_level`, and `hashed_password`.
5.  **Security Utilities (`backend/core/security.py`):** Implement functions for password hashing/verification (using `passlib`) and JWT token creation/decoding (using `python-jose`).
6.  **Schemas (`backend/api/schemas.py`):** Define Pydantic models for request/response validation (e.g., `UserCreate`, `UserResponse`, `Token`, `TokenData`).
7.  **Dependencies (`backend/api/deps.py`):** Create FastAPI dependencies:
    *   `get_db`: Yields a database session.
    *   `get_current_user`: Validates the JWT and retrieves the user.
    *   `get_current_hr_user`: RBAC dependency that ensures the current user has the 'HR' role.
8.  **Auth Router (`backend/api/auth.py`):** Implement endpoints for `/register` and `/login` (returning the JWT).
9.  **Main App (`backend/main.py`):** Initialize the FastAPI app and include the auth router.

### Phase 2: Database Schema & Vector Store (pgvector)
**Goal:** Define the remaining data models and set up `pgvector` for RAG capabilities.

1.  **Expand Models (`backend/core/models.py`):** Add the remaining SQLAlchemy models based on the spec:
    *   `Timeline`
    *   `Workflow`
    *   `Reimbursement`
    *   `Document` (Ensure you use the `Vector` type from `pgvector.sqlalchemy` for the embeddings column).
2.  **Database Initialization (`database/init.sql`):** Ensure the `CREATE EXTENSION IF NOT EXISTS vector;` command is present to enable `pgvector` in PostgreSQL.
3.  **Migrations (Optional but recommended):** Initialize Alembic (`alembic init alembic`) in the `backend/` directory to manage schema changes and generate the initial migration for all models.

### Phase 3: External Integrations (S3/Spaces & LLM)
**Goal:** Connect to Digital Ocean Spaces for image storage and configure LLM/Embedding clients.

1.  **Storage Client (`backend/core/storage.py`):** Use `boto3` (or `aioboto3`) to create a client for Digital Ocean Spaces. Implement a function to generate pre-signed URLs for direct-to-S3 uploads from the frontend.
2.  **LLM Configuration (`backend/core/config.py`):** Add API keys for your chosen LLM provider (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) to the settings.
3.  **Embeddings Utility (`backend/core/embeddings.py`):** Create a utility function using LangChain to generate vector embeddings for policy documents before inserting them into the `Document` table.

### Phase 4: LangGraph AI Orchestration
**Goal:** Implement the core stateful reimbursement evaluation engine.

1.  **State Definition (`backend/agents/graph.py`):** Define the `GraphState` (using `TypedDict` or Pydantic) to hold the receipt image URL, extracted fields, flags (`fraud_flag`, `suspicious_itinerary`, `missing_fields`), and the final decision/Chain-of-Thought.
2.  **Prompts (`backend/agents/prompts.py`):** Define the system prompts for the Vision Extractor and the Main Evaluator Agent.
3.  **Tools (`backend/agents/tools.py`):** Implement the necessary tools:
    *   `fetch_policy_rag`: Queries the `Document` table using `pgvector` similarity search.
    *   `check_timeline`: Queries the `Timeline` table.
    *   `convert_currency`: FX conversion logic.
4.  **Nodes (`backend/agents/graph.py`):** Implement the individual graph nodes as Python functions:
    *   `vision_extractor_node` (with Pydantic retry logic)
    *   `timeline_verification_node`
    *   `rag_fetcher_node`
    *   `main_evaluator_node`
5.  **Graph Construction (`backend/agents/graph.py`):** Build the `StateGraph`, add the nodes, and define the edges, including the **Conditional Edge (Quality Control Router)** to handle missing fields or escalations.
6.  **Persistence:** Configure `AsyncPostgresSaver` to enable state checkpointing for the graph.

### Phase 5: FastAPI Routers & Endpoints
**Goal:** Expose the functionality via REST APIs for the Next.js frontend.

1.  **Reimbursement Router (`backend/api/reimbursements.py`):**
    *   `POST /reimbursements/upload-url`: Returns a signed S3 URL for the mobile app to upload the receipt.
    *   `POST /reimbursements/submit`: Receives the S3 URL and metadata, creates a `Reimbursement` record, and kicks off the LangGraph workflow.
    *   `GET /reimbursements/{id}`: Retrieves the status and result of a specific claim.
2.  **HR Dashboard Router (`backend/api/hr.py`):** (All endpoints protected by `get_current_hr_user`)
    *   `POST /hr/workflows`: Accepts a natural language prompt, uses an LLM to generate a JSON ruleset, and saves it to the `Workflow` table.
    *   `GET /hr/escalations`: Fetches reimbursements flagged for review.
    *   `POST /hr/escalations/{id}/override`: Allows HR to manually approve/reject with an `override_reason`.
    *   `POST /hr/knowledge-base`: Endpoint to upload policy PDFs, chunk them, generate embeddings, and store them in the `Document` table.
3.  **Integration (`backend/main.py`):** Include the `reimbursements` and `hr` routers in the main FastAPI application.
