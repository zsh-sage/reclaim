# SAD Mermaid Diagrams

All diagrams correspond to sections in `SAD_Report.md`. Each diagram is self-contained and can be rendered in any Mermaid-compatible viewer (GitHub, Notion, Obsidian, etc.).

---

## Diagram 1: System Dependency Map (Section 2.1.3)

```mermaid
graph TD
    FE["Next.js Frontend\nEmployee Portal · HR Portal\nReact 19 · Tailwind CSS 4"]
    BE["FastAPI Backend\nPython 3.13 · Uvicorn · Port 8000"]

    FE -->|"REST API /api/v1\nJWT Bearer Auth"| BE
    BE -->|"Response"| FE

    BE --> PA
    BE --> DA
    BE --> CA
    BE --> PG

    PA["Policy Agent\n5 nodes\nLangGraph"]
    DA["Document Agent\nParallel ThreadPoolExecutor\n≤4 workers"]
    CA["Compliance Agent\n5 nodes · ReAct\nLangGraph"]

    PG["PostgreSQL 16\nDocker Container\nemployees · policies\npolicy_sections\ntravel_settlements\nreimbursements\nsupporting_documents"]

    PA -->|"write policies\npolicy_sections + embeddings"| PG
    DA -->|"write supporting_documents\ntravel_settlements"| PG
    CA -->|"write reimbursements"| PG

    ILMU["ILMU API\nGLM-5.1\nText · Chat · JSON mode · ReAct\nTool-calling"]
    OR["OpenRouter\nLlama 3.2 Vision 11B — Image OCR\ntext-embedding-3-small — 1536-dim embeddings"]

    PA -->|"Chat LLM × 2\ncategory + conditions"| ILMU
    DA -->|"PDF → JSON mode"| ILMU
    DA -->|"Image → multimodal"| OR
    PA -->|"Batch embedding\npolicy sections"| OR
    CA -->|"ReAct agents × N+1"| ILMU
    CA -->|"RAG query embedding\nsearch_policy_rag"| OR

    LS["LangSmith\nObservability\nProject: um_hackathon"]
    PA -->|"Auto-traced"| LS
    DA -->|"Auto-traced"| LS
    CA -->|"Auto-traced"| LS
```

---

## Diagram 2: Context Window Flow per LLM Call (Section 2.1.3)

```mermaid
flowchart TD
    subgraph W1["Workflow 1 — Policy Agent"]
        direction TB
        N2["Node 2: extract_categories_and_summary\nInput: policy markdown ≤80k chars\n+ POLICY_CATEGORY_SUMMARY_PROMPT\nOutput: title, categories[], overview_summary\nModel: GLM-5.1"]
        N3["Node 3: extract_conditions\nInput: categories[] + markdown ≤80k chars\n+ POLICY_CONDITIONS_PROMPT\nOutput: mandatory_conditions JSON\nModel: GLM-5.1"]
        N5["Node 5: embed_and_save_sections\nNo LLM prompt — batch embedding call\nModel: text-embedding-3-small via OpenRouter\nInput: markdown chunks ~1000 chars each\nOutput: PolicySection rows with 1536-dim vectors"]
        N2 --> N3
        N3 --> N5
    end

    subgraph W2["Workflow 2 — Document Agent (parallel ≤4 workers)"]
        direction TB
        IMG["Image receipt\nInput: base64 image + OCR prompt\n+ active category list\nModel: Llama 3.2 Vision via OpenRouter\nOutput: extracted_data JSON"]
        PDF["PDF receipt\nInput: PyMuPDF4LLM markdown ≤8000 chars\n+ OCR prompt + categories\nModel: GLM-5.1 JSON mode\nOutput: extracted_data JSON"]
    end

    subgraph W3["Workflow 3 — Compliance Agent"]
        direction TB
        PER["Per-receipt ReAct agents (parallel ≤4 workers)\nInput: employee context + single receipt JSON\n+ mandatory_conditions + currency\nTools: get_current_date, search_policy_rag\n  (pgvector cosine search + keyword fallback)\nMax tool calls: 5\nModel: GLM-5.1 tool-calling\nOutput: line_item JSON per receipt"]
        AGG["aggregate_totals (pure Python — no LLM)\nInput: all line_items[]\nOutput: totals by_category dict"]
        FINAL["Final judgment ReAct agent (single)\nInput: all line_items[] + totals dict\n+ policy overview ≤150 words\nTools: search_policy_rag\n  (pgvector cosine search + keyword fallback)\nMax tool calls: 3\nModel: GLM-5.1 tool-calling\nOutput: judgment, confidence, summary"]
        PER --> AGG
        AGG --> FINAL
    end

    W1 --> DB1["DB: policies table\npolicy_sections table with embeddings"]
    W2 --> DB2["DB: supporting_documents\ntravel_settlements"]
    W3 --> DB3["DB: reimbursements"]
```

---

## Diagram 3: Sequence Diagram — End-to-End Claim Submission Flow (Section 2.1.4)

```mermaid
sequenceDiagram
    actor Employee as Employee Portal
    participant API as FastAPI Backend
    participant DocAgent as Document Agent
    participant CompAgent as Compliance Agent
    actor HR as HR Portal

    Employee->>API: POST /api/v1/auth/login
    API-->>Employee: JWT access_token

    Employee->>API: POST /api/v1/documents/upload (multipart: 1-10 receipt files)
    API->>DocAgent: process_receipts(files, user_id, employee_name, session)

    par Parallel OCR up to 4 workers
        DocAgent->>DocAgent: Images → Llama 3.2 Vision (OpenRouter)
        DocAgent->>DocAgent: PDFs → GLM-5.1 JSON mode (ILMU API)
    end

    DocAgent->>DocAgent: Warnings check per receipt
    DocAgent->>DocAgent: Save supporting_documents rows (serial)
    DocAgent->>DocAgent: Create travel_settlements row
    DocAgent-->>API: settlement_id, receipts[], totals
    API-->>Employee: DocumentUploadResponse

    Note over Employee: Employee reviews verification screen

    opt Employee corrects OCR errors
        Employee->>API: POST /api/v1/documents/{document_id}/edits
        API->>API: detect_changes(original, edited) → change_summary
        API->>API: Set human_edited=True, overall_risk level
        API-->>Employee: EditDocumentResponse
    end

    Employee->>API: POST /api/v1/reimbursements/analyze {settlement_id, policy_id, all_category[]}
    API->>CompAgent: run_compliance_workflow(settlement_id, policy_id, ...)

    CompAgent->>CompAgent: load_context — DB: User, Policy, Settlement + human_edit metadata

    par Per-receipt ReAct agents parallel up to 4 workers
        CompAgent->>CompAgent: GLM-5.1 ReAct x N — eligibility, caps, late submission
    end

    CompAgent->>CompAgent: aggregate_totals — sum line_items by category (pure Python)
    CompAgent->>CompAgent: final_judgment — GLM-5.1 ReAct x 1 — overall judgment + confidence
    CompAgent->>CompAgent: save_reimbursement → DB: reimbursements

    CompAgent-->>API: reim_id, judgment, line_items[], totals, confidence
    API-->>Employee: AnalyzeResponse

    Note over Employee: Claim enters HR queue (status = REVIEW)

    HR->>API: GET /api/v1/reimbursements
    API-->>HR: Claims bucketed by AI judgment — Requires Attention / Passed AI Review

    Note over HR: HR reviews full audit trail

    HR->>API: PATCH /api/v1/reimbursements/{reim_id}/status {status: APPROVED | REJECTED}
    API->>API: Role check HR only → update status
    API-->>HR: Updated reimbursement record
```

---

## Diagram 4: Data Flow Diagram — Level 1 (Section 2.3.1.1)

```mermaid
flowchart TD
    HR(["HR"])
    EMP(["Employee"])
    LLMAPI(["LLM APIs\nILMU · OpenRouter"])

    subgraph FastAPI["FastAPI Application — Correct Operational Order"]
        direction TB
        P5["P5: Policy Management\nPOST /policies/upload\nInvokes Policy Agent\nHR must run FIRST"]
        P1["P1: Auth Management\nlogin · register · JWT issue"]
        P2["P2: Receipt Ingestion\nPOST /documents/upload\nPOST /documents/id/edits\nInvokes Document Agent"]
        P3["P3: Compliance Analysis\nPOST /reimbursements/analyze\nInvokes Compliance Agent\nRequires P5 policy + P2 settlement"]
        P4["P4: HR Decision Processing\nPATCH /reimbursements/id/status\nHR role enforced"]
    end

    subgraph DB["PostgreSQL — Data Stores"]
        direction TB
        D1["D1: employees"]
        D2["D2: policies"]
        D3["D3: policy_sections\n1536-dim embeddings"]
        D4["D4: travel_settlements"]
        D5["D5: reimbursements"]
        D6["D6: supporting_documents"]
    end

    HR -->|"policy PDFs + alias"| P5
    P5 -->|"Chat LLM x2 + Embedding LLM batch"| LLMAPI
    P5 -->|"write"| D2
    P5 -->|"write sections + embeddings"| D3

    EMP -->|"email + password"| P1
    P1 -->|"read"| D1

    EMP -->|"receipt files JPEG/PNG/PDF"| P2
    EMP -->|"edited field values"| P2
    P2 -->|"Vision LLM images\nText LLM PDFs"| LLMAPI
    P2 -->|"read user context"| D1
    P2 -->|"write"| D6
    P2 -->|"write"| D4

    EMP -->|"settlement_id, policy_id"| P3
    D2 -->|"read active policy + conditions"| P3
    D3 -->|"RAG cosine vector search"| P3
    D4 -->|"read settlement basket"| P3
    P3 -->|"Chat LLM ReAct x N+1\nEmbedding LLM RAG queries"| LLMAPI
    P3 -->|"write"| D5
    P3 -->|"judgment, line_items"| EMP

    HR -->|"APPROVED / REJECTED"| P4
    P4 -->|"read + write status"| D5
    P4 -->|"final decision"| HR
```

---

## Diagram 5: Entity Relationship Diagram — Normalized Database Schema (Section 2.3.2)

```mermaid
erDiagram
    employees {
        UUID user_id PK
        string email "unique"
        string hashed_password
        string name
        string role "HR or Employee"
        string department "nullable"
        int rank "default 1 nullable"
        string privilege_level "default Standard nullable"
        string user_code "nullable"
    }

    policies {
        UUID policy_id PK
        string alias
        string title
        jsonb reimbursable_category "List[str]"
        datetime effective_date
        text overview_summary
        text mandatory_conditions "JSON-serialized dict"
        string source_file_url
        string status "ACTIVE or DRAFT or ARCHIVED"
        datetime created_at
    }

    policy_sections {
        UUID section_id PK
        UUID policy_id FK
        text content "markdown chunk ~1000 chars"
        jsonb metadata_data "source_file chunk_index"
        vector embedding "pgvector 1536-dim ACTIVE for RAG"
    }

    travel_settlements {
        UUID settlement_id PK
        UUID reimbursement_id FK "deferred FK to reimbursements nullable"
        string employee_id "plain str NOT a FK denormalized copy of user_id"
        string employee_name "nullable"
        string employee_code "nullable"
        string employee_department "nullable"
        int employee_rank "nullable"
        string destination "nullable"
        string departure_date "nullable"
        string arrival_date "nullable"
        string location "nullable"
        bool overseas "nullable"
        string purpose "nullable"
        string currency "nullable"
        string document_path "nullable"
        jsonb receipts "List of extracted receipt dicts"
        jsonb totals "transportation accommodation meals others grand_total currency"
        jsonb all_category "List[str] unique categories"
        string main_category "most frequent category nullable"
        datetime created_at
    }

    reimbursements {
        UUID reim_id PK
        UUID user_id FK
        UUID policy_id FK "nullable"
        UUID settlement_id FK "nullable"
        string main_category
        jsonb sub_category "List[str]"
        string employee_department "nullable"
        int employee_rank "default 1"
        string currency
        jsonb totals "total_requested total_deduction net_approved by_category"
        jsonb line_items "List of per-receipt AI verdicts"
        string judgment "APPROVE or REJECT or PARTIAL_APPROVE or MANUAL REVIEW"
        float confidence "0.0 to 1.0 nullable"
        text summary
        string status "REVIEW or APPROVED or REJECTED or PAID default REVIEW"
        datetime created_at
        datetime updated_at
    }

    supporting_documents {
        UUID document_id PK
        UUID reim_id FK "nullable"
        UUID settlement_id FK "nullable"
        UUID user_id FK
        text name "original filename"
        string path "relative storage path"
        string type "image or pdf"
        bool is_main "default true"
        string document_class "default RECEIPT"
        jsonb extracted_data "OCR output from LLM"
        jsonb editable_fields "human corrections"
        bool human_edited "default false"
        jsonb change_summary "has_changes overall_risk changes_by_field"
        datetime created_at
    }

    employees ||--o{ reimbursements : "user_id FK"
    employees ||--o{ supporting_documents : "user_id FK"
    policies ||--o{ policy_sections : "policy_id FK"
    policies ||--o{ reimbursements : "policy_id FK nullable"
    reimbursements ||--o{ supporting_documents : "reim_id FK nullable"
    reimbursements ||--o| travel_settlements : "reimbursement_id deferred FK nullable"
    travel_settlements ||--o{ supporting_documents : "settlement_id FK nullable"
    reimbursements }o--|| travel_settlements : "settlement_id FK nullable"
```

> **Note on `travel_settlements.employee_id`**: This is a plain `str` column — it stores a copy of the user's UUID as a string for PDF template rendering, but carries **no FK constraint** in the database. The formal relationship between employees and their travel settlements is tracked via `reimbursements.user_id → employees.user_id`.

---

## Diagram 6: AI Agent Workflow — LangGraph Node Pipelines (Reference)

```mermaid
flowchart TD
    subgraph W1["Workflow 1 — Policy Agent (HR uploads policy PDF)"]
        direction LR
        A1["process_pdfs\nPyMuPDF4LLM → markdown"]
        A2["extract_categories_and_summary\nGLM-5.1\ntitle, categories[]"]
        A3["extract_conditions\nGLM-5.1\nmandatory_conditions"]
        A4["save_to_db\npolicies row"]
        A5["embed_and_save_sections\ntext-embed-3-small\npolicy_sections rows\n1536-dim vectors"]
        A1 --> A2 --> A3 --> A4 --> A5
    end

    subgraph W2["Workflow 2 — Document Agent (Employee uploads receipts)"]
        direction LR
        B1["Get Active Categories\nfrom DB"]
        B2["Parallel OCR\nThreadPoolExecutor ≤4 workers"]
        B3["Image → Llama 3.2 Vision\nOpenRouter"]
        B4["PDF → GLM-5.1\nJSON mode"]
        B5["Warnings Check"]
        B6["Save supporting_documents\nserial"]
        B7["Create travel_settlements"]
        B1 --> B2
        B2 --> B3
        B2 --> B4
        B3 --> B5
        B4 --> B5
        B5 --> B6
        B6 --> B7
    end

    subgraph W3["Workflow 3 — Compliance Agent (Employee submits for analysis)"]
        direction LR
        C1["load_context\nDB: User, Policy\nSettlement + human_edit"]
        C2["analyze_receipts\nParallel ReAct ≤4 workers\nGLM-5.1 x N\nmax 5 tool calls each"]
        C3["aggregate_totals\nPure Python\nsum line_items by category"]
        C4["final_judgment\nReAct x 1\nGLM-5.1\nmax 3 tool calls"]
        C5["save_reimbursement\nreimbursements row"]
        C1 --> C2 --> C3 --> C4 --> C5
    end
```
