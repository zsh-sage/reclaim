# Reclaim Workflows - Mermaid Diagrams

## 1. Policy Agent Workflow
*LangGraph 5-node pipeline for HR policy extraction and indexing*

```mermaid
graph LR
    A["📄 Upload\nPolicy PDF"] --> B["process_pdfs\n(Convert to Markdown)"]
    B --> C["extract_categories\n_and_summary\n(LLM + JSON)"]
    C --> D["extract_conditions\n(Parse Requirements)"]
    D --> E["save_to_db\n(Store Policy)"]
    E --> F["embed_and_save\n_sections\n(RAG Vectors)"]
    F --> G["✅ Policy Ready\nfor Compliance"]
    
    style A fill:#e1f5ff
    style G fill:#c8e6c9
    style B fill:#fff9c4
    style C fill:#fff9c4
    style D fill:#fff9c4
    style E fill:#f8bbd0
    style F fill:#f8bbd0
```

---

## 2. Document Agent Workflow
*Parallel ThreadPool for receipt OCR (max 4 workers)*

```mermaid
graph LR
    A["📸 Upload Receipts\n(PDF/JPG/PNG)"] --> B["Parallel OCR\nThreadPoolExecutor\nmax_workers=4"]
    
    B --> C1["Is PDF?"]
    C1 -->|Yes| D1["PyMuPDF4LLM\n→ Text"]
    C1 -->|No| D2["Vision LLM\n(Qwen3.5)"]
    
    D1 --> E["LLM Extract JSON\n(Date, Amount, Merchant...)"]
    D2 --> E
    
    E --> F["Build Warnings\n(Unreadable? Missing Fields?)"]
    F --> G["Save to DB\n(SupportingDocument)"]
    G --> H["Create Settlement\n(TravelSettlement)"]
    
    style A fill:#e1f5ff
    style H fill:#c8e6c9
    style B fill:#fff9c4
    style C1 fill:#fff9c4
    style E fill:#fff9c4
    style F fill:#fff9c4
    style G fill:#f8bbd0
```

---

## 3. Compliance Agent Workflow
*LangGraph 5-node pipeline for receipt analysis and judgment*

```mermaid
graph LR
    A["📋 Receipts +\nPolicy"] --> B["load_context\n(DB: User, Policy,\nReceipts)"]
    B --> C["analyze_receipts\n(Per-receipt ReAct\nAgent, Parallel)"]
    C --> D["aggregate_totals\n(Pure Python\nSum & Group)"]
    D --> E["final_judgment\n(ReAct Agent\nAPPROVE/REJECT)"]
    E --> F["save_reimbursement\n(DB: Reimbursement\n+ LineItems)"]
    F --> G["📊 Result Ready\n(Judgment + Status)"]
    
    style A fill:#e1f5ff
    style G fill:#c8e6c9
    style B fill:#fff9c4
    style C fill:#fff9c4
    style D fill:#f8bbd0
    style E fill:#fff9c4
    style F fill:#f8bbd0
```

---

## 4. Main Big Workflow: OCR Receipt → Autonomous Payout via Xendit
*End-to-end flow with all decision branches*

```mermaid
graph TD
    A["🤝 Employee Submits\nReceipts + Policy"] --> B["Document Agent:\nParallel OCR"]
    
    B --> C["Receipts\nExtracted"]
    C --> D["Compliance Agent:\nAnalyze & Judge"]
    
    D --> E{"Agent Decision\n& Confidence"}
    
    E -->|REJECTED| F["❌ Auto-Reject\nNo Payout"]
    E -->|APPROVED| G{"Confidence\n> 0.7?"}
    E -->|PARTIAL| H["⏳ Manual Review\n(HR Decision)"]
    E -->|OTHER| H
    
    G -->|No| H
    G -->|Yes| I{"Has Human\nEdits?"}
    
    I -->|Yes| H
    I -->|No| J{"Over Category\nBudget?"}
    
    J -->|Yes| K["⏳ Over Budget\n(HR Review)"]
    J -->|No| L["✅ Auto-Approve\nStatus=APPROVED"]
    
    L --> M["Initiate Payout\nvia Xendit"]
    H --> N["💼 HR Reviews\n& Approves/Rejects"]
    K --> N
    
    N -->|Approve| M
    N -->|Reject| O["❌ Payout Denied\nEmployee Notified"]
    
    M --> P["Xendit API\nCreate Payout"]
    P --> Q{"Payout\nSuccess?"}
    
    Q -->|Yes| R["✅ Payout Status:\nSUCCESS"]
    Q -->|No| S["⚠️ Payout Status:\nFAILED/PENDING"]
    
    R --> T["📧 Employee\nNotification:\nPayment Sent"]
    S --> U["📧 Notification:\nPayout Failed"]
    O --> V["📧 Employee\nNotification:\nRejected"]
    
    style A fill:#e1f5ff
    style T fill:#c8e6c9
    style V fill:#ffccbc
    style U fill:#ffe0b2
    style F fill:#ffccbc
    style R fill:#c8e6c9
    style L fill:#c8e6c9
    style M fill:#f8bbd0
    style P fill:#f8bbd0
    style E fill:#fff9c4
    style G fill:#fff9c4
    style I fill:#fff9c4
    style J fill:#fff9c4
    style Q fill:#fff9c4
    style N fill:#fff9c4
```

---

## Summary Table

| Workflow | Type | Purpose | Key Decision |
|----------|------|---------|--------------|
| **Policy Agent** | LangGraph | Extract & index reimbursement policies | Categories + Conditions → RAG Index |
| **Document Agent** | Parallel OCR | Extract receipt details from images/PDFs | LLM → JSON Extraction |
| **Compliance Agent** | LangGraph | Analyze receipts against policy | APPROVED / REJECTED / MANUAL_REVIEW |
| **Main Flow** | End-to-End | OCR → Judgment → Auto-Payout | Confidence + Budget + Edits → Decision |

---

## Key Decision Points (Main Workflow)

1. **Agent Judgment**: APPROVED, REJECTED, PARTIAL, or OTHER
2. **Confidence Threshold**: > 0.7 required for auto-approval
3. **Human Edits**: Any edits → requires HR review
4. **Budget Check**: Claim > auto-approval budget → HR review
5. **Final Status**: APPROVED (auto-payout), REJECTED (no payout), REVIEW (HR action)
6. **Xendit Payout**: Only triggered after HR approval or auto-approval conditions met
