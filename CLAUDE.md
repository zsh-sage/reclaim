Reclaim is a smart reimbursements system, utilizing AI agents to extract information from receipts and documents.

Tech Stack:
- FastAPI
- UV
- LangChain
- LangGraph
- LangSmith
- Pydantic
- PostgreSQL (pgvector extension present but RAG pipeline retired)
- Openrouter (vision + embeddings)
- ILMU API (chat/text LLM)
- xhtml2pdf + Jinja2 (settlement PDF generation)
- Uvicorn

Preferences:
ILMU API Chat Model: ilmu-glm-5.1
Vision LLM: meta-llama/llama-3.2-11b-vision-instruct via OpenRouter (receipt image OCR)
Text LLM for PDFs: ilmu-glm-5.1 (same as chat, JSON mode)
Embeddings: NOT USED (RAG pipeline removed as of 2026-04-23)

.venv is inside backend folder. Use uv to manage dependencies.

Postgres database is running using docker. If you wanted to run query database, use `docker exec -it reclaim_db psql -U admin -d smart_reimburse -c "Your SQL"`. Please confirm if the DB is working or not.

Database schema is in backend/core/models.py with backend/core/database.md as a reference.

You will be working on backend/ directory. Especially with backend/engine/ folder and backend/storage/ folder.

If you wanted to commit, use this message format: `type(scope): short description`

## Running the Backend

```bash
# Docker DB must be running (docker compose up -d db)
cd backend
uv run uvicorn main:app --reload --port 8000

# Demo UI:    http://localhost:8000/test/demo
# DB Viewer:  http://localhost:8000/test/
# Swagger:    http://localhost:8000/docs
```

## DB Migration (run once after the 2026-04-23 refactor)

```sql
DROP TABLE IF EXISTS supporting_documents_embeddings;
ALTER TABLE policy_sections DROP COLUMN IF EXISTS embedding;
```

## Current Implementation Status (as of 2026-04-23)

All three AI agent workflows are fully implemented. RAG pipeline removed. Parallel receipt processing added.

### Workflow 1 — HR Policy Upload
- File: `backend/engine/agents/policy_agent.py`
- LangGraph 4-node pipeline: process_pdfs → extract_categories_and_summary → extract_conditions → save_to_db
- API: `POST /api/v1/policies/upload` (HR role required)
- Writes: Policy row only (PolicySection rows no longer written; embedding column dropped)

### Workflow 2 — Multi-Receipt OCR (Parallel)
- File: `backend/engine/agents/document_agent.py`
- Entry point: `process_receipts(files, user_id, employee_name, session, policies_db=None)`
- Parallel LLM calls via `ThreadPoolExecutor` (up to 4 workers); serial DB writes
- Routing: images → Vision LLM, PDFs → pymupdf4llm text → Text LLM (JSON mode)
- Both routes use same `RECEIPT_OCR_PROMPT_WITH_CATEGORIES` (missing fields → "Not found in Receipt")
- Categories injected from active policies; LLM outputs matched category per receipt
- PDF generation: `generate_reimbursement_template(aggregated_results, output_path)` → xhtml2pdf
- Template: `backend/engine/templates/reimbursement_template.html` (Jinja2)
- API: `POST /api/v1/documents/upload` (multiple files), `POST /api/v1/documents/generate-template`
- Writes: SupportingDocument rows (is_main=True default, document_class="RECEIPT" default)

### Workflow 3 — Compliance Analysis
- File: `backend/engine/agents/compliance_agent.py`
- LangGraph 4-node pipeline: load_context → check_conditions → build_judgment → save_reimbursement
- Direct LLM evaluation (no RAG tools) — receipt OCR data + policy conditions injected into prompt
- API: `POST /api/v1/reimbursements/analyze`
- Writes: Reimbursement row with judgment (APPROVE / FLAG / MANUAL REVIEW)

### RAG Pipeline — REMOVED (2026-04-23)
- `SupportingDocumentEmbedding` model and `supporting_documents_embeddings` table removed
- `PolicySection.embedding` field removed from model (DB column still exists — run migration above)
- `engine/tools/rag_tool.py` emptied
- No embedding calls anywhere in the codebase

### LangSmith Tracing
- All LangGraph and LangChain calls are traced automatically
- Project: `um_hackathon` — view at https://smith.langchain.com
- Enabled via env vars in `backend/.env` (LANGCHAIN_TRACING_V2, LANGCHAIN_API_KEY)
- `load_dotenv()` in `main.py` ensures vars reach `os.environ` before LangChain imports

### Test & Demo Files
- `backend/test/demo.html` — Full demo UI with login + 3 workflow tabs + DB viewer (served at /test/demo)
- `backend/test/agent_workflows.md` — Complete technical documentation for all 3 agent workflows
- `backend/test/database_looking.html` — DB table viewer (served at /test/)

### Project Map
- backend/
  - api/: auth, deps (DI/Auth), documents, policies, reimbursements, schemas. [test_ui: disposable]
  - core/: config (Env), database (SQLModel), models (SQLModel — no pgvector fields), security (JWT)
  - engine/
    - agents/: policy_agent, document_agent, compliance_agent
    - tools/: rag_tool (empty stub)
    - prompts/: document_prompts (RECEIPT_OCR_PROMPT + RECEIPT_OCR_PROMPT_WITH_CATEGORIES), policy_prompts, compliance_prompts
    - templates/: reimbursement_template.html (Jinja2 settlement form)
  - storage/: policies/, documents/{user_id}/
  - test/: agent_workflows.md, demo.html, database_looking.html, rag_testing.ipynb
  - main.py: FastAPI entry/routes
