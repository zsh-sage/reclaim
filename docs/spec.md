# Technical Specification: Smart Reimbursement Automation System (GLM SMART)

## 1. Project Overview

An end-to-end AI-driven reimbursement automation platform designed for
enterprise scale. The system allows HR to dynamically generate and edit
approval workflows using natural language, while providing employees with a
mobile-first web app to scan receipts.

The core engine utilizes **LangGraph** to orchestrate a **Vision LLM** for
extraction, a **timeline subagent** for contextual verification, and a **Main
Agent** for policy evaluation based on **RAG**.

## 2. Technology Stack

- **Frontend (Web & Mobile Web):** Next.js (React), Tailwind CSS, React Flow
  (for HR flowchart UI).
- **Backend / API:** FastAPI (Python).
- **AI Orchestration:** LangGraph, LangChain, LangSmith (for
  tracing/debugging).
- **Database:** PostgreSQL (Stores users, state checkpoints, RAG vectors via
  `pgvector`, and audit trails).
- **Object Storage (LHDN Compliance):** Digital Ocean Spaces (S3-Compatible)
  for retaining receipt images for the mandatory 7-year LHDN audit period.
- **Deployment:** Docker, Digital Ocean (Droplets or App Platform).

## 3. User Interfaces & Features

### 3.1 HR Dashboard (Workflow & Policy Manager)

A web-based control center for HR to define how the AI evaluates claims and
review flagged items.

- **Prompt-to-Workflow Builder:**
  - **Input:** HR types a prompt (e.g., "Create a workflow for Flight
    reimbursements. Require manager approval if over RM 1000. Check economy class
    policy.").
  - **Processing:** An LLM translates this prompt into a structured JSON
    ruleset.
- **UI Visualization (React Flow):** The JSON is rendered as an interactive
  flowchart showing a high-level overview (e.g., Start -> Timeline Check -> RAG
  Policy -> Rule: > RM1000 -> End).
- **Interactive Editing:** HR can click on a specific node to expand logic or
  re-prompt specific nodes without rewriting the entire workflow.
- **Knowledge Base Management (RAG):** HR can upload PDFs/Docs (Company Policy,
  Travel Guidelines) which are embedded into PostgreSQL (`pgvector`).
- **Manual Override & Escalation Queue:**
  - HR can view receipts flagged as "Fraud" or "Policy Violation" with AI
    Chain-of-Thought reasoning.
  - **Override Button:** Manually approve a flagged receipt, appending an
    `override_reason` to maintain the audit trail.

### 3.2 Employee Portal (Submission App)

A mobile-responsive Next.js web application designed for on-the-go usage.

- **Camera Module:** Integrated HTML5 `<input type="file" accept="image/*"
capture="environment">` for direct mobile browser scanning.
- **Direct-to-S3 Upload:** Images upload directly to Digital Ocean Spaces via
  signed URLs to keep the database lightweight.
- **Inputs Required:**
  - Receipt Image (Processed by Vision AI).
  - Supporting Documents (e.g., PDF proof of attendance).
  - Reimbursement Category Dropdown (Food, Hotel, Fuel, Airplane, Health).
- **Async Resolution:** If fields are missing, employees receive notifications
  to provide context, merging back into the active LangGraph thread.

## 4. Agent Architecture (LangGraph Engine)

The backend executes a stateful graph for every submitted receipt.

### Step-by-Step Execution Graph

1.  **State Initialization & Pre-Processing:**
    - Payload arrives via FastAPI; LangGraph initializes state in PostgreSQL
      (`AsyncPostgresSaver`).
    - **Duplication Check:** Calculates a Perceptual Hash (pHash). If matches
      exist, routes to Escalation Queue (Flag: Duplicate Image).
2.  **Node 1: Vision AI Extractor:**
    - Reads image via S3 URL.
    - **JSON Resiliency:** Uses `PydanticOutputParser` with a 2-attempt retry
      loop.
    - **Output:** `{category, amount, currency, date, merchant, fraud_flag,
missing_fields}`.
3.  **Node 2: Timeline Verification Subagent:**
    - Compares date/location against the employee's approved calendar.
    - Flags `suspicious_itinerary: true` if out of bounds.
4.  **Conditional Edge: Quality Control Router:**
    - `missing_fields == true` -> Pause graph, request user input.
    - `fraud_flag == true` OR `suspicious_itinerary == true` -> Route to HR
      Escalation Queue.
5.  **Node 3: Privilege-Aware RAG Fetcher:**
    - Fetches policy chunks based on category and user `privilege_level` (e.g.,
      C-Suite vs. Junior limits).
6.  **Node 4: Main Evaluator Agent (GLM SMART):**
    - Injects RAG policy, extracted data, and HR workflow rules.
    - **FX Tool:** Automatically converts non-MYR amounts using historical
      rates.
7.  **Final Node:**
    - Outputs `APPROVE` or `FLAG`. Saves the complete Chain-of-Thought and
      final MYR amount.

## 5. Data Models (PostgreSQL Schema Concept)

- **users:** `id`, `role`, `name`, `department`, `privilege_level`.
- **timelines:** `user_id`, `start_date`, `end_date`, `location`, `purpose`.
- **workflows:** `category_id`, `generated_json_logic`, `created_by`.
- **reimbursements:** `id`, `user_id`, `category`, `currency`,
  `original_amount`, `myr_amount`, `status`, `image_url`, `image_hash`,
  `override_reason`, `graph_thread_id`.
- **documents:** `pgvector` table for RAG policy embeddings.

## 6. Implementation Phases

- **Phase 1: Preparation & Mock Data:** Gather receipts (Grab, Shell, AirAsia)
  and create mock Travel Policy PDFs.
- **Phase 2: Core Backend AI & Storage:** Setup FastAPI, S3 integration, and
  the LangGraph pipeline with Pydantic retry loops.
- **Phase 3: Next.js Interfaces:** Build the mobile upload UI and the HR
  Dashboard with React Flow integration.
- **Phase 4: Deployment:** Containerize with Docker and deploy to Digital
  Ocean.
