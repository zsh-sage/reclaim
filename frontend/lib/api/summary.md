# Frontend ↔ Backend API Reconciliation

Base URL: `INTERNAL_API_URL` / `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`)  
API prefix: `/api/v1` (configurable via `API_PREFIX` env var)

---

## All Endpoints — Status

### Auth (`/auth`)

| Method | Path | Frontend Caller | Backend | Status |
|--------|------|-----------------|---------|--------|
| POST | `/auth/login` | `auth.ts › login()` | `auth.py` | Match |
| GET | `/auth/me` | `auth.ts › login(), getCurrentUser()` | `auth.py` | Match |
| PUT | `/auth/me` | `settings.ts › updateProfile()` | `auth.py` — also accepts `department?` | Match (frontend sends subset) |
| POST | `/auth/register` | Not called | `auth.py` | Backend only — no frontend flow |

### Policies (`/policies`)

| Method | Path | Frontend Caller | Backend | Status |
|--------|------|-----------------|---------|--------|
| GET | `/policies/` | `policies.ts › getPolicies()` | `policies.py` | Match |
| POST | `/policies/upload` | `hr.ts › uploadPolicy()` | `policies.py` (HR only) | Match |

### Documents (`/documents`)

| Method | Path | Frontend Caller | Backend | Status |
|--------|------|-----------------|---------|--------|
| POST | `/documents/upload` | `claims.ts › uploadDocuments()` | `documents.py` | Match |
| POST | `/documents/{id}/edits` | `claims.ts › editDocument()` | `documents.py` | Match |
| POST | `/documents/generate-template` | Not called | `documents.py` | Backend only |
| GET | `/documents/settlement/{id}/template` | Not called | `documents.py` | Backend only |
| GET | `/documents/` | Not called | `documents.py` | Backend only |

### Reimbursements (`/reimbursements`)

| Method | Path | Frontend Caller | Backend | Status |
|--------|------|-----------------|---------|--------|
| GET | `/reimbursements/` | `claims.ts`, `dashboard.ts`, `hr.ts` | `reimbursements.py` | Match — supports `limit`, `offset`, `status` query params |
| GET | `/reimbursements/{id}` | `claims.ts › getClaimById()` | `reimbursements.py` | Match (fixed — was `/employee/claims/{id}`) |
| POST | `/reimbursements/analyze` | `claims.ts › analyzeCompliance()` | `reimbursements.py` | Match |
| PATCH | `/reimbursements/{id}/status` | `hr.ts › updateReimbursementStatus()` | `reimbursements.py` (HR only) | Match |
| POST | `/reimbursements/process` | `claims.ts › processReceipt()` | **Does not exist** | Frontend only — likely dead code |
| POST | `/reimbursements/submit` | `claims.ts › submitClaim()` | **Does not exist** | Frontend only — no backend handler |

### Notifications (`/notifications`)

| Method | Path | Frontend Caller | Backend | Status |
|--------|------|-----------------|---------|--------|
| GET | `/notifications/` | `notifications.ts › getNotifications()` | `notifications.py` (stub → returns `[]`) | Match (stub) |
| POST | `/notifications/read-all` | `notifications.ts › markAllNotificationsRead()` | `notifications.py` (stub → returns `{ok:true}`) | Match (stub) |

### Employee (`/employee`) — Frontend only

| Method | Path | Frontend Caller | Backend | Status |
|--------|------|-----------------|---------|--------|
| GET | `/employee/banking` | `settings.ts › getBankingDetails()` | **Does not exist** | Frontend only — no backend handler |

---

## Remaining Issues

| Priority | Endpoint | Needed by | Notes |
|----------|----------|-----------|-------|
| High | `GET /employee/banking` | `settings.ts › getBankingDetails()` | No backend handler; returns mock data |
| Medium | `POST /reimbursements/submit` | `claims.ts › submitClaim()` | No backend handler; final step may be `analyzeCompliance` |
| Low | `POST /reimbursements/process` | `claims.ts › processReceipt()` | Likely dead code; verify and remove |

## Fixed

- `getClaimById()` in `claims.ts` — path corrected from `/employee/claims/${id}` to `/reimbursements/${id}`; return type now maps `ReimbursementRaw` → `DetailedClaim` via `mapReimbursementToClaim` (timeline/receipts/clientName/purpose default to empty)
- `ReimbursementRaw` in `types.ts` — `employee_department` and `employee_rank` made optional (`?`) to reflect that the list endpoint omits them; only the detail endpoint includes them

## Not wired in frontend (backend fully built)

- `POST /documents/generate-template` — renders settlement HTML
- `GET /documents/settlement/{id}/template` — serves saved settlement HTML with human edits applied
- `GET /documents/` — lists user's documents, filterable by `reim_id`
- `POST /auth/register` — account creation

---

## Request / Response Shapes (Key Endpoints)

### `POST /documents/upload`
**Request:** `multipart/form-data`, field `files: File[]`  
**Response:**
```ts
{
  settlement_id: string
  document_ids: string[]
  employee: { name, id, user_code, department, rank, destination, departure_date, arrival_date, location, overseas, purpose }
  receipts: OcrReceiptResult[]
  skipped_receipts: OcrReceiptResult[]
  totals: { transportation, accommodation, meals, others, grand_total, currency }
  all_warnings: string[]
  all_category: string[]
  main_category: string | null
}
```

### `POST /documents/{id}/edits`
**Request:**
```ts
{
  merchant_name?: string, date?: string, time?: string, currency?: string,
  total_amount?: number, destination?: string, departure_date?: string,
  arrival_date?: string, location?: string, overseas?: boolean
}
```
**Response:** `{ document_id, human_edited, change_summary: { has_changes, change_count, high_risk_count, changes_by_field, overall_risk } }`

### `POST /reimbursements/analyze`
**Request:** `{ settlement_id: string, policy_id: string, all_category?: string[], document_ids?: string[] }`  
**Response:**
```ts
{
  reim_id: string, settlement_id: string | null,
  judgment: "APPROVE" | "REJECT" | "PARTIAL_APPROVE" | "MANUAL REVIEW",
  status: string, summary: string,
  line_items: { receipt_name, status, requested_amount, approved_amount, deduction_amount, audit_notes }[],
  totals: { total_requested, total_deduction, net_approved },
  confidence: number | null, currency: string,
  main_category: string, sub_category: string[],
  created_at: string | null, cached: boolean, message: string
}
```
**Caching:** Returns cached result if no human edits and settlement already has a `reimbursement_id`.

### `GET /reimbursements/{id}`
**Response:** Same as `ReimbursementRaw` plus `employee_department` and `employee_rank` (only this endpoint includes them).  
**Frontend mapping:** `getClaimById()` maps result via `mapReimbursementToClaim`; `timeline`, `receipts`, `clientName`, `purpose` default to empty.

### `PATCH /reimbursements/{id}/status` (HR only)
**Request:** `{ status: "APPROVED" | "REJECTED" }`  
**Response:** Full reimbursement dict

### `GET /reimbursements/`
**Query params:** `limit` (default 50), `offset` (default 0), `status?`  
**Auth scoping:** HR sees all; Employee sees own only  
**Note:** Does not include `employee_department` / `employee_rank` — those are detail-only fields.
