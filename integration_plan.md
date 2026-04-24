# Frontend ↔ Backend Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully wire the Next.js frontend to the FastAPI backend — replacing all mock data, fixing wrong endpoint paths, resolving field-name mismatches, and aligning the 3-stage claims flow with the actual document → edit → analyze workflow.

**Architecture:** Frontend (Next.js 14 server actions + client components) talks to FastAPI via JSON/multipart. All state flows through server actions in `frontend/lib/actions/`. The backend's three workflows (document upload, policy upload, compliance analysis) map directly to the claims submission, HR policy studio, and reimbursement analysis flows in the frontend.

**Tech Stack:** Next.js 14, FastAPI, JWT (Bearer), server actions, multipart form uploads, Pydantic, SQLModel

**Schema reference:** `backend/core/models.py`, `backend/api/schemas.py`

> ⚠️ **CONSTRAINT — `backend/api/test_ui.py` is disposable and will be deleted before production.**
> The frontend must NEVER call any endpoint defined in `test_ui.py` (paths under `/test/db/*`).
> If a frontend feature needs data that currently only exists in a `test_ui.py` route (e.g. listing all employees for HR, listing all settlements), create a proper endpoint in the relevant production API file (`backend/api/reimbursements.py`, `backend/api/auth.py`, etc.) — copying the query logic from `test_ui.py` as a reference is fine, but the route itself must live in the production router.

---

## SECTION 1 — ENDPOINT DISCREPANCIES

### 1.1 Endpoints called by frontend that DO NOT exist in backend

| Frontend calls | Expected backend path | Fix needed |
|---|---|---|
| `POST /api/v1/reimbursements/process` | **Does not exist** | Replace with `POST /api/v1/documents/upload` |
| `POST /api/v1/reimbursements/submit` | **Does not exist** | Replace with `POST /api/v1/reimbursements/analyze` |
| `GET /api/v1/employee/claims/{id}` | **Does not exist** | Either add backend endpoint OR derive from existing reimbursement list |
| `GET /api/v1/notifications` | **Does not exist** | Add new backend endpoint or remove feature |
| `POST /api/v1/notifications/read-all` | **Does not exist** | Add new backend endpoint or remove feature |
| `GET /api/v1/employee/banking` | **Does not exist** | Out-of-scope for MVP — keep mock |
| `PUT /api/v1/auth/me` | **Does not exist** | Add backend endpoint or keep settings page as restricted |

### 1.2 Backend endpoints NOT called by frontend at all

| Backend endpoint | Purpose | Frontend gap |
|---|---|---|
| `POST /api/v1/documents/upload` | Receipt OCR (the real OCR call) | Claims page simulates this locally with mock data — **never calls backend** |
| `POST /api/v1/documents/{document_id}/edits` | Human OCR corrections | Verification screen collects edits but never POSTs them |
| `POST /api/v1/documents/generate-template` | Generate travel settlement HTML | Not connected anywhere in frontend |
| `GET /api/v1/documents/settlement/{settlement_id}/template` | View settlement template | Not connected anywhere in frontend |
| `GET /api/v1/documents/` | List user's documents | Not used by any page |
| `POST /api/v1/auth/register` | User registration | No registration page in frontend |
| `POST /api/v1/policies/upload` | HR uploads policy PDF | Need to verify if Policy Studio wires this up |
| `POST /api/v1/reimbursements/analyze` | Compliance analysis | Never called — claims submission console.logs instead |

---

## SECTION 2 — FIELD NAME MISMATCHES

### 2.1 User / Auth

| Field | Backend response (`GET /auth/me`) | Frontend type (`User` in `types.ts`) | Fix |
|---|---|---|---|
| User ID | `user_id: UUID` | `id: string` | Frontend must read `user_id`; rename or remap |
| User Code | `user_code: string \| null` | **missing from type** | Add `user_code` to `User` type |
| Rank | `rank: int` | **missing from type** | Add `rank` to `User` type |

**File:** `frontend/lib/api/types.ts` — `User` type definition  
**File:** `frontend/lib/actions/auth.ts` — maps login response to User object

### 2.2 Policy

| Field | Backend response (`GET /policies/`) | Frontend type (`Policy` in `types.ts`) | Fix |
|---|---|---|---|
| ID | `policy_id: string` | **missing** | Add `policy_id` |
| Name | `alias: string`, `title: string` | **missing** | Add both |
| Categories | `reimbursable_category: string[]` (singular) | `reimbursable_categories: string[]` (plural) | Rename backend field in frontend mapping |
| Summary | `overview_summary: str` | **missing** | Add to type |
| Effective date | `effective_date: string` | **missing** | Add to type |
| Status | `status: string` | **missing** | Add to type |
| Top-level category | Backend does NOT have `main_category` on policies | `main_category: string` | **Remove from frontend Policy type** — categories are flat list |

**File:** `frontend/lib/api/types.ts` — `Policy` type  
**File:** `frontend/lib/actions/policies.ts` — `getPolicies()` mapping  
**File:** `frontend/app/employee/claims/page.tsx` line ~469 — reads `reimbursable_category` vs `reimbursable_categories`

### 2.3 Reimbursement / Claims

| Field | Backend response (`GET /reimbursements/`) | Frontend type (`ReimbursementRaw`) | Fix |
|---|---|---|---|
| Claim amount | Backend has `totals: { total_requested, total_deduction, net_approved }` dict | Frontend expects `amount: number` (flat) | Map `totals.net_approved` → `amount` in `mapReimbursementToClaim()` |
| Chain of thought | **Does not exist in backend** | `chain_of_thought: string` | Remove from frontend type; use `summary` instead |
| Settlement ID | `settlement_id: string \| null` | **missing** | Add to type — needed for linking claims to settlements |
| Line items | `line_items: dict[]` (per-receipt decisions) | **missing** | Add to type — needed for claim detail view |
| Confidence | `confidence: float \| null` | **missing** | Add to type |
| Employee rank | `employee_rank: int` | **missing** | Add to type |
| Employee dept | `employee_department: string \| null` | **missing** | Add to type |

**File:** `frontend/lib/api/types.ts` — `ReimbursementRaw` type  
**File:** `frontend/lib/actions/claims.ts` — `mapReimbursementToClaim()` function

### 2.4 Claims Submission Payload Mismatch

Frontend constructs a `ClaimSubmissionPayload` (in `src/types/claim.ts`) with:
```ts
{ dbData, mainCategory, claimContext, receipts, subTotal, submittedAt }
```

Backend `POST /reimbursements/analyze` expects:
```json
{ "settlement_id": "uuid", "policy_id": "uuid", "all_category": ["str"], "document_ids": ["uuid"] }
```

These have **zero overlap**. The frontend must be refactored to use `settlement_id` (obtained from the document upload step) and `policy_id` (from the policy selector) instead.

---

## SECTION 3 — WORKFLOW MISMATCH (Critical)

### 3.1 Claims Submission — 3-Stage Flow

**Current frontend flow:**
1. Stage 1 (Form): User selects category + uploads files
2. Stage 2 (Processing): Simulated OCR with `setTimeout` — **never touches backend**
3. Stage 3 (Verification): Shows `MOCK_OCR_RECEIPTS` + collects travel context → `console.log` instead of API call

**Required flow (to match backend):**
1. Stage 1 (Form): User selects category + uploads files
2. Stage 2 (Processing): Call `POST /api/v1/documents/upload` with files → backend runs real OCR → returns `settlement_id`, `document_ids`, OCR data
3. Stage 3 (Verification): Show real OCR data from response → user edits → call `POST /api/v1/documents/{document_id}/edits` per modified receipt
4. Stage 4 (Analyze): User selects policy → call `POST /api/v1/reimbursements/analyze` with `settlement_id` + `policy_id` → show judgment result

**Files to modify:**
- `frontend/app/employee/claims/page.tsx` — entire submission flow
- `frontend/lib/actions/claims.ts` — replace `processReceipt()` and `submitClaim()` server actions
- `frontend/lib/api/types.ts` — add `DocumentUploadResponse`, `EditDocumentRequest`, `AnalyzeRequest` types

### 3.2 Auth Cookie vs. Token Expiry Mismatch

- Backend token valid for **8 days** (11520 minutes)
- Frontend cookie `maxAge`: **24 hours** (86400 seconds)
- After 24h, frontend deletes cookie but backend token still works for 7 more days
- Fix: Set cookie `maxAge` to match backend (`691200` seconds = 8 days)

**File:** `frontend/lib/actions/auth.ts` — line where `cookies().set("session", ...)` is called

---

## SECTION 4 — FEATURES IN FRONTEND WITH NO BACKEND EQUIVALENT

| Feature | Location | Status | Recommendation |
|---|---|---|---|
| Notifications system | `lib/actions/notifications.ts`, `TopNav.tsx` | Full mock (`MOCK_NOTIFICATIONS`) | Add `GET /api/v1/notifications` + `POST /api/v1/notifications/read-all` to backend, OR keep as stub for MVP |
| Banking details | `lib/actions/settings.ts` | Full mock | Keep as `MvpFeatureRestricted` — low priority |
| Profile update | `lib/actions/settings.ts` | Not wired | Add `PUT /api/v1/auth/me` to backend |
| Global search | `TopNav.tsx` | Mock results only | Add `GET /api/v1/search?q=` to backend or keep as MVP stub |
| PDF download link | History sidebar | Link hardcoded but untested | Add `GET /api/v1/reimbursements/{id}/pdf` to backend or remove link |
| Claim status update by HR | HR dashboard | No UI + no endpoint | Add `PATCH /api/v1/reimbursements/{id}/status` to backend |

---

## SECTION 5 — FEATURES IN BACKEND WITH NO FRONTEND EQUIVALENT

| Feature | Backend endpoint | Frontend gap | Priority |
|---|---|---|---|
| Generate settlement template | `POST /api/v1/documents/generate-template` | Not called anywhere | High — needed for claim submission flow |
| View settlement template | `GET /api/v1/documents/settlement/{id}/template` | Not rendered anywhere | Medium — useful after submission |
| Human OCR edits | `POST /api/v1/documents/{document_id}/edits` | Verification screen collects edits but never POSTs | Critical |
| Document list | `GET /api/v1/documents/` | Not used | Low |
| User registration | `POST /api/v1/auth/register` | No registration page | Medium (depends on onboarding flow) |
| Policy section details | PolicySection model | Not surfaced in UI at all | Low |

---

## SECTION 6 — PARTIALLY INTEGRATED (With Issues)

### 6.1 `GET /api/v1/policies/`
- **Status:** Called in `policies.ts`, falls back to `MOCK_POLICIES` on failure
- **Issues:**
  - Frontend type has `main_category` — backend doesn't return this field
  - Frontend type uses `reimbursable_categories` (plural) — backend returns `reimbursable_category` (singular)
  - Frontend MOCK has full `mandatory_conditions` string — backend returns this as JSON-encoded dict string
  - `policy_id`, `alias`, `title`, `overview_summary`, `effective_date`, `status` are returned by backend but not in frontend `Policy` type
- **Fix:** Rewrite `Policy` type and update `getPolicies()` mapping

### 6.2 `GET /api/v1/reimbursements/`
- **Status:** Called in `claims.ts` and `dashboard.ts`, always falls back to mock on any failure
- **Issues:**
  - Frontend `ReimbursementRaw` has `amount` — backend returns `totals` object
  - Frontend has `chain_of_thought` — doesn't exist in backend
  - `settlement_id`, `line_items`, `confidence` missing from frontend type
  - `mapReimbursementToClaim()` extracts merchant from `summary.split('.')[0]` — fragile
- **Fix:** Update `ReimbursementRaw` type + fix `mapReimbursementToClaim()`

### 6.3 `POST /api/v1/auth/login`
- **Status:** Correctly calls with `application/x-www-form-urlencoded` (matches FastAPI `OAuth2PasswordRequestForm`) — **this is correct**
- **Issues:**
  - After login, `GET /auth/me` returns `user_id` but frontend maps to `id` — **ID field broken**
  - Cookie maxAge 24h vs backend 8-day token
- **Fix:** Remap `user_id` → `id` in `auth.ts`, fix cookie maxAge

### 6.4 HR Policy Studio
- **Status:** PR #14 added HR policy studio in frontend — unclear if it calls `POST /api/v1/policies/upload`
- **Needs verification:** Check `app/hr/` pages for policy upload form and confirm endpoint is wired

---

## SECTION 7 — IMPLEMENTATION TASKS

### Task 1: Fix Type Definitions
**Files:** `frontend/lib/api/types.ts`

- [ ] Rename `User.id` → keep as `id` but map from `user_id` in auth action; add `user_code`, `rank` to `User`
- [ ] Rewrite `Policy` type: add `policy_id`, `alias`, `title`, `overview_summary`, `effective_date`, `status`; rename `reimbursable_categories` → `reimbursable_category`; remove `main_category`
- [ ] Update `ReimbursementRaw`: add `settlement_id`, `line_items`, `confidence`, `employee_department`, `employee_rank`; remove `chain_of_thought`; change `amount` to reference `totals`
- [ ] Add new types: `DocumentUploadResponse`, `EditDocumentRequest`, `EditDocumentResponse`, `AnalyzeRequest`, `AnalyzeResponse`
- [ ] Commit: `fix(types): align frontend types with backend response schemas`

### Task 2: Fix Auth Mapping
**Files:** `frontend/lib/actions/auth.ts`

- [ ] In `login()`: map `response.user_id` → `id` when building User object (or accept `user_id` in type and alias)
- [ ] Add `user_code` and `rank` to mapped user object
- [ ] Fix cookie `maxAge` from `86400` → `691200` (8 days to match backend token)
- [ ] Commit: `fix(auth): correct user_id mapping and cookie expiry to match backend`

### Task 3: Fix Policy Mapping
**Files:** `frontend/lib/actions/policies.ts`

- [ ] Update `getPolicies()` to map `reimbursable_category` (singular) from backend response
- [ ] Map `policy_id`, `alias`, `title`, `overview_summary`, `effective_date`, `status` into Policy objects
- [ ] Update mock fallback structure to match new type shape
- [ ] Update `app/employee/claims/page.tsx` usage (line ~469) to use `reimbursable_category` (singular)
- [ ] Commit: `fix(policies): correct field mapping for policy list endpoint`

### Task 4: Fix Reimbursement Mapping
**Files:** `frontend/lib/actions/claims.ts`, `frontend/lib/actions/dashboard.ts`

- [ ] Update `ReimbursementRaw` usage: read `totals.net_approved` for display amount
- [ ] Remove `chain_of_thought` references; use `summary` field instead
- [ ] Update `mapReimbursementToClaim()`: fix amount extraction, add `settlement_id`, `line_items`
- [ ] Commit: `fix(claims): correct reimbursement field mapping`

### Task 5: Wire Claims Submission to Backend (Critical)
**Files:** `frontend/app/employee/claims/page.tsx`, `frontend/lib/actions/claims.ts`

- [ ] Replace Stage 2 (fake OCR simulation) with real call to `POST /api/v1/documents/upload`
  - Send files as multipart `FormData`
  - Receive: `settlement_id`, `document_ids`, `receipts[]`, `totals`, `all_warnings`
  - Store `settlement_id` and `document_ids` in component state
- [ ] Stage 3 (Verification): Display real OCR data from document upload response instead of `MOCK_OCR_RECEIPTS`
- [ ] On verification edit: call `POST /api/v1/documents/{document_id}/edits` with changed fields
- [ ] Add policy selector dropdown in Stage 3 (user picks which policy to evaluate against)
- [ ] Final submit: call `POST /api/v1/reimbursements/analyze` with `{ settlement_id, policy_id, all_category }`
- [ ] Display judgment result (APPROVED / MANUAL REVIEW / REJECTED) + summary after analyze
- [ ] Rewrite `processReceipt()` server action → call `POST /api/v1/documents/upload`
- [ ] Rewrite `submitClaim()` server action → call `POST /api/v1/reimbursements/analyze`
- [ ] Add `editDocument()` server action → call `POST /api/v1/documents/{document_id}/edits`
- [ ] Commit: `feat(claims): wire OCR upload and compliance analysis to backend`

### Task 6: Wire HR Dashboard to Backend
**Files:** `frontend/app/hr/dashboard/page.tsx`, `frontend/app/hr/hr_components/mockData.ts`

- [ ] Replace `ATTENTION_CLAIMS` and `APPROVED_CLAIMS` mocks with real `GET /api/v1/reimbursements/` call (HR role sees all)
- [ ] Filter "Requires Attention" tab: `judgment === "MANUAL REVIEW"` or `status === "REVIEW"`
- [ ] Filter "Passed AI Review" tab: `judgment === "APPROVED"`
- [ ] Wire "View" button to reimbursement detail (using `reim_id`)
- [ ] Commit: `feat(hr): replace mock claims with real reimbursements API`

### Task 7: HR Claim Review Detail Page
**Files:** `frontend/app/hr/view/[id]/page.tsx`, `frontend/app/hr/review/[id]/page.tsx`

- [ ] Implement `GET /api/v1/reimbursements/` + filter by `reim_id` for detail view (no single-item endpoint exists)
- [ ] Display: judgment, confidence, summary, line_items, totals
- [ ] For review page: add status update action (needs backend endpoint — see Task 9)
- [ ] Commit: `feat(hr): implement claim detail and review pages`

### Task 8: Fix History Page
**Files:** `frontend/app/employee/history/page.tsx`, `frontend/app/employee/history/_components/historyData.ts`

- [ ] Replace `HISTORY_CLAIMS` mock with real `GET /api/v1/reimbursements/` call (employee sees own)
- [ ] Map real `line_items` for the sidebar detail drawer
- [ ] Commit: `fix(history): replace mock history data with real reimbursements`

### Task 9: Add Missing Backend Endpoints (Backend work)
**Files:** `backend/api/reimbursements.py`, `backend/api/auth.py`, new `backend/api/notifications.py`

> Note: `test_ui.py` has similar DB queries that can be used as reference for the query logic, but all new routes must be defined in production API files, not in `test_ui.py`.

- [ ] Add `GET /api/v1/reimbursements/{reim_id}` — single reimbursement by ID (reference `test_ui.py:get_reimbursements` for the query pattern)
- [ ] Add `PATCH /api/v1/reimbursements/{reim_id}/status` — HR updates status (APPROVED/REJECTED); requires HR role
- [ ] Add `PUT /api/v1/auth/me` — update current user profile (name, email, department); reference `test_ui.py:get_employees` for field list
- [ ] Create `backend/api/notifications.py` with stub `GET /api/v1/notifications` returning `[]` and stub `POST /api/v1/notifications/read-all` returning `{"ok": true}` (so frontend 404s go away for MVP)
- [ ] Register notifications router in `backend/main.py`
- [ ] Commit: `feat(api): add missing endpoints for single reimbursement, status update, profile, notifications`

### Task 10: Verify HR Policy Studio Integration
**Files:** `frontend/app/hr/` pages (policy-related)

- [ ] Locate the Policy Studio page added in PR #14
- [ ] Verify it calls `POST /api/v1/policies/upload` with multipart PDF + `alias` field
- [ ] Verify it calls `GET /api/v1/policies/` to list existing policies
- [ ] Fix any field mapping issues found
- [ ] Commit: `fix(hr-policy): verify and fix policy studio API integration`

---

## SECTION 8 — MOCK DATA TO REMOVE AFTER WIRING

Once each task above is complete, the following mocks should be removed or disabled:

| Mock | File | Remove after |
|---|---|---|
| `MOCK_CLAIMS` | `lib/actions/claims.ts` | Task 4 + 5 |
| `MOCK_STATS`, `MOCK_RECENT_CLAIMS` | `lib/actions/dashboard.ts` | Task 4 |
| `MOCK_NOTIFICATIONS` | `lib/actions/notifications.ts` | Task 9 |
| `MOCK_POLICIES` | `lib/actions/policies.ts` | Task 3 |
| `HISTORY_CLAIMS` | `history/_components/historyData.ts` | Task 8 |
| `MOCK_OCR_RECEIPTS`, `MOCK_DB_DATA` | `src/mocks/claimMockData.ts` | Task 5 |
| `ATTENTION_CLAIMS`, `APPROVED_CLAIMS`, `MOCK_BUNDLES` | `hr/hr_components/mockData.ts` | Task 6 + 7 |

---

## SECTION 9 — VERIFICATION CHECKLIST

After implementation, verify end-to-end:

- [ ] Login with real credentials → JWT cookie set → `GET /auth/me` returns correct user with `user_id` mapped to `id`
- [ ] Employee dashboard shows real reimbursement counts (not mock stats)
- [ ] Claims page: upload 2 receipts → backend OCR runs → real merchant names appear in verification screen
- [ ] Verification screen: edit an amount → `POST /documents/{id}/edits` called → `human_edited=true` in DB
- [ ] Submit claim with a policy selected → `POST /reimbursements/analyze` → judgment appears (APPROVED / MANUAL REVIEW)
- [ ] History page shows real past reimbursements (not `HISTORY_CLAIMS` mock)
- [ ] HR dashboard shows real `REVIEW` status reimbursements from DB
- [ ] HR can view individual claim detail with real line items
- [ ] HR Policy Studio: upload PDF → policy appears in policies list → active policy available in claims dropdown
- [ ] Notifications endpoints return 200 (no 404s in console)

---

## SECTION 10 — FILE MAP (Critical Paths)

### Frontend
- `frontend/lib/api/types.ts` — all type definitions (fix all mismatches here first)
- `frontend/lib/api/client.ts` — base API client (no changes needed)
- `frontend/lib/actions/auth.ts` — login, logout, getCurrentUser (fix user_id mapping)
- `frontend/lib/actions/claims.ts` — getClaims, processReceipt, submitClaim, editDocument (major rewrite)
- `frontend/lib/actions/dashboard.ts` — getDashboardStats, getRecentClaims (fix mapping)
- `frontend/lib/actions/policies.ts` — getPolicies (fix field names)
- `frontend/lib/actions/notifications.ts` — keep stubs, remove mock fallback after Task 9
- `frontend/app/employee/claims/page.tsx` — 3-stage flow (major rewrite for Task 5)
- `frontend/app/employee/history/page.tsx` — replace mock with real data
- `frontend/app/hr/dashboard/page.tsx` — replace mock with real data
- `frontend/app/hr/view/[id]/page.tsx` — implement
- `frontend/app/hr/review/[id]/page.tsx` — implement

### Backend
- `backend/api/reimbursements.py` — add `GET /{id}`, `PATCH /{id}/status`
- `backend/api/auth.py` — add `PUT /me`
- `backend/api/notifications.py` — new file with stub endpoints
- `backend/main.py` — register notifications router
