# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Reclaim — AI-Assisted Expense Reimbursement with Intelligent Decision Support**

**Version: MVP v1.0 | UMHackathon 2026 | Date: 2026-04-25**

---

## Executive Product Summary

Reclaim is an AI-native expense reimbursement platform that delivers measurable **Business Value** by eliminating the most expensive bottleneck in HR finance operations: the manual, one-by-one review of every submitted receipt. Rather than replacing HR judgment, Reclaim implements an **Efficiency by Exception** model — an AI compliance pre-screening layer that mathematically bounds HR effort to only the claims that require human attention, while passing high-confidence, policy-compliant claims through with a structured audit record.

**Why this matters**: In organizations processing hundreds of expense claims per month, the review burden scales linearly with headcount. A single HR officer can only process so many claims per day. Reclaim breaks this linear relationship by having the AI pre-classify the entire claim volume before HR opens a single case — surfacing only the exceptions, the flags, and the edge cases that genuinely need a human eye. In practice, this means HR spends zero time re-verifying a clean, policy-compliant travel claim and full attention on the receipt that was manually inflated by 10x.

**Proof of Originality and Innovation**: Reclaim introduces a structural **Fraud Trap** mechanism absent from any current HR workflow tool. When an employee submits a receipt and edits the AI-extracted amount — even by a single digit — the system silently records the deviation, assigns a risk severity (HIGH/MEDIUM/LOW), and surfaces the original AI-extracted value alongside the employee-submitted value in the HR audit trail. This is not a validation warning. It is a permanent, immutable fraud signal embedded in the claim record before HR ever opens it.

**Proof of Execution and Completeness**: Every feature described in this document is fully implemented in the live production backend, verified against the source code, and confirmed by the System Analysis Document (SAD v1.0). No aspirational features are listed as active. Features that are intended but not yet implemented are explicitly documented in the Scope Appendix at the end of this document.

---

## 1. Project Overview

### 1.1 Problem Statement

Enterprise HR departments are drowning in paper. Every employee expense claim — whether a RM 15 lunch receipt or a RM 8,000 international travel package — must be individually reviewed by a human HR officer who opens the attachment, reads the amounts, cross-references a policy PDF stored somewhere on a shared drive, calculates any deductions or ineligible items, and writes a response. This process is:

- **High-volume and scaling**: As organizations grow, the number of reimbursement claims increases with headcount, but the review process remains unchanged — still one human, one claim, one policy reference at a time.
- **Manual review burden on HR teams**: An HR officer reviewing 50 claims per week is not doing strategic HR work — they are performing data entry verification and policy look-ups that could be automated.
- **Consequence — human error and inconsistency**: Two HR reviewers reading the same policy may approve or reject the same claim differently. There is no audit trail linking the original receipt to the final approved amount. Policy interpretations drift across staff.
- **Consequence — delays and employee frustration**: A five-to-ten-day turnaround on a reimbursement claim is common. Employees chase HR for updates. HR chases employees for missing receipts. The feedback loop is slow, manual, and adversarial.
- **Impact on both HR and employees**: HR teams are overworked on low-value verification tasks. Employees experience slow, opaque, and inconsistent reimbursement decisions that erode organizational trust.

### 1.2 Target Domain

Reclaim is purpose-built for **enterprise and organizational HR teams** responsible for managing employee expense reimbursement workflows. Specifically:

- The solution targets the **employee expense reimbursement management domain** — the end-to-end lifecycle from receipt upload through policy compliance evaluation to HR final decision.
- Reclaim is designed for **medium to large organizations** where claim volume makes manual review operationally unsustainable, and where policy complexity (rank-based caps, category restrictions, submission deadlines, mandatory conditions) creates high risk of inconsistent enforcement.
- Reclaim **augments HR, not replaces them**. The AI acts as a compliance pre-screener that processes, evaluates, and recommends — but the final approval authority always remains with the HR officer. No claim is approved or rejected without a human decision.

### 1.3 Proposed Solution Summary

**Reclaim** is an AI-powered expense reimbursement platform that places an intelligent compliance agent between receipt upload and HR review. At a high level:

- An employee uploads receipt images or PDFs. An **LLM vision model (GLM 4.6 V)** reads each receipt and extracts structured data — merchant name, date, amount, currency, category, and anomaly flags — within seconds.
- The extracted data is pre-filled into a verification form. If the employee corrects any AI-extracted value, the system records the deviation as a **Fraud Trap** signal.
- Upon submission, a **LangGraph-orchestrated compliance agent** evaluates the entire receipt basket against the active HR policy, producing per-receipt verdicts and an overall claim judgment.
- The AI delivers one of four possible outputs: **APPROVE**, **PARTIAL\_APPROVE**, **REJECT**, or **MANUAL REVIEW** — each with a confidence score and structured reasoning.
- HR receives a pre-classified triage dashboard. Claims that passed AI review are clearly separated from claims requiring attention. HR reviews the evidence, exercises judgment, and issues the final decision.
- The AI is **advisory only**. HR retains final decision authority at all times.

---

## 2. Background & Business Objective

### 2.1 Background of the Problem

Reimbursement review has long been a **manual, paper-heavy process** in most organizations. Employees collect receipts, fill out Word or Google Doc forms, scan attachments of varying quality, and submit via email. HR manually verifies each attachment against a policy document, calculates deductions, and drafts a response — often days later.

HR teams are required to **individually verify each receipt** against company policy. For a ten-receipt travel claim, this means ten separate verification steps against a multi-page policy PDF — a process that is slow, error-prone, and deeply unsatisfying for skilled HR professionals.

As organizations grow, the **volume of claims increases** but the review process remains unchanged. One HR officer reviewing 30 claims per week faces the same manual workflow as an officer reviewing 300. The system does not scale.

This creates a structural bottleneck: **one HR personnel can only process so many claims** at a time. Backlog builds. Employees wait. Finance audits reveal inconsistencies. Compliance risk accumulates silently.

This problem is most **prominent in medium to large organizations** — specifically those with complex policy structures (rank-based amount caps, category restrictions, mandatory condition checklists) where the volume of reimbursement claims makes manual review operationally unsustainable. A single multinational company may receive thousands of travel settlement requests per quarter, each requiring the same manual verification cycle.

### 2.2 Importance of Solving This Issue

Unresolved, this problem leads to **delayed reimbursements, frustrated employees, and overworked HR**. Employees who wait ten days for a RM 200 meal reimbursement develop a negative perception of HR responsiveness — not because HR is slow, but because the process forces them to be. This damages organizational trust and employee morale.

Inconsistent decisions arise when **different HR staff interpret the same policy differently**. Without a shared, structured enforcement layer, a policy clause like "meals not to exceed RM 80 per day" may be applied strictly by one reviewer and loosely by another — creating a fairness problem that is invisible until an employee complains.

Compliance risk is real: **non-compliant claims can slip through** due to human oversight, particularly when an HR officer is reviewing their fortieth claim of the day. An inflated receipt amount, an alcohol item buried in a restaurant bill, or a weekend hotel charge where the policy only allows weekday stays — these violations require careful reading to catch. Fatigued reviewers miss them.

Solving this directly improves **HR operational efficiency and employee trust**. When HR spends their time on the 20% of claims that need human judgment rather than rubber-stamping the 80% that are clean, they add genuine value. When employees receive a structured, AI-reasoned decision within minutes rather than a terse email after five days, organizational trust improves measurably.

### 2.3 Strategic Fit / Impact

Reclaim introduces **AI as a productivity layer** on top of existing HR workflows — not a replacement, but an amplifier. Every HR officer using Reclaim gains the equivalent of a tireless compliance analyst who reads every receipt, checks every policy clause, and flags every discrepancy before the officer opens a single claim.

Reclaim is positioned for **mid to large-scale organizations** looking to modernize their HR finance operations. It is particularly valuable for organizations with:

- High claim volumes (>50 reimbursement requests per week)
- Complex policy structures with rank-based caps and mandatory conditions
- Multi-category submissions (travel, meals, accommodation, transport)
- Distributed HR teams where consistency of policy enforcement is critical

Reclaim enables organizations to **scale reimbursement operations** without increasing HR headcount. The AI's throughput is not bounded by human working hours — it can pre-screen 500 claims overnight and present a prioritized triage queue to HR by morning.

Reclaim promotes **responsible AI adoption**: the AI recommends, the human decides. Every AI judgment is transparent, explained, and overridable. HR is empowered by the AI's analysis, not constrained by it.

Reclaim builds a foundation for **auditable, policy-consistent** reimbursement decisions. Every claim processed by the system generates a permanent, immutable audit record — linking the original receipt image, the AI-extracted data, any employee edits, the compliance reasoning, and the final HR decision into a single traceable chain. This chain is the legal document for finance and tax audits.

---

## 3. Product Purpose

### 3.1 Main Goal of the System

Reclaim is built to **reduce the time and effort** HR spends reviewing reimbursement claims by pre-classifying the entire claim volume before HR opens a single case. The system acts as an **AI-powered review assistant** that evaluates each submitted receipt basket against the active company policy, produces a structured compliance verdict, and surfaces only the exceptions and edge cases to HR.

The core goal is to bring **consistency, speed, and accuracy** into the reimbursement review process:

- **Consistency**: Every claim is evaluated against the same policy conditions, with the same logic, every time. There is no inter-reviewer variability.
- **Speed**: OCR extraction happens in parallel across all uploaded receipts within seconds. Compliance evaluation follows immediately upon submission. HR opens a pre-analyzed claim, not a raw stack of attachments.
- **Accuracy**: The AI extracts structured data from receipt images using a vision model trained for document understanding. The compliance agent evaluates against explicit, policy-grounded conditions — not vague interpretations.

The system is **advisory only**. The final approval authority always remains with the HR officer. No claim transitions to APPROVED or REJECTED status without an explicit human action. The AI's role is to eliminate the work HR should not be doing, so HR can focus on the judgment calls only a human can make.

### 3.2 Target Audience

#### Target Organizations

- **Primary**: Medium to large enterprises (500+ employees) where claim volume creates an operational bottleneck for HR finance teams.
- **Secondary**: Growing SMEs (100–500 employees) that are beginning to experience high claim volumes and need to establish policy-consistent reimbursement workflows before the problem becomes critical.

#### Target Users

| Role | Portal | Primary Use |
|------|--------|-------------|
| **HR Personnel** | HR Portal | Manages policy via Policy Studio; reviews AI recommendations on the triage dashboard; exercises final approval/rejection authority |
| **Finance / Accounting** | HR Portal (read access) | Secondary reference for reporting, auditing, and compliance verification; accesses AI audit trails and per-claim reasoning |
| **Employees** | Employee Portal | Submits reimbursement claims; uploads receipts; reviews and corrects AI-extracted data; monitors claim status |

---

## 4. System Functionalities

### 4.1 Description

Reclaim operates as a two-portal, AI-orchestrated reimbursement platform. The system flow is:

1. **HR sets up policy first**: HR uploads the company's reimbursement policy PDF via the Policy Studio. The AI Policy Agent parses the document, extracts reimbursable categories and mandatory conditions, and stores them as structured, queryable criteria in the database. This policy becomes the enforcement baseline for all subsequent claims.

2. **Employee submits a claim**: The employee selects a claim category, uploads up to 10 receipt files (JPEG, PNG, or PDF), and reviews the AI-extracted data in a side-by-side verification screen. If the employee corrects any AI-extracted field, the system silently records the edit as an audit trail entry. Upon confirmation, the employee submits the verified basket for compliance analysis.

3. **AI pre-screens the claim**: The Compliance Agent evaluates the submission against the active policy, producing per-receipt verdicts (APPROVED/PARTIAL\_APPROVE/REJECTED) with specific audit notes and an overall basket judgment (APPROVE/PARTIAL\_APPROVE/REJECT/MANUAL REVIEW) with a confidence score.

4. **HR reviews and decides**: The HR Portal triage dashboard surfaces claims pre-bucketed by AI judgment. HR reviews the full evidence panel — receipt images, AI extraction, employee edits, policy flags, confidence score, financial summary — and issues the final decision: Force Full Approval, Approve Adjusted Amount, or Confirm Rejection.

The system consists of **two main interfaces**: the Employee Portal (submission, verification, status tracking) and the HR Portal (policy management, triage dashboard, decision execution). An **AI compliance agent sits at the core** of the system, connecting policy rules to claim data through a deterministic, stateful evaluation pipeline. The AI **processes and recommends; HR executes**.

### 4.2 Key Functionalities

#### Unstructured Data Ingestion & Pre-Processing

The system accepts raw receipt files uploaded by employees in JPEG, PNG, or PDF format — up to 10 files per submission. Files are routed based on type: image files are passed to the GLM 4.6 V vision model for multimodal OCR; PDF files are converted to markdown text via PyMuPDF4LLM and passed to GLM-5.1 in JSON mode. Both routes produce the same structured JSON output per receipt: merchant name, date, amount, currency, category, items summary, confidence score, and anomaly flags. Pre-processing includes image validation and anomaly flag generation (`visual_anomalies_detected`) before the data enters the compliance pipeline.

#### Categorized Data Extraction

The system extracts key receipt fields based on **categories dynamically defined by the currently active HR policy** — not hardcoded defaults. When HR uploads a policy, the Policy Agent extracts the list of reimbursable categories from the policy document and stores them in the database. The Document Agent injects this active category list into its OCR prompt at extraction time. This means the categories the AI uses to classify a receipt always reflect the current policy — if HR uploads a new policy with different categories, the next submission uses those new categories automatically.

#### Policy Ingestion & Parsing (Policy Studio)

HR uploads company reimbursement policy via the **Policy Studio** — a dedicated HR portal interface for policy management. The Policy Agent runs a 4-node LangGraph pipeline:

1. **process_pdfs**: Converts uploaded PDF to structured markdown text via PyMuPDF4LLM.
2. **extract_categories_and_summary**: GLM-5.1 extracts the list of reimbursable expense categories and generates a 150-word policy overview summary.
3. **extract_conditions**: A second GLM-5.1 call extracts per-category mandatory conditions — the specific rules, caps, restrictions, and requirements the AI must enforce per claim.
4. **save_to_db**: Persists the complete `Policy` record (categories, conditions, summary, source file URL) with `status: ACTIVE`. Previous active policies are archived.

The policy's mandatory conditions become the exact constraints the compliance agent checks against during claim evaluation. They are stored as structured JSON, not as free-form text — making enforcement deterministic rather than interpretive.

#### Central Orchestration via LangGraph Compliance Agent

The Compliance Agent is a 5-node LangGraph pipeline that ingests the submitted receipt basket and policy conditions and produces a structured compliance verdict:

1. **load_context**: Loads employee profile, active policy conditions, and settlement receipts from the database.
2. **analyze_receipts**: Runs parallel per-receipt ReAct agents (up to 4 concurrent workers). Each per-receipt agent evaluates one receipt against the policy via an iterative reasoning loop — checking late submission, category eligibility, rank-based amount caps, and mandatory conditions. Each agent can make up to 5 tool calls (policy lookups) before producing its per-receipt verdict: `APPROVED`, `PARTIAL_APPROVE`, or `REJECTED` with specific audit notes and the approved amount.
3. **aggregate_totals**: A pure Python node (no LLM call) that calculates total requested, total deduction, and net approved amounts from all per-receipt verdicts.
4. **final_judgment**: A final ReAct agent synthesizes the per-receipt results into an overall basket judgment: `APPROVE`, `PARTIAL_APPROVE`, `REJECT`, or `MANUAL REVIEW` — with a confidence score (0.0–1.0) and a 2–3 sentence explanation.
5. **save_reimbursement**: Persists the complete `Reimbursement` record with all line items, totals, judgment, confidence, and summary to the database.

If the compliance agent encounters an unrecoverable error during evaluation, it defaults to `MANUAL REVIEW` status — ensuring no claim is silently dropped and HR always receives a record to act on.

#### The Fraud Trap — Audit Trail and Human Edit Detection

The Fraud Trap is Reclaim's structural fraud signal mechanism. It operates silently during the employee verification step:

- After OCR extraction, the employee reviews a side-by-side form: left column shows the AI-pre-filled editable form; right column shows the original receipt document.
- If the employee modifies **any** AI-extracted field — particularly the total amount — the system calls the change detection engine, sets `human_edited = True` on the receipt record, records the original AI-extracted value alongside the employee-submitted value in the `change_summary` JSONB field, and assigns an `overall_risk` severity: **HIGH** (amount multiplied), **MEDIUM** (amount increased), **LOW** (minor field edits), or **NONE**.
- This audit record is permanent and immutable. HR sees exactly what the AI extracted versus what the employee submitted — field by field — before making their decision.
- HR is visually alerted when `human_edited = True` and `overall_risk = HIGH`, with the specific deviation surfaced in the fraud analysis panel (e.g., *"HIGH RISK: Amount edited by employee is 10x higher than OCR extraction"*).
- Receipts with no human edits and no policy violations pass through with a clean audit record. Receipts with significant deviations are flagged for mandatory HR attention.

#### Efficiency by Exception — Triage Dashboard

The HR Portal's triage dashboard implements the **Efficiency by Exception** model, pre-bucketing all submitted claims by AI judgment before HR opens a single case:

**Bucket A — Passed AI Review**: Claims where the Compliance Agent produced an `APPROVE` judgment with high confidence and no `HIGH`-risk human edits. These claims are compliant, have no policy violations, and the employee's submitted data matches AI extraction. HR can review and approve with minimal effort.

**Bucket B — Requires Attention**: Claims where the Compliance Agent produced a `PARTIAL_APPROVE`, `REJECT`, or `MANUAL REVIEW` judgment — OR claims where `human_edited = True` with `overall_risk = HIGH`. These claims have specific flags, policy violations, or fraud signals that require HR judgment. Every Bucket B claim comes with a structured reason for the flag and the specific policy clause that was violated.

HR effort is mathematically bounded to Bucket B. In a high-compliance organization, this can mean HR spends detailed review time on 20–30% of claims and fast-tracks the remaining 70–80%.

#### HR Decision Execution

HR reviews the full evidence panel per claim and issues one of three decisions:

- **Force Full Approval**: Approve the total requested amount as submitted by the employee.
- **Approve Adjusted Amount**: Approve the adjusted amount calculated from per-receipt decisions (editing individual receipt amounts where needed before finalizing).
- **Confirm Rejection**: Reject the entire claim basket.

HR can add an **HR Note** — a comment explaining the final decision to the employee. No automated approval or rejection is executed by the system without explicit HR action. The final status transitions are: `REVIEW → APPROVED`, `REVIEW → REJECTED`.

### 4.3 AI Model & Prompt Design

#### 4.3.1 Model Selection

| Model | Provider | Role | Rationale |
|-------|----------|------|-----------|
| **GLM-5.1** | ILMU API | Primary reasoning engine: policy extraction, PDF receipt OCR (JSON mode), per-receipt compliance ReAct agents, final judgment synthesis | Selected for strong instruction-following in structured JSON output tasks, cost efficiency on the ILMU API tier, and compatibility with LangChain's ChatOpenAI interface for LangGraph orchestration |
| **GLM 4.6 V** | OpenRouter | Vision-based OCR for image receipts (JPEG/PNG) | Selected for multimodal document understanding — converting base64-encoded receipt images to structured JSON extraction via a single inference call |
| **Google Gemini 3.1 Flash Lite** | OpenRouter | Automatic fallback text model | Activated automatically at startup if the GLM-5.1 health check fails — ensuring demo resilience and production continuity without code changes |

**Startup Health Check & Automatic Fallback**: At application startup, the backend executes a synchronous probe to GLM-5.1 with a 15-second timeout. If GLM-5.1 is unreachable, all text LLM calls automatically fall back to Gemini 3.1 Flash Lite via OpenRouter for the process lifetime. The switch is logged at `WARNING` level. This fallback is transparent to all three agent workflows — the model switch requires no prompt changes and no code changes.

#### 4.3.2 Prompting Strategy

Reclaim's compliance evaluation uses a **ReAct (Reasoning + Acting) iterative prompting strategy** within the compliance agent. Each per-receipt evaluation agent operates as an autonomous reasoning loop:

- The agent receives a structured context: employee profile, single receipt JSON, and the active policy's mandatory conditions.
- At each iteration, the agent either outputs a **tool call** (e.g., `search_policy_sections` for targeted policy lookups) or a **final verdict** (per-receipt JSON with status, approved amount, and audit notes).
- The agent iterates through reasoning steps — evaluating category eligibility, checking amount caps, verifying submission deadlines — until it reaches a definitive conclusion or exhausts its iteration cap.
- The final judgment agent synthesizes all per-receipt outputs into the overall basket verdict using the same ReAct pattern with a tighter iteration cap.

This strategy ensures the AI reasons through each policy condition explicitly rather than pattern-matching to a single output — producing a traceable, step-by-step audit record of the compliance decision.

#### 4.3.3 Context & Input Handling

- **Direct policy condition injection**: The policy's mandatory conditions (extracted at upload time and stored as structured JSON in the database) are injected directly into the compliance agent's prompt context per claim evaluation. This ensures every evaluation uses the exact, current policy conditions without retrieval latency.
- **JSON schema-enforced output**: All LLM calls in the compliance and document agents use `response_format: json_object` (JSON mode) to enforce structured output. This prevents free-form text responses from entering the database and eliminates the most common class of parsing failures.
- **Context window management**: PDF receipts are chunked to ≤8,000 characters before reaching GLM-5.1. Policy markdown is capped at ≤80,000 characters per policy upload call. OCR prompts inject only the active policy's category list (not the full policy document) to minimize context window usage and inference cost.
- **Parallel extraction**: Up to 4 concurrent LLM workers process receipts simultaneously via `ThreadPoolExecutor`, keeping extraction time proportional to the slowest individual receipt rather than the sum of all receipts.

#### 4.3.4 Fallback & Failure Behavior

- **Iteration hard cap**: Per-receipt ReAct agents are hard-capped at **5 tool calls** per receipt evaluation. The final judgment ReAct agent is capped at **3 tool calls**. If an agent has not reached a definitive verdict by its cap, it is forced to output its best current judgment — preventing infinite loops from LLM tool hallucinations or ambiguous policy text.
- **Compliance agent exception escalation**: If any node in the 5-node LangGraph compliance pipeline throws an unhandled exception, the graph-level exception handler catches it and writes a `Reimbursement` record with `judgment = MANUAL REVIEW` — ensuring HR always receives a record to act on, even if the AI evaluation failed partway through.
- **OCR failure handling**: The Document Agent sets a `visual_anomalies_detected` flag on any receipt where image quality, layout anomalies, or extraction confidence falls below threshold. Employees are alerted at the verification step and must confirm or correct the extracted data before submission. Mandatory human review before submission is the structural mitigation for OCR accuracy limitations.
- **GLM-5.1 startup fallback**: As described in Section 4.3.1, the automatic Gemini fallback ensures that a GLM-5.1 outage at startup does not take down the system — all three agent workflows continue operating via OpenRouter.

---

## 5. User Stories & Use Cases

### 5.1 User Stories

#### Employee Perspective

> *"As an employee returning from a business trip, I used to spend an hour filling out a reimbursement form, manually typing in every merchant name, amount, and date from my stack of receipts — knowing the form would sit in HR's inbox for a week before I heard anything. With Reclaim, I upload my 8 receipts at once. Within seconds, every field is pre-filled. I verify the data, correct one merchant name the AI misread, and hit submit. Ten minutes later I can see my claim status — the AI already pre-screened it and it's in the HR review queue. The whole submission took me less time than it used to take me to find the form."*

**Core value to employee**:
- AI OCR eliminates manual data entry — the employee corrects, not transcribes.
- Instant feedback on claim status (PENDING REVIEW, APPROVED, PARTIALLY APPROVED, REJECTED) visible from the Employee Portal dashboard.
- The verification step gives employees confidence that their data was read correctly before submission — reducing the back-and-forth of "HR says the amount on your receipt doesn't match what you submitted."
- Employees understand why a receipt was flagged or capped — the per-receipt audit notes explain the specific policy rule that applied.

#### HR Manager Perspective

> *"Before Reclaim, I opened every claim blind. I had no idea if the fifty emails in my queue were fifty clean, straightforward reimbursements or fifty potential fraud cases. I had to open each one, pull up the policy PDF, check every line item, and make a judgment call — for every single claim, every single time. Now I open the triage dashboard and I can see immediately: twelve claims passed AI review with high confidence, three claims need my attention. I spend my morning on the three. The twelve get a quick review and approval. I have context I've never had before — the AI tells me exactly which policy clause a claim violated and why, and it flags the ones where the employee manually changed amounts from what the receipt actually says. That second thing alone has already caught two suspicious submissions this month."*

**Core value to HR**:
- The Policy Studio gives HR direct control over the AI's enforcement baseline — upload a policy PDF, review the extracted categories and mandatory conditions, and the AI applies them from the next claim forward.
- The triage dashboard's Efficiency by Exception model separates the workload: Bucket A claims for fast review, Bucket B claims for detailed investigation.
- The audit trail surfaces the full evidence chain per claim: AI extraction, employee edits, per-receipt verdicts, policy flags, confidence score, and financial summary — in a single view.
- HR can edit per-receipt approved amounts before finalizing, giving them fine-grained control over partial approvals without losing the AI's pre-calculated suggestions.

#### Finance / Audit Perspective

> *"From a compliance standpoint, Reclaim solves a problem we didn't even know we could solve: the audit trail. Previously, if a finance audit asked us to prove that a specific expense claim was policy-compliant, we would spend hours digging through email threads and PDF attachments. Now every decision — the AI's reasoning, the employee's edits, the HR officer's final call — is in the database, permanently linked to the original receipt image. The `human_edited` flag and risk scores give us a structured signal to query: show me every HIGH-risk human edit from the last quarter. That used to be impossible. Now it's a database query."*

**Core value to finance/audit**:
- Every claim generates a permanent, immutable audit record from raw receipt to final HR decision.
- The `human_edited` flag, `change_summary` JSONB, and `overall_risk` severity (HIGH/MEDIUM/LOW/NONE) are structured, queryable fields — enabling systematic fraud pattern analysis across the full submission history.
- Per-receipt line items record both the requested amount and the AI-approved amount, with the specific policy rule that determined the deduction — providing evidence-grounded justifications for every adjustment.
- The settlement form PDF is available as an on-demand export, serving as the official claim document for finance and tax audit purposes.

### 5.2 HR Policy Configuration Flow

**From Unstructured to Structured**: HR uploads a standard reimbursement policy in PDF format via the Policy Studio. The Policy Agent converts the unstructured document to markdown, calls GLM-5.1 twice — once to extract the list of reimbursable categories and a 150-word overview summary, and once to extract per-category mandatory conditions as structured JSON. The extracted conditions represent the explicit, machine-readable rules the compliance agent will enforce: amount caps per rank, eligible expense categories, submission deadline windows, prohibited items, and any special approval conditions.

HR reviews the AI-generated policy summary and the extracted mandatory conditions checklist before activating the policy. This review step ensures the AI's interpretation of the policy matches HR's intent. Once HR confirms, the policy is set to `ACTIVE` status and immediately becomes the enforcement baseline for all subsequent claims.

**Source of Truth**: The extracted mandatory conditions, stored as structured JSON in the `policies` table, are the exact constraints the compliance agent evaluates against during every claim review. HR does not need to be present during claim evaluation — the policy rules they uploaded and confirmed are applied consistently, automatically, to every claim that enters the system.

### 5.3 AI-Assisted Claim Review Flow (The Advisory Path)

**Step 1 — Initial Processing**: The employee selects a claim category (e.g., Business Travel) and uploads up to 10 supporting documents (receipts, invoices, PDFs). The Document Agent immediately processes each file in parallel:
- Image files (JPEG/PNG) are routed to GLM 4.6 V for multimodal vision OCR.
- PDF files are converted to markdown via PyMuPDF4LLM and routed to GLM-5.1 in JSON mode.
- Both routes extract: merchant name, transaction date, total amount, currency, category, items summary, confidence score, and anomaly flags.

**Step 2 — Side-by-Side Verification (The Fraud Trap)**: The employee sees a dual-panel verification interface. The left panel shows an editable form pre-filled by the AI. The right panel shows the original document. If the employee changes any AI-extracted value, the system silently records the edit:
- `human_edited = True` is set on the receipt record.
- The `change_summary` JSONB field records the original AI value vs. the employee-submitted value for every edited field.
- An `overall_risk` severity (HIGH/MEDIUM/LOW/NONE) is assigned based on the magnitude of the deviation.

**Step 3 — Compliance Analysis**: After the employee confirms the data and submits, the Compliance Agent evaluates the verified receipt basket against the active policy:
- Per-receipt ReAct agents (parallel, up to 4 workers) evaluate each receipt individually — checking category eligibility, late submission, rank-based amount caps, and mandatory conditions.
- Each per-receipt agent produces: `APPROVED/PARTIAL_APPROVE/REJECTED` verdict, the approved amount, and specific audit notes (e.g., *"Hotel rate exceeds RM 500/night cap for Rank 2 employees. Approved: RM 500. Deducted: RM 150."*).
- The final judgment ReAct agent synthesizes the per-receipt results into an overall basket verdict: `APPROVE/PARTIAL_APPROVE/REJECT/MANUAL REVIEW`, with a confidence score (0.0–1.0) and a 2–3 sentence summary.

**Step 4 — HR Review**: The claim enters the HR triage queue, pre-bucketed by judgment. HR opens the claim, reviews the full evidence panel, and issues the final decision. The AI's recommendation is visible but not binding.

### 5.4 Exception & Flagging Flow

**Discrepancy Detection**: The compliance agent flags a claim or individual receipt when:
- The requested amount exceeds the policy-defined cap for the employee's rank and category.
- The receipt date falls outside the eligible submission window (e.g., weekend claim where policy only covers weekdays).
- A mandatory condition from the policy is not met (e.g., prior approval not documented for expenses above a threshold).
- The `items_summary` extracted by the Vision LLM includes items explicitly prohibited by the policy (e.g., alcohol-related charges, where the policy prohibits reimbursement of alcohol).
- The employee's submitted amount significantly deviates from the AI-extracted value (`overall_risk = HIGH`).

**Transparent Justification**: The compliance agent does not flag silently. Every flag or partial approval is accompanied by:
- The specific policy condition that was violated (e.g., *"Policy Section 3.2: Accommodation must not exceed RM 500/night for domestic travel."*).
- The exact amounts involved: requested vs. approved vs. deducted.
- The overall risk level and, where applicable, the human-edit deviation detail.

Both HR and the employee receive this reasoning. Employees understand why their receipt was adjusted. HR can verify the AI's policy reference and override if needed.

**Human-in-the-Loop**: Every flagged or partially approved claim ends with HR review. HR sees the AI's reasoning, the specific policy clause cited, and the employee's submitted data. HR may agree with the AI's recommendation, override it upward (approve a higher amount), override it downward (reject a claim the AI approved), or edit individual receipt amounts before issuing a final adjusted approval. The system executes no financial action without HR confirmation.

---

## 6. Features Included (MVP Scope)

All features listed in this section are **fully implemented in the live production backend**, verified against the source code and confirmed by the SAD v1.0.

### Multi-Modal Ingestion & Pre-Processing

- Accepts JPEG, PNG, and PDF receipt files, up to 10 files per submission.
- **Image receipts**: Routed to GLM 4.6 V (via OpenRouter) using multimodal prompting with base64-encoded image payloads.
- **PDF receipts**: Converted to markdown via PyMuPDF4LLM and routed to GLM-5.1 in JSON mode.
- Both routes produce identical structured JSON per receipt: merchant name, date, amount, currency, category, items summary, confidence score, and anomaly flags.
- Image pre-processing via Pillow (resize, compression) before LLM submission.

### Automated Categorization

- Categories are **dynamically generated based on the HR-uploaded active policy** — not hardcoded defaults.
- The active policy's category list is injected into the OCR prompt at extraction time.
- Category selection on the Employee Portal is only available for categories that exist in the current active policy.
- If no active policy exists, the system blocks submission — enforcing the operational dependency that policy must precede claims.

### Fraud Trap — Side-by-Side Verification with Human Edit Detection

- Dual-panel verification interface: editable AI-pre-filled form (left) + original document preview (right).
- Change detection engine fires on any employee modification of AI-extracted fields.
- `human_edited = True` flag persisted on the receipt record.
- `change_summary` JSONB records the original AI value vs. employee-submitted value per field.
- `overall_risk` severity assigned: HIGH (amount multiplied significantly), MEDIUM (amount increased), LOW (minor field edits), NONE (no changes).
- Fraud signal is permanent, immutable, and surfaced explicitly in the HR audit trail.

### Dynamic Agentic Reasoning Engine (Compliance Agent)

- 5-node LangGraph pipeline: `load_context → analyze_receipts → aggregate_totals → final_judgment → save_reimbursement`.
- Per-receipt ReAct agents run in parallel (up to 4 concurrent workers), each with a 5-iteration cap on tool calls.
- Final judgment ReAct agent synthesizes overall verdict with a 3-iteration cap.
- Outputs: `APPROVE`, `PARTIAL_APPROVE`, `REJECT`, or `MANUAL REVIEW` with confidence score (0.0–1.0).
- Exception handler: any unrecoverable pipeline failure defaults to `MANUAL REVIEW` — no orphaned records.

### Strict JSON Context Injection

- HR policy mandatory conditions are stored as structured JSON in the database (extracted at upload time).
- Injected directly into the compliance agent's prompt context at evaluation time — no retrieval latency.
- JSON mode (`response_format: json_object`) enforced on all LLM calls in the compliance and document agents.
- Prevents free-form hallucinated responses from entering the database or breaking the evaluation pipeline.

### Stateful Audit Trail & Logic Logging

- Every `supporting_documents` record stores: AI-extracted data, editable fields snapshot, `human_edited` flag, `change_summary` JSONB, and `overall_risk` level.
- Every `reimbursements` record stores: per-receipt `line_items` array (AI verdicts + audit notes), `totals` JSONB (requested/deducted/approved amounts), `judgment`, `confidence`, and `summary`.
- HR audit trail view surfaces: employee identity, per-receipt financial breakdown, policy flags, human-edit deviations, AI confidence score, and financial summary — in a single interface.
- All records are permanent and immutable. No data is overwritten when HR issues a final decision — status is updated, history is preserved.

### Role-Based Interactive Dashboards

**Employee View**:
- Claim submission wizard (category selection → file upload → verification → submit).
- Real-time status tracking: `PENDING REVIEW`, `APPROVED`, `PARTIALLY APPROVED`, `REJECTED`.
- Per-claim detail view showing AI-extracted data, per-receipt verdicts, and final HR decision.
- Claim history with full submission record.

**HR View**:
- Policy Studio: PDF upload, AI-generated summary review, mandatory conditions checklist review, policy activation.
- Triage dashboard: claims bucketed by Bucket A (Passed AI Review) and Bucket B (Requires Attention).
- Per-claim evidence panel: full audit trail, fraud signals, per-receipt line items, AI confidence score, financial summary.
- Decision Engine: Force Full Approval, Approve Adjusted Amount, Confirm Rejection, HR Note field.

### Strict Data Isolation & Access Control

- JWT Bearer authentication on all API endpoints.
- Role-based access control enforced at the dependency layer (`deps.py`): HR-only endpoints reject Employee tokens at the API layer — not the business logic layer.
- `GET /reimbursements` endpoint filters by `user_id` for Employees, returns all records for HR — enforcing data isolation at the query level.
- BCRYPT password hashing for all stored credentials.
- All role assignments are database-level (`role: HR | Employee`) — not self-assigned.

---

## 7. Features Not Included (Scope Control)

The following features are explicitly outside the current MVP scope and are not supported by the live backend architecture:

| Feature | Reason for Exclusion |
|---------|---------------------|
| **Direct Banking / Payroll API Integration** | Auto-disbursement requires financial API partnerships and compliance certification outside the MVP scope. The `status = PAID` transition is a manual HR update. |
| **Visual Drag-and-Drop Workflow Builders** | Policy editing requires re-upload of a new PDF. A drag-and-drop policy condition editor was not implemented in the MVP. |
| **Multi-Agent Orchestration (Swarm/Hierarchical)** | The current system processes claims sequentially per submission. Parallel processing across multiple concurrent user submissions at scale requires a task queue infrastructure not present in the MVP. |
| **Third-Party Messaging Bots** | Slack, Teams, or WhatsApp notifications for claim status updates are not implemented. Status is visible in the Employee Portal only. |
| **Admin Role for User and Company Account Management** | All user registration is self-serve. There is no admin portal for managing company accounts, onboarding organizations, or bulk user management. |

---

## 8. Assumptions & Constraints

### Assumptions

- Users have **stable internet connections** during request submission and review, given that all AI processing is server-side.
- Employees have **unique login credentials** (email + password) to access the Employee Portal and submit claims.
- Employees have an **assigned rank (integer)** within the organization that maps to different reimbursement entitlement caps. The actual cap values must be explicitly stated in the uploaded policy document — the AI enforces caps that the policy defines, not caps stored separately in the database.
- Employees submit receipts in **unstructured formats (JPEG, PNG, PDF)** that may be imperfect but remain sufficiently legible for the Vision LLM to extract at least the total amount and merchant name (confidence ≥ 0.5).
- HR has **unique login credentials with `role = HR`** assigned in the database to access the HR Portal and Policy Studio.
- HR provides **sufficient policy context** in the Policy Studio for the AI to generate a meaningful conditions checklist. If the policy document does not explicitly state category definitions, rank-based caps, submission deadlines, and mandatory conditions, the compliance agent cannot enforce them accurately.
- HR uploads policy in **machine-readable PDF formats** (not scanned handwriting) — to ensure accurate text extraction by PyMuPDF4LLM.
- The **ILMU API and OpenRouter APIs** are available and within their rate limits during the demo and evaluation period. If the ILMU API is unavailable at startup, the system automatically falls back to `google/gemini-3.1-flash-lite-preview` via OpenRouter.

### Constraints

| Constraint | Detail |
|-----------|--------|
| **Cost Constraint** | OCR prompts inject only the active policy's category list (not the full policy document) into the context window. PDF text is chunked to ≤8,000 characters. Policy markdown is capped at ≤80,000 characters per upload call. These limits keep per-claim inference costs within budget. |
| **Performance Constraint — ReAct Iteration Cap** | Per-receipt ReAct agents are hard-capped at 5 tool calls. The final judgment ReAct agent is capped at 3 tool calls. If no definitive verdict is reached by the cap, the agent outputs its best current judgment and the compliance agent defaults to `MANUAL REVIEW`. This prevents runaway LLM loops. |
| **Performance Constraint — Processing Time** | ReAct agents run in parallel (up to 4 workers), but each individual agent is sequential. Standard processing time for a 10-receipt submission is 15–30 seconds depending on ILMU API response time. The frontend implements loading indicators and async status polling to manage user expectations. |
| **Parallelism Constraint** | The Document Agent uses `ThreadPoolExecutor` with a maximum of 4 concurrent LLM workers per submission. Submissions beyond 4 receipts are partially serialized — the fifth through tenth receipts wait for a worker slot to free up. |
| **Policy Dependency Constraint** | The compliance agent requires an active policy in the database. If no policy has been uploaded and activated by HR, the analyze endpoint rejects the submission. Policy upload must precede all claim submissions. |

---

## 9. Risks & Questions Throughout Development

### JSON Schema Hallucination & Parsing Errors

- **Risk**: The LLM outputs malformed or partially valid JSON, breaking the database insertion pipeline and causing the compliance evaluation to fail silently.
- **Mitigation**: JSON mode (`response_format: json_object`) is enforced on all structured LLM calls in both the Document Agent and Compliance Agent. Pydantic schema validation at the API boundary rejects malformed payloads before they reach the database. LangSmith distributed tracing (project: `um_hackathon`) provides per-call observability for debugging malformed outputs in production. Any compliance agent node failure that produces invalid output triggers the graph-level exception handler, which defaults the claim to `MANUAL REVIEW` rather than producing a null record.

### OCR Accuracy — Garbage In, Garbage Out

- **Risk**: Incorrect dates or amounts extracted from faded, crumpled, or low-quality receipts are silently accepted by the compliance engine, producing an inaccurate compliance judgment based on wrong data.
- **Mitigation**: **Mandatory human review** of AI-extracted data before submission is the structural mitigation. The side-by-side verification screen places the original document next to the AI-pre-filled form — employees must confirm or correct before the claim enters the compliance pipeline. The `visual_anomalies_detected` flag explicitly alerts employees and HR when the Vision LLM detected image quality issues during extraction.

### GLM-5.1 API Performance

- **Risk**: Slow ILMU API response times during claim processing, particularly under concurrent load during the demo period.
- **Mitigation**: Parallel per-receipt processing (up to 4 concurrent workers) reduces total submission time. The frontend implements asynchronous processing — HR can navigate to the next claim while the current one is being analyzed. The startup Gemini fallback ensures that if GLM-5.1 is slow or unreachable at startup, all three workflows continue operating on the fallback provider.

### GLM 4.6 V Vision OCR Interpretation Errors

- **Risk**: The Vision LLM misreads receipt fields — particularly for unusual receipt formats, multi-currency receipts, or low-contrast images — leading to inaccurate compliance evaluation based on incorrect extracted data.
- **Mitigation**: Mandatory HR confirmation of extracted data is the primary safeguard. The `visual_anomalies_detected` flag explicitly surfaces potential extraction quality issues. The `confidence` field on each extracted receipt record signals low-confidence extractions for heightened attention. Employees who notice misread fields correct them at the verification step, with the correction automatically logged as an audit trail entry.

### Live Demo Network Stability

- **Risk**: API latency, timeouts, or connection failures from live LLM API calls to ILMU API or OpenRouter during the pitch day demonstration, causing visible failures in front of judges.
- **Mitigation**: The startup health check with automatic Gemini fallback (`google/gemini-3.1-flash-lite-preview` via OpenRouter) is the primary network resilience mechanism — if ILMU API is unreachable at startup, the system seamlessly falls back without any code changes or manual intervention. OpenRouter's multi-provider infrastructure provides additional redundancy for vision and fallback text calls. The demo environment should be tested with the fallback path to verify identical behavior under both model providers.

---

## Appendix: Features in Product Intent Not Implemented in MVP

The following features are described in the product workflow specification (`core_workflow.md`) but are **not implemented** in the current live architecture (verified against `SAD_Report.md` Appendix: Implementation Conflict Report). These are documented here as a reference for future development scope and are explicitly **excluded from all active feature claims** in this PRD.

---

### A1 — Automatic PDF Generation Triggered by HR Approval

**Intended (core_workflow.md)**: Upon HR final decision, the system automatically generates and delivers an Official Claim Form PDF containing the final approved amounts and HR/AI audit notes.

**Actual (SAD Conflict 1)**: The PDF generation endpoint (`POST /api/v1/documents/generate-template`) exists and is functional as an on-demand call. However, it is **not automatically triggered** by the `PATCH /reimbursements/{id}/status` action. PDF generation is available as a manual export, not an event-driven artifact at the moment of HR approval.

**Future scope**: Wire the PDF generation call to the HR approval event in the `PATCH /reimbursements/{id}/status` handler. Deliver the generated PDF as a downloadable link in the HR confirmation response and as a notification to the employee.

---

### A2 — Policy Mandatory Condition Editing After Upload

**Intended (core_workflow.md)**: HR can edit, add, and delete mandatory constraints (SOP Checklist) in the Policy Studio after a policy has been uploaded and activated.

**Actual (SAD Conflict 2)**: No API endpoint exists to modify `mandatory_conditions` on an existing `Policy` record post-upload. If HR needs to modify conditions, they must re-upload the policy PDF, which creates a new `Policy` record.

**Future scope**: Implement `PATCH /api/v1/policies/{policy_id}/conditions` to allow HR to add, edit, and delete individual mandatory condition entries without full policy re-upload. Versioning the condition history (who changed what, when) would be a companion feature.

---

### A3 — Formal Policy Versioning with Version Chain

**Intended (core_workflow.md)**: HR can perform versioning of the policy — tracking the history of policy changes over time with rollback capability.

**Actual (SAD Conflict 3)**: The `policies` table has a `status` field (ACTIVE/DRAFT/ARCHIVED) enabling a lightweight versioning workflow via sequential policy uploads. However, there is no formal version chain, version number field, parent-child policy relationship, or changelog. Policy history is approximated by `created_at` timestamps and status management.

**Future scope**: Introduce a `policy_versions` table with parent-child FK relationships, version numbers, change author, and effective dates. Expose a version history view in the Policy Studio.

---

### A4 — Explicit Duplicate Receipt Detection Pipeline

**Intended (core_workflow.md)**: The system runs a dedicated duplication check before AI processing — detecting receipts that have already been submitted in a previous claim to prevent double-reimbursement fraud.

**Actual (SAD)**: No explicit duplicate detection pipeline is implemented in the current Document Agent or Compliance Agent. Duplicate submission prevention is not a current feature. The `visual_anomalies_detected` flag covers image tampering but not duplicate submissions.

**Future scope**: Implement a pre-submission deduplication check using perceptual image hashing (pHash) or merchant+date+amount fingerprinting against existing `supporting_documents` records to flag likely duplicate receipts before they enter the compliance pipeline.

---

### A5 — Stateful Workflow Pause and Resume on Missing Information

**Intended (core_workflow.md)**: The system pauses when information is missing or unclear and resumes seamlessly once the employee or HR provides the missing context.

**Actual (SAD)**: The compliance agent does not implement a pause-and-resume workflow. When information is insufficient or evaluation fails, the agent defaults to `MANUAL REVIEW` status — routing the claim to HR for human resolution. There is no automated re-evaluation trigger once additional information is provided.

**Future scope**: Implement a `PENDING_EMPLOYEE_ACTION` status that allows HR to request additional information from the employee. Upon employee response (e.g., uploading a clarification document), the compliance agent re-evaluates the updated claim automatically.

---

*Document generated: 2026-04-25 | Version: 1.0 | Authors: Reclaim Team (Darrell, Mike, Christian, Filbert, Chingiz)*
