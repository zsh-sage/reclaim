## **PRODUCT REQUIREMENT DOCUMENT (PRD)** 

**Reclaim - AI-assisted expense reimbursement with intelligent decision support.** 

## **Project Name : Reclaim - (AI-assisted expense reimbursement with intelligent decision support.** 

## **Version : (MVP v1.0)** 

## **1. Project Overview** 

## **1.1 Problem Statement** must include: 

- The scale problem — high volume of reimbursement requests in organizations 

- The manual review burden on HR teams 

- Consequences — human error, delays, inefficiency 

- Impact on both HR and employees 

## **1.2 Target Domain** must include: 

- Who this is for — enterprise/organizational HR teams 

- The specific domain — employee expense reimbursement management 

- Clarify that the solution **augments** HR, not replaces them 

## **1.3 Proposed Solution Summary** must include: 

- The name of the platform — **Reclaim** 

- How it works at a high level — AI agent cross-references receipts with HR policy 

- The technology angle — LLM vision model to read and interpret receipt images 

- The three possible outputs — Approved, Partially Approved, Rejected 

- The advisory-only nature — HR retains final decision authority 

## **2. Background & Business Objective** 

## **2.1 Background of the Problem** must include: 

- Reimbursement review has long been a **manual, paper-heavy process** in most organizations 

- HR teams are required to **individually verify each receipt** against company policy 

- As organizations grow, the **volume of claims increases** but the review process remains unchanged 

- This creates a bottleneck — **one HR personnel can only process so many claims** at a time 

- This problem is most **prominent in medium to large organizations** where the volume of reimbursement claims makes manual review operationally unsustainable 

## **2.2 Importance of Solving This Issue** must include: 

- Unresolved, this problem leads to **delayed reimbursements, frustrated employees and overworked HR** 

- Inconsistent decisions arise when **different HR staff interpret the same policy differently** 

- Compliance risk — **non-compliant claims can slip through** due to human oversight 

- Solving this directly improves **HR operational efficiency and employee trust** 

## **2.3 Strategic Fit / Impact** must include: 

- Reclaim introduces **AI as a productivity layer** on top of existing HR workflows 

- Reclaim is positioned for **mid to large-scale organizations** looking to modernize their HR operations 

- Enables organizations to **scale reimbursement operations** without increasing HR headcount 

- Promotes **responsible AI adoption** — AI recommends, human decides 

- Builds a foundation for **auditable, policy-consistent** reimbursement decisions 

## **Section 3: Product Purpose** 

## **3.1 Main Goal of the System** must include: 

- Reclaim is built to **reduce the time and effort** HR spends reviewing reimbursement claims 

- The system acts as an **AI-powered review assistant** that pre-evaluates each claim before HR makes the final call 

- The core goal is to bring **consistency, speed and accuracy** into the reimbursement review process 

- Reinforce that the system is **advisory only** — the final approval authority always remains with HR 

## **3.2 Target Audience** must include: 

## ● **Target Organizations** _(company size)_ 

   - Primary: Medium to large enterprises 

   - Secondary: Growing SMEs that are beginning to experience high claim volumes 

- **Target Users** _(by role within those organizations)_ 

   - HR Personnel — manages policy and reviews AI recommendations 

   - Finance / Accounting — secondary reference for reporting and auditing 

   - Employees — submits reimbursement claims and receipts 

## **Section 4: System Functionalities** 

## **4.1 Description** must include: 

- A high level overview of how the system operates end to end — from employee submission to HR final decision 

- Mention that the system consists of **two main interfaces** — Employee View and HR View 

- Highlight that an **AI agent sits at the core** of the system, connecting policy and claims together 

- Reinforce the **advisory only** nature of the AI — it processes and recommends, HR executes 

## **4.2 Key Functionalities** must include: 

- **Unstructured Data Ingestion & Pre-processing** 

   - System accepts raw receipt images uploaded by employees 

   - Pre-processes images before passing to AI pipeline 

- **Categorized Data Extraction** 

   - Extracts key receipt fields based on **categories defined by HR policy** — not hardcoded default 

- **Policy Ingestion & Parsing** 

   - HR uploads company reimbursement policy via **Policy Studio** 

   - Policy is converted into **strict JSON criteria** for deterministic AI evaluation 

- **Central Orchestration via ReAct Agent Loop** must include: 

   - Ingests receipt data and JSON criteria 

   - Output is determined by **AI analysis and confidence level** 

   - Concludes with **Approved or Flagged** status attached with a **confidence** 

## **percentage** 

- **Audit Trail Log & Policy Scorecards** must include: 

   - Documents every reasoning step 

   - Logs **original AI-extracted value vs manually edited value** by employee 

   - HR is alerted when a significant manual edit is detected 

   - HR and employee receive transparent feedback on each decision 

- **Audit Trail Log & Policy Scorecards** 

   - Every reasoning step is documented and mapped into a structured database 

   - HR and employees receive transparent, actionable feedback on each decision 

## ● **HR Decision Execution** 

- HR can **manually edit mandatory conditions** generated by AI summary before finalizing 

- HR reviews AI recommendation and makes the final call 

- No auto-execution by the system 

## **4.3 AI Model & Prompt Design** must include: 

## **4.3.1 Model Selection** 

- LLM used is **GLM-5.1** for reasoning and orchestration 

- OCR and vision processing is handled by **GLM 4.6 V** , Embedding is handled by **OpenAI - Text Embedding Small 3** 

- Explain why each model was selected for its specific role 

**4.3.2 Prompting Strategy** [PLEASE VERIFY WITH THE SAD, BECAUSE I DON’T THINK THERE IS THIS STRATEGY] 

- Stateful iterative prompting strategy 

- AI acts as an auditor constrained by a while loop 

- Outputs either a **"Need Tool"** command or a **final status command** 

## **4.3.3 Context & Input Handling** 

- RAG architecture for dynamic policy retrieval — confirmed still implemented 

- JSON schema enforced output to prevent hallucinations 

- Retrieved policy chunks injected into context window per claim category 

**4.3.4 Fallback & Failure Behavior** [PLEASE VERIFY WITH THE SAD, BECAUSE I DON’T THINK THERE IS THIS STRATEGY] 

- Tool hallucination retry mechanism 

- ReAct loop iteration hard cap 

- OCR failure and duplication check handling 

## **5. User Stories & Use Cases** 

## **5.1 User Stories must include:** 

- **Employee Perspective:** Focus on the speed of data extraction and the benefit of instant feedback on whether their claim meets the policy, reducing the "waiting game." 

- **HR Manager Perspective:** Focus on the "Policy Studio" and the "Audit Trail Log"—the ability to upload rules and receive a reasoned, transparent recommendation to trust the AI's judgment. 

- **Finance/Audit Perspective:** Focus on security and integrity, specifically the automated detection of duplicate receipts and policy violations. 

## **5.2 HR Policy Configuration Flow must include:** 

- **From Unstructured to Structured:** HR uploads a standard policy (PDF/Prompt); the system uses RAG to convert these into strict **JSON Criteria** . 

- **Source of Truth:** These JSON rules are stored as the exact constraints that the AI agent must follow during the review process. 

## **5.3 AI-Assisted Claim Review Flow (The Advisory Path) must include:** 

- **Initial Processing:** Employee uploads an image; the system performs OCR (using Llama) and runs a **duplication check** . 

- **The ReAct Orchestrator:** The GLM-5.1 agent enters a "while loop" to reason through the claim, dynamically retrieving the specific JSON policy criteria via RAG. 

- **Reasoning vs. Execution:** The agent concludes with a recommendation status (Approved, Partial, or Rejected) and a **Policy Scorecard** , but does **not** finalize the transaction. 

- **Audit Trail Generation:** Every step of the AI's reasoning is logged so HR can see _why_ the recommendation was made. 

## **5.4 Exception & Flagging Flow must include:** 

- **Discrepancy Detection:** How the agent handles "Flagged" items (e.g., a weekend receipt when the policy only allows weekday claims). 

- **Transparent Justification:** The system provides the specific reason for the flag or partial approval to both HR and the employee. 

- **Human-in-the-Loop:** The workflow ends with the HR officer reviewing the flag and making the final manual decision. 

## **6. Features Included (Scope Definition)** must include: 

## ● **Multi-Modal Ingestion & Pre-Processing** 

   - Dual-engine extraction using **GLM 4.6 V** to process unstructured receipts and invoices (images/PDFs) 

- **Automated Categorization** 

   - Categories are **dynamically generated based on HR-uploaded policy** in the Policy Studio 

   - Category selection is only available to employees **if the corresponding policy exists** 

- **Pre-Processing Loops** 

   - Built-in duplication detection and basic fraud flagging before AI processing begins 

- **Dynamic Agentic Reasoning Engine** 

   - Continuous ReAct loop that decides between executing backend tools or rendering final judgment [PLEASE VERIFY WITH THE SAD, BECAUSE I DON’T THINK THERE IS THIS STRATEGY] 

- **Strict JSON Context Injection** 

   - HR policies converted into rigid executable JSON criteria checklists for the AI 

## ● **Stateful Workflow Management** 

   - System pauses when information is missing or unclear and resumes seamlessly [PLEASE VERIFY WITH THE SAD, BECAUSE I DON’T THINK THERE IS THIS SPECIFIC TRIGGER] 

- **Stateful Audit Trail & Logic Logging** 

   - Dedicated database schema that permanently records AI reasoning steps and actions 

- **Role-Based Interactive Dashboards** 

   - Employee View — expense submission, real-time status updates, Approved/Partially Approved/Flagged summaries 

   - HR View — comprehensive dashboard with full reasoning traces and audit logs 

- **Strict Data Isolation & Access Control** [PLEASE VERIFY WITH THE SAD, BECAUSE I DON’T THINK THERE IS THIS STRATEGY] 

   - Employees can only access their own reimbursement history 

   - HR retains full company-wide access 

## **7. Features Not Included (Scope Control) must include:** 

- Direct Banking / Payroll API Integration 

- Visual Drag-and-Drop Workflow Builders 

- Multi-Agent Orchestration (Swarm/Hierarchical) 

- Third-Party Messaging Bots 

- Admin Role for user and company account management 

## **8. Assumptions & Constraints must include:** 

**Assumptions:** 

- Users have stable internet connections during request submission 

- Employees have unique login credentials to access the Employee View and submit claims 

- Employees have an assigned rank/tier within the organization that determines their reimbursement entitlement amount 

- Employees submit receipts in unstructured formats (JPG, PDF etc.) that may be unclear but remain readable 

- HR has unique login credentials to access the HR View and dashboard 

- HR provides sufficient policy context in the Policy Studio for the AI to generate a meaningful summary 

- HR uploads policy in machine-readable formats (PDF or TXT) — not scanned handwriting — to ensure accurate RAG chunking 

**Constraints:** 

- Cost Constraint — RAG pipeline assumes successful filtering of policy documents, injecting only specific JSON criteria to keep context window small and inference costs manageable 

- Technical Constraint — ReAct loop is hard-capped at 5 tool iterations per claim. If no decision is reached, system defaults to "Escalate to HR" status  [PLEASE VERIFY WITH THE SAD, BECAUSE I DON’T THINK THERE IS THIS STRATEGY] 

- Performance Constraint — ReAct loop is sequential by design, standard processing time assumed at 5–15 seconds per receipt. Frontend must implement loading indicators to manage user expectations 

## **9. Risks & Questions Throughout Development must include:** 

## ● **JSON Schema Hallucination & Parsing Errors** 

   - Risk: AI outputs malformed JSON breaking backend database insertion 

   - Mitigation: [PLEASE VERIFY WITH THE SAD, BECAUSE I DON’T THINK THERE IS THIS STRATEGY] 

- **OCR Accuracy — Garbage In, Garbage Out** 

   - Risk: Incorrect dates or amounts extracted from faded or crumpled receipts blindly trusted by reasoning engine 

   - Mitigation: **Mandatory HR review** of AI-extracted data before finalization 

- **GLM-5.1 API Performance** 

   - Risk: Slow response times during claim processing 

   - Mitigation: **Asynchronous processing** — HR can move to next receipt while current one is being processed 

- **GLM 4.6 V Vision OCR Interpretation Errors** 

   - Risk: Misread receipt fields leading to inaccurate claim evaluation 

   - Mitigation: **Mandatory HR confirmation** of extracted data before AI proceeds 

- **Live Demo Network Stability** 

   - Risk: Latency, timeouts or webhook failures from live LLM API calls during pitch day 

   - Mitigation:[PLEASE VERIFY WITH THE SAD, BECAUSE I DON’T THINK THERE IS THIS STRATEGY] 

