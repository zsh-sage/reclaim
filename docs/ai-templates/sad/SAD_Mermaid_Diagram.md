# SAD Mermaid Diagrams

All diagrams correspond to sections in `SAD_Report.md`. Each diagram is self-contained and can be rendered in any Mermaid-compatible viewer (GitHub, Notion, Obsidian, etc.).

---

## Diagram 1: System Dependency Map (Section 2.1.3)

```mermaid
flowchart LR
    subgraph ClientTier["Client Tier"]
        FE["Next.js Frontend\nEmployee Portal · HR Portal\nReact 19 · Tailwind CSS 4"]
    end

    subgraph AppTier["Application Tier"]
        BE["FastAPI Backend\nPython 3.13 · Uvicorn · Port 8000"]
        subgraph AGENTS["AI Agent Layer"]
            direction TB
            PA["Policy Agent\n5 nodes · LangGraph"]
            DA["Document Agent\n≤4 parallel workers"]
            CA["Compliance Agent\n5 nodes · ReAct · LangGraph"]
        end
        BE --> PA
        BE --> DA
        BE --> CA
    end

    PG["PostgreSQL 16 · Docker\nemployees · policies · policy_sections\ntravel_settlements · reimbursements\nsupporting_documents"]
    ILMU["ILMU API · GLM-5.1\nChat · JSON mode · ReAct · Tool-calling"]
    OR["OpenRouter\nGLM-4.6 Vision 11B\ntext-embedding-3-small · 1536-dim"]
    LS["LangSmith · Observability\nProject: um_hackathon"]

    FE -->|"REST API /api/v1 · JWT Bearer Auth"| BE
    BE -->|"HTTP Response"| FE

    AGENTS -->|"write policies · documents · reimbursements"| PG
    AGENTS -->|"Chat · ReAct · JSON mode LLM calls"| ILMU
    AGENTS -->|"Vision OCR · Batch embedding · RAG queries"| OR
    AGENTS -->|"Auto-traced"| LS
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
        IMG["Image receipt\nInput: base64 image + OCR prompt\n+ active category list\nModel: GLM-4.6 Vision via OpenRouter\nOutput: extracted_data JSON"]
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
        DocAgent->>DocAgent: Images → GLM-4.6 Vision (OpenRouter)
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

## Diagram 4a: DFD — HR Policy Setup (Section 2.3.1.1)

```mermaid
flowchart LR
    HR(["HR"])
    P5["P5: Policy Management\nPOST /policies/upload\nInvokes Policy Agent"]
    D2["D2: policies"]
    D3["D3: policy_sections\n1536-dim embeddings"]
    LLMAPI(["LLM APIs\nILMU · OpenRouter"])

    HR -->|"policy PDF + alias"| P5
    P5 -->|"write policy"| D2
    P5 -->|"write sections + embeddings"| D3
    P5 -->|"Chat LLM x2 + Batch embedding"| LLMAPI
```

---

## Diagram 4b: DFD — Employee Auth & Receipt Submission (Section 2.3.1.1)

```mermaid
flowchart LR
    EMP(["Employee"])
    P1["P1: Auth Management\nlogin · register · JWT issue"]
    P2["P2: Receipt Ingestion\nPOST /documents/upload\nInvokes Document Agent"]
    D1["D1: employees"]
    D4["D4: travel_settlements"]
    D6["D6: supporting_documents"]
    LLMAPI(["LLM APIs\nILMU · OpenRouter"])

    EMP -->|"email + password"| P1
    EMP -->|"receipt files JPEG/PNG/PDF"| P2

    P1 -->|"read credentials"| D1
    P2 -->|"read user context"| D1
    P2 -->|"write receipts"| D6
    P2 -->|"write settlement"| D4
    P2 -->|"Vision LLM · Text LLM"| LLMAPI
```

---

## Diagram 4c: DFD — Compliance Analysis & HR Decision (Section 2.3.1.1)

```mermaid
flowchart LR
    EMP(["Employee"])
    HR(["HR"])
    P3["P3: Compliance Analysis\nPOST /reimbursements/analyze\nInvokes Compliance Agent"]
    P4["P4: HR Decision\nPATCH /reimbursements/status\nHR role enforced"]
    D2["D2: policies"]
    D3["D3: policy_sections\n1536-dim embeddings"]
    D4["D4: travel_settlements"]
    D5["D5: reimbursements"]
    LLMAPI(["LLM APIs\nILMU · OpenRouter"])

    EMP -->|"settlement_id · policy_id"| P3
    HR -->|"APPROVED / REJECTED"| P4

    P3 -->|"reads active policy"| D2
    P3 -->|"RAG cosine search"| D3
    P3 -->|"reads settlement basket"| D4
    P3 -->|"write reimbursement"| D5
    P3 -->|"ReAct LLM x N+1 · RAG"| LLMAPI

    P4 -->|"read + write status"| D5
```

---

## Diagram 5: Entity Relationship Diagram — Normalized Database Schema (Section 2.3.2)

```mermaid
%%{init: {'er': {'layoutDirection': 'LR'}}}%%
erDiagram
    departments {
        UUID        department_id           PK
        string      name                    ""
        string      cost_center_code        "nullable"
    }

    employees {
        UUID        user_id                 PK
        UUID        department_id           FK "nullable"
        string      user_code               "nullable"
        string      email                   "unique"
        string      hashed_password         ""
        string      name                    ""
        string      role                    "UserRole"
        string      privilege_level         "PrivilegeLevel"
        int         rank                    "default 1"
        bool        is_active               "default true"
        datetime    created_at              "nullable"
    }

    policies {
        UUID        policy_id               PK
        UUID        created_by              FK
        string      alias                   ""
        string      title                   ""
        datetime    effective_date          ""
        datetime    expiry_date             "nullable"
        text        overview_summary        ""
        text        mandatory_conditions    ""
        string      source_file_url         ""
        jsonb       reimbursable_categories "List[str]"
        string      status                  "PolicyStatus"
        datetime    created_at              ""
    }

    policy_sections {
        UUID        section_id              PK
        UUID        policy_id               FK
        text        content                 "markdown chunk"
        jsonb       metadata_data           ""
        vector      embedding               "1536-dim"
    }

    travel_settlements {
        UUID        settlement_id           PK
        UUID        user_id                 FK
        string      document_path           "nullable"
        string      main_category           "nullable"
        string      destination             "nullable"
        date        departure_date          "nullable"
        date        arrival_date            "nullable"
        string      location                "nullable"
        bool        overseas                "nullable"
        string      purpose                 "nullable"
        string      currency                "nullable"
        Decimal     total_claimed_amount    "nullable"
        Decimal     total_approved_amount   "nullable"
        Decimal     total_rejected_amount   "nullable"
        jsonb       categories              "List[str]"
        datetime    created_at              ""
    }

    settlement_receipts {
        UUID        receipt_id              PK
        UUID        settlement_id           FK
        UUID        document_id             FK "nullable"
        string      merchant_name           "nullable"
        date        receipt_date            "nullable"
        string      category                "nullable"
        Decimal     claimed_amount          "nullable"
        string      currency                "nullable"
    }

    reimbursements {
        UUID        reim_id                 PK
        UUID        user_id                 FK
        UUID        policy_id               FK "nullable"
        UUID        settlement_id           FK "nullable"
        UUID        reviewed_by             FK "nullable"
        string      main_category           ""
        jsonb       sub_categories          "List[str]"
        string      currency                ""
        Decimal     total_claimed_amount    ""
        Decimal     total_approved_amount   "nullable"
        Decimal     total_rejected_amount   "nullable"
        string      judgment                "JudgmentResult"
        float       confidence              "nullable"
        jsonb       ai_reasoning            ""
        string      summary                 ""
        string      status                  "ReimbursementStatus"
        datetime    reviewed_at             "nullable"
        datetime    created_at              ""
        datetime    updated_at              ""
    }

    line_items {
        UUID        line_item_id            PK
        UUID        reim_id                 FK
        UUID        document_id             FK "nullable"
        UUID        policy_section_ref      FK "nullable"
        string      description             ""
        string      category                ""
        float       quantity                "default 1.0"
        Decimal     unit_price              "nullable"
        Decimal     claimed_amount          ""
        Decimal     approved_amount         "nullable"
        string      currency                ""
        date        expense_date            "nullable"
        string      judgment                "nullable"
        string      rejection_reason        "nullable"
    }

    supporting_documents {
        UUID        document_id             PK
        UUID        reim_id                 FK "nullable"
        UUID        settlement_id           FK "nullable"
        UUID        user_id                 FK
        string      name                    "original filename"
        string      path                    "relative path"
        string      type                    "image or pdf"
        bool        is_main                 "default true"
        string      document_class          "default RECEIPT"
        jsonb       extracted_data          "OCR output"
        jsonb       editable_fields         "human corrections"
        bool        human_edited            "default false"
        jsonb       change_summary          "has_changes"
        datetime    created_at              "nullable"
    }

    document_change_logs {
        UUID        log_id                  PK
        UUID        document_id             FK
        UUID        changed_by              FK
        string      field_name              ""
        string      old_value               "nullable"
        string      new_value               "nullable"
        datetime    changed_at              ""
    }

    reimbursements }o--|| policies : "governed_by"
    reimbursements |o--|| travel_settlements : "generated_from"
    reimbursements ||--o{ line_items : "contains"
    
    policies }o--|| employees : "created_by"
    policies ||--o{ policy_sections : "contains"
    
    travel_settlements }o--|| employees : "submitted_by"
    travel_settlements ||--o{ settlement_receipts : "contains"
    
    line_items }o--|| policy_sections : "violates_section"
    
    settlement_receipts }o--|| supporting_documents : "references_doc"
    line_items }o--|| supporting_documents : "references_doc"
    
    supporting_documents ||--o{ document_change_logs : "tracks"
    
    employees }o--|| departments : "belongs_to"
```

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
        B3["Image → GLM-4.6 Vision\nOpenRouter"]
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
