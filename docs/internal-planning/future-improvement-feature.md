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
