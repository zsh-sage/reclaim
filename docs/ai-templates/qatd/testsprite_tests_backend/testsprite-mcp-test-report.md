# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata

| Field | Value |
|---|---|
| **Project Name** | reclaim |
| **Date** | 2026-04-26 |
| **Prepared By** | TestSprite AI × Antigravity |
| **Test Type** | Frontend E2E (Playwright Headless Chromium) |
| **Server** | `http://localhost:3000` (development mode) |
| **Total Tests** | 15 |
| **Passed** | 11 |
| **Failed** | 4 |
| **Blocked** | 0 |
| **Pass Rate** | **73.33%** |
| **Dashboard** | http://localhost:61014/modification?project_path=c%3A%5CMain+Storage%5CProgramming%5CHackathon%5Cum_hackathon_bogosort%5Creclaim&project_name=reclaim&mcp_port=61014&mode=modification&original_port=3000 |

---

## 2️⃣ Requirement Validation Summary

### 🔒 Security & Access Control (RBAC)

| Test | Title | Status | Findings |
|---|---|---|---|
| TC002 | Redirect unauthenticated users away from HR dashboard | ✅ Passed | Unauthenticated direct navigation to `/hr/dashboard` correctly redirects to `/login`. No HR data exposed. |
| TC004 | Unauthenticated user cannot access HR dashboard route | ✅ Passed | Duplicate confirmation — unauthenticated access to HR routes is blocked system-wide. |
| TC006 | Block unauthenticated access to HR policy studio | ✅ Passed | `/hr/policy` also correctly redirects unauthenticated sessions to `/login`. |
| TC007 | Employee is blocked from HR-only routes | ❌ **Failed** | **RBAC BUG**: After Employee Demo login, navigating to `/hr/dashboard` loaded full HR content. HR navigation (Dashboard, Policy Studio, History, Settings) was visible to an Employee-role user. |
| TC008 | Unauthenticated user cannot view HR claims triage dashboard | ✅ Passed | Consistent with TC002/TC004 — unauthenticated access blocked. |
| TC013 | Employee cannot access the HR policy studio | ❌ **Failed** | **RBAC BUG**: Authenticated Employee-role user can navigate to `/hr/policy` and sees the Policy Studio with full controls including "Create New Policy" button. |
| TC015 | HR can log out and lose access to protected HR routes | ✅ Passed | After logout, navigating to `/hr/dashboard` redirects to `/login`. Session invalidation works correctly. |

**Sub-total: 5 PASSED / 2 FAILED**

> ⚠️ **Critical:** Employee role bypass affects `/hr/dashboard`, `/hr/policy`, and likely all `/hr/*` routes. The Next.js middleware or page-level auth guard is not checking the user's `role` claim.

---

### 👤 User Authentication

| Test | Title | Status | Findings |
|---|---|---|---|
| TC001 | HR can log in and reach the HR dashboard | ✅ Passed | Admin Demo quick-login authenticated as HR and routed to `/hr/dashboard`. |
| TC005 | Allow HR to log in and reach the HR dashboard | ✅ Passed | Repeat confirmation — HR login flow is stable. |
| TC009 | Employee can log in and reach the Employee submit area | ✅ Passed | Employee Demo quick-login → `/employee/dashboard` correctly. |
| TC011 | Authenticated HR session persists across page reload | ✅ Passed | After login, reloading `/hr/dashboard` maintains the authenticated session. JWT / cookie persistence works. |
| TC014 | Invalid login is blocked | ✅ Passed | Submitting invalid credentials shows auth failure banner; user stays on `/login`. |

**Sub-total: 5 PASSED / 0 FAILED**

---

### 🏢 WF3 — HR Claims Triage & Decision Workflow

| Test | Title | Status | Findings |
|---|---|---|---|
| TC003 | HR can review a claim and update its decision status with an HR note | ❌ **Failed** | HR clicked "Submit Adjusted Approval" (twice), but no confirmation toast appeared and the claim was not removed from the "Requires Attention" bucket. The `PATCH /api/v1/reimbursements/{id}/status` call may be failing silently or the UI is not reflecting the response. |
| TC010 | HR can triage claims by switching buckets and opening a claim | ✅ Passed | HR switched from "Requires Attention" to "Passed AI Review" bucket, searched claims, opened a claim detail. Triage navigation works. |

**Sub-total: 1 PASSED / 1 FAILED**

> ⚠️ **TC003 failure** means HR cannot complete the approval/rejection workflow end-to-end from the UI. The status update either fails silently on the backend, or the frontend doesn't re-fetch/invalidate the cache after a successful PATCH.

---

### 📋 WF1 — Policy Studio (Upload & Management)

| Test | Title | Status | Findings |
|---|---|---|---|
| TC012 | HR can upload a valid policy document and see it in the policy list | ❌ **Failed** | The upload pipeline showed animated progress states ("Uploading documents...", "Analyzing policy...", "Saving changes...") but the new policy "Policy Alpha" did not appear in the library after completion. Existing policies (Daily Trip Allowance Policy, Business Travel Policy, Auto Test Policy) remain visible. |

**Sub-total: 0 PASSED / 1 FAILED**

> ⚠️ **TC012 failure** indicates the LangGraph pipeline may complete processing but fail to write the policy record back to the database, OR the policy list is not refreshed after the pipeline resolves. Check `POST /api/v1/policies/upload` response and the subsequent `GET /api/v1/policies/` call.

---

## 3️⃣ Coverage & Matching Metrics

### Overall Summary

| Requirement Group | Total | ✅ Passed | ❌ Failed |
|---|---|---|---|
| Security & Access Control (RBAC) | 7 | 5 | 2 |
| User Authentication | 5 | 5 | 0 |
| WF3 — HR Claims Triage & Decision | 2 | 1 | 1 |
| WF1 — Policy Studio Upload | 1 | 0 | 1 |
| **TOTAL** | **15** | **11** | **4** |

**Pass Rate: 73.33%**

### Test Visualization Links

| Test | Title | Status | Video |
|---|---|---|---|
| TC001 | HR can log in and reach the HR dashboard | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/3fd51f64-c3c1-42de-ae1c-93cf2c2e5752) |
| TC002 | Redirect unauthenticated users away from HR dashboard | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/d90bd095-0573-4a5c-8741-a0652131746a) |
| TC003 | HR can review a claim and update decision status | ❌ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/0a37d38b-88b0-4b80-891d-81a51649336f) |
| TC004 | Unauthenticated user cannot access HR dashboard | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/8a955b3e-711b-45e3-a5c7-5ddc9551b4e8) |
| TC005 | Allow HR to log in and reach the HR dashboard | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/47afb48a-3e95-46b1-86d6-8b8303e8d259) |
| TC006 | Block unauthenticated access to HR policy studio | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/cdbf6ea1-ae7c-4a40-9fb9-aca6f7a93552) |
| TC007 | Employee is blocked from HR-only routes | ❌ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/17cc61e6-2a76-40e7-b852-3d43633118d2) |
| TC008 | Unauthenticated user cannot view HR claims triage | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/1655bc6c-b345-4a91-9de6-5874b04f3cee) |
| TC009 | Employee can log in and reach Employee submit area | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/fd343b53-e3fc-414f-92a0-5d2b2967bda7) |
| TC010 | HR can triage claims by switching buckets | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/b88fa502-fcaa-4613-b8d6-b685a6962a3f) |
| TC011 | Authenticated HR session persists across reload | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/a6864434-06e8-4657-9276-9124e7acc874) |
| TC012 | HR can upload a policy and see it in the library | ❌ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/eccf0b69-95ec-41b9-8285-7dd90fad3662) |
| TC013 | Employee cannot access the HR policy studio | ❌ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/9050b428-c2e5-43cb-8d09-91836ad04841) |
| TC014 | Invalid login is blocked | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/24eb1c3a-32f7-4e2f-bd94-8f5e19b85a00) |
| TC015 | HR can log out and lose access to protected routes | ✅ | [View](https://www.testsprite.com/dashboard/mcp/tests/2242609c-a0bd-40f9-963c-938f410bba3d/2a2c9389-f304-4701-84a5-69567ef8c674) |

---

## 4️⃣ Key Gaps / Risks

### 🔴 P0 — Critical Security Regressions

| Bug ID | Test | Description | Affected Routes |
|---|---|---|---|
| **RBAC-001** | TC007 | Employee-role users can access `/hr/dashboard` — full HR data (KPIs, claims, actions) visible | `/hr/dashboard` |
| **RBAC-002** | TC013 | Employee-role users can access `/hr/policy` — Policy Studio with "Create New Policy" button visible | `/hr/policy` |

**Root Cause:** The Next.js middleware or page-level server component auth check is either not reading the `role` from the JWT, or the role guard logic has a bug (e.g., checking `role === 'admin'` instead of `role === 'hr'`). Check `middleware.ts` and each `/hr/*` layout/page for role validation.

**Fix:** In `middleware.ts`, after verifying the JWT, check `payload.role === 'hr'` for all `/hr/*` routes. If the role does not match, redirect to `/unauthorized` or `/employee/dashboard`.

---

### 🟠 P1 — Functional Failures

| Bug ID | Test | Description | Investigation Path |
|---|---|---|---|
| **WF3-001** | TC003 | HR decision submit (Approve/Partial/Reject) shows no confirmation; claim stays in "Requires Attention" | Check `PATCH /api/v1/reimbursements/{id}/status` response code; verify `hr.ts` server action handles errors; check if the frontend invalidates the claims cache after PATCH |
| **WF1-001** | TC012 | Policy upload pipeline runs all stages but new policy does not appear in library | Check `POST /api/v1/policies/upload` response; verify `PolicySection` records are committed; check if `GET /api/v1/policies/` is re-fetched after upload resolves |

---

### 🟡 P2 — Coverage Gaps

| Gap | Description |
|---|---|
| WF2 not tested | `/employee/submit` shows a placeholder — receipt upload, OCR, and WF3 fresh-data flows untestable |
| WF3 compliance discrepancy | Cannot test User Input vs. OCR discrepancy detection without a submitted receipt |
| File size validation (>5MB) | Not covered — requires WF2 fix first |
| HR History page | "History is temporarily restricted" in MVP — audit trail and export settlement cannot be tested |

---

### 🟢 Confirmed Working

- ✅ JWT auth + role-based redirect on login
- ✅ Demo quick-login (Employee Demo, Admin Demo)
- ✅ Session persistence across page reloads
- ✅ Logout → session cleared → protected routes blocked
- ✅ Unauthenticated access → redirect to `/login` (all tested HR routes)
- ✅ Invalid credential rejection with error banner
- ✅ HR claims triage bucket switching + claim navigation

---

*Report generated by: Antigravity (AI pair programmer) × TestSprite MCP*
*Raw report source: `testsprite_tests/tmp/raw_report.md`*
*Saved to: `testsprite_tests/testsprite-mcp-test-report.md`*
