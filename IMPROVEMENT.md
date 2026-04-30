# Architectural Review — Reclaim

**Scope:** Backend (FastAPI + LangGraph agents) and deployment configuration.
**Methodology:** Static code analysis across all four pillars below. Issues are ordered by severity within each section.

---

## Pillar 1 — Performance & Scalability

### 1.1 Thread Leak — New Executor Per Request

**Files:** [backend/api/documents.py:98](backend/api/documents.py#L98), [backend/api/reimbursements.py:411](backend/api/reimbursements.py#L411)

Both `upload_documents` and `analyze_reimbursement` create a new `ThreadPoolExecutor(max_workers=1)` per HTTP request and never call `.shutdown()`. Under load, this leaks OS threads indefinitely.

```python
# Current (both files)
executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
executor.submit(_process_background)   # or loop.run_in_executor(executor, ...)
# .shutdown() is never called
```

Fix: use a module-level executor (or FastAPI's built-in `run_in_executor` with the default thread pool).

```python
# Module-level
_executor = ThreadPoolExecutor(max_workers=4)

# In handler
_executor.submit(_process_background)
```

Also: `loop = asyncio.get_event_loop()` in `reimbursements.py:410` is deprecated in Python 3.10+ inside a running coroutine. Replace with `asyncio.get_running_loop()`.

---

### 1.2 N+1 Queries in `_build_reimbursement_response`

**File:** [backend/api/reimbursements.py:41–126](backend/api/reimbursements.py#L41)

`list_reimbursements` passes `include_line_items=False` but the helper **always** executes two queries per row (`LineItem` and `ReimbursementSubCategory`) regardless of the flag. For a page of 50 reimbursements, that is 100 queries every time the HR dashboard loads.

```python
def _build_reimbursement_response(r, db, include_line_items=True, ...):
    line_items = db.exec(select(LineItem).where(...))    # always fires
    sub_cats   = db.exec(select(ReimbursementSubCategory).where(...))  # always fires
```

Fix: guard both queries behind `if include_line_items`, or pre-fetch all line items and sub-cats for the full page in one bulk query, then group in Python (matching the pattern already used for users/departments on lines 154–169).

---

### 1.3 N+1 in `list_policies`

**File:** [backend/api/policies.py:33–52](backend/api/policies.py#L33)

For every policy returned, a separate `PolicyReimbursableCategory` query is issued:

```python
for p in policies:
    cats = db.exec(select(PolicyReimbursableCategory).where(...policy_id == p.policy_id...))
```

Fix: bulk-fetch all `PolicyReimbursableCategory` rows matching the returned policy IDs in one query, then group by `policy_id` in Python.

---

### 1.4 N+1 in `load_context` (Compliance Agent)

**File:** [backend/engine/agents/compliance_agent.py:222–227](backend/engine/agents/compliance_agent.py#L222)

Inside the per-receipt loop, the compliance agent calls `session.get(SupportingDocument, sr.document_id)` once per `SettlementReceipt`. For a 10-receipt submission, that is 10 individual primary-key lookups.

Fix: fetch all `SupportingDocument` rows for the settlement in one query before the loop, then access via a dict (the same pattern is already used on line 242 for the human-edit enrichment block — just move the fetch earlier).

---

### 1.5 LLM Client Instantiated on Every Call

**File:** [backend/engine/llm.py:39–116](backend/engine/llm.py#L39)

All four `get_*_llm()` factories have their `@lru_cache(maxsize=1)` commented out. `create_react_agent(get_agent_llm(), tools)` (compliance_agent.py:324) is called **inside each parallel worker**, meaning N new `ChatOpenAI` objects (each with its own `httpx` connection pool) are created per compliance run.

Fix: restore `@lru_cache(maxsize=1)` on all four factories. The underlying `ChatOpenAI` object is stateless and safe to share.

---

### 1.6 RAG Fallback Loads 100 Rows into Python

**File:** [backend/engine/tools/rag_tool.py:68–85](backend/engine/tools/rag_tool.py#L68)

When pgvector search fails, the fallback fetches `limit(100)` sections and filters by keyword in Python. For large policy documents this transfers significant data over the network only to discard most of it.

Fix: use PostgreSQL `ILIKE` in the fallback query to push the filter to the database.

```python
# Pushes keyword filter to DB instead of Python
stmt = select(PolicySection).where(
    PolicySection.policy_id == policy_uuid,
    or_(*[PolicySection.content.ilike(f"%{kw}%") for kw in kw_lower])
).limit(limit)
```

---

### 1.7 No Database Connection Pool Configuration

**File:** [backend/core/database.py:5–8](backend/core/database.py#L5)

`create_engine` is called with only `DATABASE_URL` and `echo=False`. The default pool (5 connections, 10 overflow) has no `pool_pre_ping`, no `pool_recycle`, and no timeout. Under a compliance run with 4 parallel agent threads, each holding a `Session`, plus the main request handling, pool exhaustion is reachable.

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
)
```

---

### 1.8 Large Images Fully Loaded into Memory

**File:** [backend/engine/agents/document_agent.py:122–128](backend/engine/agents/document_agent.py#L122)

`_ocr_image` reads the full file into memory then base64-encodes it:

```python
with open(file_path, "rb") as f:
    image_bytes = f.read()   # entire file in memory
b64_str = base64.b64encode(image_bytes).decode("utf-8")
```

No file size limit is enforced upstream (see §4.3). A 50MB image would require ~67MB of in-process memory just for the base64 string.

---

## Pillar 2 — Robustness & State Management

### 2.1 CRITICAL — Failed Pipeline Writes No MANUAL_REVIEW Record

**File:** [backend/api/reimbursements.py:449–451](backend/api/reimbursements.py#L449)

The spec (CLAUDE.md) states: *"Any unhandled exception in the Compliance Agent must resolve to `MANUAL_REVIEW`, not a dropped claim."* This is **not implemented**.

When `run_compliance_workflow` raises, `_process_background` catches it and calls `tracker.publish(task_id, "error", ...)` — the SSE client sees an error event. But **no `Reimbursement` row is written to the database**. The employee's claim is silently dropped; it never appears in HR's queue.

```python
except Exception as e:
    logger.exception("[API_ANALYZE_BG] Compliance workflow failed")
    tracker.publish(task_id, "error", {"message": str(e)})
    # Nothing written to DB
```

Fix: in the `except` block, write a minimal `Reimbursement` row with `status=REVIEW`, `judgment=NEEDS_INFO`, and a summary that records the failure reason, then publish the MANUAL_REVIEW record to SSE instead of an error event.

---

### 2.2 `load_context` Silently Swallows Settlement Load Failures

**File:** [backend/engine/agents/compliance_agent.py:231–233](backend/engine/agents/compliance_agent.py#L231)

If any exception occurs while loading settlement data, the node logs and continues with an empty `receipts` list:

```python
except Exception:
    logger.exception("[LOAD_CONTEXT] Error loading settlement data")
    pass
```

The workflow then runs `analyze_receipts` on 0 receipts and produces a trivially `APPROVED` or `MANUAL_REVIEW` judgment on an empty basket. The settlement's receipts are effectively ignored without surfacing the error to the caller.

Fix: re-raise the exception (or return an error state that the graph routes to a failure node) rather than continuing with corrupt state.

---

### 2.3 Wrong Judgment Set on REJECTED Status

**File:** [backend/api/reimbursements.py:256–259](backend/api/reimbursements.py#L256)

```python
if body.status == ReimbursementStatus.REVIEW:
    r.judgment = JudgmentResult.NEEDS_INFO
else:
    r.judgment = JudgmentResult.APPROVED   # ← also covers REJECTED
```

When HR issues `status=REJECTED`, `r.judgment` is set to `APPROVED`. This corrupts the audit trail — a rejected claim reads as `judgment=APPROVED` in any downstream query or export that joins on this field.

Fix:

```python
status_to_judgment = {
    ReimbursementStatus.APPROVED: JudgmentResult.APPROVED,
    ReimbursementStatus.REJECTED: JudgmentResult.REJECTED,
    ReimbursementStatus.REVIEW:   JudgmentResult.NEEDS_INFO,
}
r.judgment = status_to_judgment.get(body.status, JudgmentResult.NEEDS_INFO)
```

---

### 2.4 Shared SQLAlchemy Session Across Parallel Threads

**File:** [backend/engine/tools/compliance_tools.py:44–51](backend/engine/tools/compliance_tools.py#L44), [backend/engine/agents/compliance_agent.py:561](backend/engine/agents/compliance_agent.py#L561)

`make_search_policy_rag_tool(policy_id, session)` closes over the caller's `Session` object. This single session is then shared across all 4 parallel `analyze_one` workers via the `_session_lock`. While the lock prevents concurrent access (correct), it fully serializes all RAG lookups — every per-receipt agent must wait for every other agent's RAG call to complete. This defeats the parallelism the executor is meant to provide.

Fix: each worker should open its own short-lived session for its RAG lookup, using `with Session(engine) as worker_session:` inside `analyze_one`, rather than sharing one session with a lock.

---

### 2.5 ProgressTracker State Is Process-Global with No Expiry Guarantee

**File:** [backend/engine/progress.py:22–71](backend/engine/progress.py#L22)

`ProgressTracker._queues` is a class-level dict shared across all requests. The `cleanup` coroutine (which removes a task after 60s) is only scheduled when an SSE client subscribes **and** the connection closes. In the common case where the client never subscribes (e.g., the browser tab is closed before the SSE connection is established), the task and its queue remain in memory indefinitely.

Fix: add a background `asyncio` task at startup that periodically evicts tasks older than `created_at + N seconds` from `_queues`, regardless of client connection state.

---

## Pillar 3 — Architecture & Clean Code

### 3.1 Untyped Response Bodies Bypass FastAPI Validation

**File:** [backend/api/reimbursements.py:141](backend/api/reimbursements.py#L141), [backend/api/policies.py:31](backend/api/policies.py#L31), [backend/api/auth.py:99](backend/api/auth.py#L99)

Most endpoints declare `-> List[dict]` or `-> dict` return types instead of the Pydantic models already defined in `schemas.py`. This means:
- FastAPI cannot validate or serialize the response.
- The OpenAPI schema shows `{}` for these endpoints instead of the real shape.
- Silent type mismatches (e.g., a UUID that should be a string) won't be caught.

`ReimbursementResponse`, `PolicyResponse`, `UserResponse` are all defined but unused as return annotations. Switching to them costs nothing and makes the API self-documenting.

---

### 3.2 Business Logic Embedded in the Routing Layer

**Files:** [backend/api/reimbursements.py:204–270](backend/api/reimbursements.py#L204), [backend/api/documents.py:160–261](backend/api/documents.py#L160)

`update_reimbursement_status` contains:
- auto-approval of previously rejected line items
- financial recalculation (approved sum, rejected sum)
- judgment enum remapping
- audit log mutation (HR note injection into `ai_reasoning`)

`_build_aggregated_from_settlement` contains receipt reconstruction, category mapping, and employee context resolution — all inside a router file.

Both belong in a service/use-case layer (e.g., `services/reimbursement_service.py`, `services/document_service.py`) that the router delegates to. This makes the logic testable in isolation and prevents duplication between HTTP handlers.

---

### 3.3 API Layer Imports Engine Internals

**File:** [backend/api/documents.py:167](backend/api/documents.py#L167), [backend/api/documents.py:275](backend/api/documents.py#L275)

```python
from engine.agents.document_agent import _map_category_to_column
from engine.agents.document_agent import _get_active_categories
```

Private functions (underscore-prefixed) from the engine agent are imported directly into the router. This couples the API layer to agent implementation details — renaming or moving these helpers in the agent breaks the router.

Fix: expose public utility functions from a stable internal module (e.g., `engine/utils/category.py`) and have both the agent and the router import from there.

---

### 3.4 Hardcoded Stale Model Name in Audit Trail

**File:** [backend/engine/agents/compliance_agent.py:473](backend/engine/agents/compliance_agent.py#L473)

```python
ai_reasoning={
    "model": "ilmu-glm-5.1",  # ← hardcoded; actual model is Gemini via OpenRouter
    ...
}
```

Every compliance judgment written since the model switch records an incorrect model name in the `ai_reasoning` audit log. This is a data integrity issue for any downstream audit that relies on this field.

Fix: read the model name from `settings.CHAT_MODEL` at runtime.

---

### 3.5 `UpdateProfileRequest` Defined Twice

**Files:** [backend/api/auth.py:17](backend/api/auth.py#L17), [backend/api/schemas.py:69](backend/api/schemas.py#L69)

Identical schema defined in two places. The one in `auth.py` shadows the one in `schemas.py`. Delete the local definition and import from `schemas`.

---

## Pillar 4 — Security & Deployment

### 4.1 CRITICAL — Open Self-Registration with Arbitrary Role

**File:** [backend/api/auth.py:49–81](backend/api/auth.py#L49)

`POST /api/v1/auth/register` accepts `role: UserRole` from the request body with no authentication gate:

```python
user_obj = User(
    ...
    role=user_in.role,   # ← caller chooses their own role
    ...
)
```

Any anonymous client can `POST {"role": "HR", ...}` and receive a valid HR-privileged JWT. This grants full access to: policy management, all employees' reimbursement claims, HR-only triage and approval decisions.

**Fix (minimum):** Force `role=UserRole.Employee` on self-registration. HR accounts must be provisioned by an existing HR user through a separate, authenticated endpoint.

```python
user_obj = User(
    ...
    role=UserRole.Employee,   # never trust caller-supplied role
    ...
)
```

---

### 4.2 CRITICAL — Path Traversal in File Upload

**File:** [backend/api/documents.py:77–89](backend/api/documents.py#L77), [backend/api/policies.py:73–74](backend/api/policies.py#L73)

`file.filename` is used directly to construct the destination path:

```python
fname = file.filename or "unnamed_upload"
dest = user_dir / fname    # ← unvalidated
```

A filename of `../../other_user_uuid/evil.jpg` or `../../etc/cron.d/backdoor` resolves outside the intended storage directory. The policy upload has the same vulnerability.

Fix:

```python
# Strip all directory components before constructing the path
safe_name = Path(file.filename).name
dest = user_dir / safe_name
# Additionally assert the resolved path is inside the intended directory
assert str(dest.resolve()).startswith(str(user_dir.resolve()))
```

---

### 4.3 No File Upload Size Limit or Content Validation

**File:** [backend/api/documents.py:64–126](backend/api/documents.py#L64)

`upload_documents` reads the entire file content into memory with no size check:

```python
content = await file.read()   # entire file, no limit
await out.write(content)
```

Type detection is solely based on `content_type.startswith("image/")` — no MIME sniffing, no file content validation, no extension whitelist. A client can upload a 500MB ZIP with `Content-Type: image/jpeg` and crash the server on the base64 encoding step.

Fix: enforce a size limit at the FastAPI layer using `UploadFile` size limits or a middleware check; validate the actual file magic bytes (`imghdr`/`filetype` library) rather than trusting `Content-Type`.

---

### 4.4 Unauthenticated SSE Progress Endpoints

**Files:** [backend/api/documents.py:129–153](backend/api/documents.py#L129), [backend/api/reimbursements.py:459–483](backend/api/reimbursements.py#L459)

```python
@router.get("/progress/{task_id}")
async def document_progress(task_id: str):
    # No auth dependency
```

These endpoints stream intermediate compliance analysis data — which includes extracted receipt amounts, merchant names, and AI verdict reasoning — to any client that knows the `task_id`. Task IDs are hex UUIDs (32 chars) returned only to the authenticated requestor, but the SSE endpoints themselves do not verify identity.

Fix: add `current_user: User = Depends(deps.get_current_user)` to both SSE handlers.

---

### 4.5 `reviewed_by` Sourced from Client Request Body

**File:** [backend/api/reimbursements.py:204–268](backend/api/reimbursements.py#L204), [backend/api/schemas.py:260–265](backend/api/schemas.py#L260)

```python
class StatusUpdateRequest(BaseModel):
    reviewed_by: UUID   # ← client supplies this
```

```python
r.reviewed_by = body.reviewed_by   # written directly to DB
```

An authenticated HR user can attribute their approval or rejection decision to any other user's UUID, including another HR user or even an employee. The `reviewed_by` audit field should always be set to `current_user.user_id` from the JWT token and removed from `StatusUpdateRequest`.

---

### 4.6 Employee Can Submit Against Any Policy ID

**File:** [backend/api/reimbursements.py:349–369](backend/api/reimbursements.py#L349)

`AnalyzeReimbursementRequest.policy_id` is fully employee-supplied. The validation only checks that the policy exists, not that it is `ACTIVE`:

```python
policy = db.get(Policy, policy_uuid)
if not policy:
    raise HTTPException(...)
# No check: policy.status == PolicyStatus.ACTIVE
```

An employee can pass a `DEPRECATED` or `DRAFT` policy ID to be evaluated against older, potentially more permissive conditions.

Fix:

```python
if policy.status != PolicyStatus.ACTIVE:
    raise HTTPException(status_code=400, detail="Policy is not active")
```

---

### 4.7 `editable_fields` Is Fully Mutable — Fraud Trap Not Enforced in Code

**File:** [backend/api/documents.py:479](backend/api/documents.py#L479)

The design document calls `editable_fields` immutable once written. The code does not enforce this:

```python
doc.editable_fields = edits   # replaces prior edits entirely
doc.human_edited = True
db.commit()
```

Repeated calls to `POST /{document_id}/edits` completely replace the stored edits. The change history is preserved in `document_change_logs`, but `editable_fields` — the value actually used for compliance evaluation — can be changed arbitrarily until the compliance run fires. An employee can submit, then silently change extracted amounts to pass validation, then trigger analysis.

Architectural fix: freeze `editable_fields` at submission time (when `TravelSettlement` status transitions to "submitted") and reject further edits after that point.

---

### 4.8 Seed Scripts Run Unconditionally on Every Container Start

**File:** [compose.yml:44](compose.yml#L44)

```yaml
command: bash -c "python seed_demo_employees.py && python seed_mock_policy.py && python seed_mock_data.py && exec uvicorn ..."
```

Seed scripts run on every container restart. If they lack idempotency guards, they create duplicate demo records with predictable credentials on each start. Even if they are idempotent, this pattern couples development-only data seeding to the production startup path.

Fix: gate seeding behind an env var (`RUN_SEED=true`) or remove from the compose command entirely — seed data should be applied once via a separate `make seed` target.

---

### 4.9 Default Secret Key in Config

**File:** [backend/core/config.py:8](backend/core/config.py#L8)

```python
SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION"
```

If the `.env` file is missing or `SECRET_KEY` is not set, JWTs are signed with this known default. All tokens produced in that state are forgeable by anyone who knows this string (public in the repo).

Fix: fail fast at startup if `SECRET_KEY` is the default:

```python
@model_validator(mode="after")
def check_secret_key(self):
    if self.SECRET_KEY == "YOUR_SUPER_SECRET_KEY_CHANGE_THIS_IN_PRODUCTION":
        raise ValueError("SECRET_KEY must be set to a secure value in .env")
    return self
```

---

### 4.10 CORS Wildcard with Credentials — **done**

**File:** [backend/main.py:53–59](backend/main.py#L53)

```python
allow_origins=["*"],
allow_credentials=True,
```

Browsers will reject credentialed cross-origin requests when `allow_origins=["*"]`. FastAPI silently accepts this configuration without warning, but it means CORS is **neither secure nor functional** for credentialed requests in a browser. Replace with the explicit frontend origin.

---

## Summary Table

| # | Pillar | Severity | Issue |
|---|--------|----------|-------|
| 4.1 | Security | **Critical** | Open self-registration allows HR role self-elevation *(skipped — demo seed requires open registration)* |
| 4.2 | Security | **Critical** | Path traversal in file upload via unsanitized filename — **done** |
| 2.1 | Robustness | **High** | Failed compliance pipeline writes no MANUAL_REVIEW record — **done** |
| 2.3 | Robustness | **High** | REJECTED status incorrectly sets judgment to APPROVED — **done** |
| 4.4 | Security | **High** | SSE progress endpoints have no authentication — **done** |
| 4.5 | Security | **High** | `reviewed_by` sourced from client body, not JWT — **done** |
| 4.6 | Security | **Medium** | Employee can submit against DEPRECATED/DRAFT policies — **done** |
| 4.7 | Security | **Medium** | editable_fields overwritten freely — fraud trap not code-enforced |
| 2.2 | Robustness | **Medium** | load_context silently swallows settlement load failures — **done** |
| 1.1 | Performance | **Medium** | Thread leak — new executor per request, never shut down — **done** |
| 1.2 | Performance | **Medium** | N+1 queries in list_reimbursements — **done** |
| 1.5 | Performance | **Medium** | LLM client re-instantiated on every call (lru_cache commented out) — **done** |
| 3.1 | Architecture | **Low** | Untyped `dict` responses bypass FastAPI validation/docs |
| 3.2 | Architecture | **Low** | Business logic embedded in routing layer |
| 3.3 | Architecture | **Low** | Router imports private engine functions |
| 3.4 | Architecture | **Low** | Hardcoded stale model name in audit trail — **done** |
| 3.5 | Architecture | **Low** | `UpdateProfileRequest` defined twice — **done** |
| 1.3 | Performance | **Low** | N+1 queries in list_policies — **done** |
| 1.4 | Performance | **Low** | N+1 per-receipt document lookup in load_context — **done** |
| 2.4 | Robustness | **Low** | Shared DB session across parallel agents serializes RAG calls |
| 4.8 | Deployment | **Low** | Seed scripts run unconditionally on every container start |
| 4.9 | Deployment | **Low** | Default SECRET_KEY used if .env is missing — **done** |
| 1.6 | Performance | **Low** | RAG fallback loads 100 rows into Python for in-memory filtering — **done** |
| 1.7 | Performance | **Low** | No connection pool configuration on SQLAlchemy engine — **done** |
| 4.3 | Security | **Low** | No file upload size limit or content validation |

---

# Frontend Architectural Review — Reclaim

**Scope:** Next.js 16 App Router frontend (TypeScript, Tailwind CSS 4, React Hook Form + Zod).
**Methodology:** Static analysis across all four pillars. Issues ordered by severity within each section.

---

## F-Pillar 1 — Performance & Rendering

### F1.1 Unmemoized Filter Computations Rerun on Every Keystroke

**File:** [frontend/app/hr/dashboard/page.tsx](frontend/app/hr/dashboard/page.tsx)

`applyFilters` and `uniqueValues` are plain functions defined inside the component. With 846 lines of component state, every keystroke into the search input re-runs full filter passes over the entire claims array.

```tsx
// Current — recreated on every render
function applyFilters(claims: Bundle[], ...) { ... }
const filtered = applyFilters(claims, searchTerm, ...);
const uniqueDepts = [...new Set(filtered.map(c => c.department))];
```

Fix: memoize both with `useMemo`, keyed to the relevant state slices.

```tsx
const filtered = useMemo(
  () => applyFilters(claims, searchTerm, statusFilter, deptFilter),
  [claims, searchTerm, statusFilter, deptFilter]
);
const uniqueDepts = useMemo(
  () => [...new Set(claims.map(c => c.department))],
  [claims]
);
```

---

### F1.2 Notifications Re-fetched on Every TopNav Mount

**File:** [frontend/app/employee/_components/TopNav.tsx](frontend/app/employee/_components/TopNav.tsx)

`getNotifications()` is called inside a bare `useEffect` with no dependency array guard or SWR/React Query cache. Every navigation that remounts TopNav fires a fresh backend request.

```tsx
useEffect(() => {
  getNotifications().then(setNotifications);
}, []); // re-fetches on every mount — no dedup, no staleness window
```

Fix: either use SWR with a revalidation interval, or cache in AuthContext alongside the user object with a TTL.

---

### F1.3 Login Background Uses External Unsplash URL

**File:** [frontend/app/login/page.tsx](frontend/app/login/page.tsx)

The login hero image is loaded from `https://images.unsplash.com/...` via a CSS `background-image` style. This bypasses `next/image` optimization (no WebP conversion, no lazy loading, no LCP priority hint, no domain allowlisting).

```tsx
// Current
style={{ backgroundImage: `url('https://images.unsplash.com/photo-...')` }}
```

Fix: download the asset into `public/`, use `next/image` with `priority` for LCP treatment, and add the domain to `next.config.ts` only if the URL must remain remote.

---

### F1.4 `useRouter()` Called Per Table Row — N Hook Subscriptions

**File:** [frontend/app/hr/dashboard/page.tsx](frontend/app/hr/dashboard/page.tsx)

`ClaimRow` is an inline component inside the dashboard render function. Each row calls `const router = useRouter()`. For a 50-claim table this registers 50 router context subscriptions that all re-render when navigation state changes.

```tsx
// Current — ClaimRow defined inside parent, useRouter per instance
function ClaimRow({ bundle }: { bundle: Bundle }) {
  const router = useRouter(); // ← called for every row
  ...
}
```

Fix: extract `ClaimRow` to a top-level module export so it is a stable reference, and either hoist a single `router` to the parent or use `<Link>` instead.

---

### F1.5 Zero Client-Side Caching — All Requests Use `cache: "no-store"`

**File:** [frontend/lib/api/client.ts](frontend/lib/api/client.ts)

Every Axios request instance is configured with `cache: "no-store"`. There is no SWR or React Query layer, no stale-while-revalidate strategy, and no deduplication of concurrent identical requests. Two components mounting simultaneously fire duplicate requests.

Fix: introduce SWR or TanStack Query with per-endpoint stale times; dashboard stats can tolerate 60 s stale, HR claims list 30 s, notifications 15 s.

---

### F1.6 30+ Icon Imports Without Bundle Impact Analysis

**File:** [frontend/app/hr/policy/page.tsx](frontend/app/hr/policy/page.tsx)

The policy page imports more than 30 named icons from `lucide-react` in a single statement. While lucide-react supports tree-shaking, the empty `next.config.ts` provides no bundle analyzer to confirm dead-code elimination is working. Until `@next/bundle-analyzer` is wired in, this is an unverified assumption.

Fix: add `@next/bundle-analyzer` to `next.config.ts` and run `ANALYZE=true npm run build` to confirm icon bundle contribution before the first production build.

---

## F-Pillar 2 — State Management & Data Flow

### F2.1 `verifySession` Calls Backend on Every App Mount — No In-Memory Cache

**File:** [frontend/context/AuthContext.tsx](frontend/context/AuthContext.tsx)

`AuthContext` fires `GET /api/auth/me` inside `useEffect` on every mount with no deduplication or cache. On a mobile connection a multi-second spinner blocks every page load. Rapid navigation that unmounts and remounts the provider (e.g., back/forward) fires duplicate inflight requests.

```tsx
useEffect(() => {
  verifySession().then(...); // network round-trip on every mount
}, []);
```

Fix: cache the resolved user object in a `useRef` or module-level variable with a short TTL (e.g., 30 s). Only re-verify when the cookie is believed to have changed (login/logout events).

---

### F2.2 No `middleware.ts` Route Guard — Unauthenticated Users See Protected Layouts

**File:** (missing — `frontend/middleware.ts` does not exist)

Without a Next.js middleware, unauthenticated requests to `/employee/*` or `/hr/*` render the full authenticated shell (sidebar, nav) before `AuthContext` resolves and redirects. This causes a visible flash of protected UI and leaks route structure to unauthenticated clients.

Fix: add `frontend/middleware.ts` with cookie presence check to redirect `/employee/*` and `/hr/*` to `/login` before the page renders.

```ts
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token");
  const isProtected = req.nextUrl.pathname.startsWith("/employee") ||
                      req.nextUrl.pathname.startsWith("/hr");
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
export const config = { matcher: ["/employee/:path*", "/hr/:path*"] };
```

---

### F2.3 Data Fetching Scattered in Sequential `useEffect` Waterfalls

**File:** [frontend/app/hr/dashboard/page.tsx](frontend/app/hr/dashboard/page.tsx)

Multiple `useEffect` calls each trigger independent `fetch` → `setState` cycles. Because each effect runs after the previous render commits, they execute as a waterfall rather than a concurrent fan-out. A single composite `useEffect` or a single server-action call returning all dashboard data would halve round-trips.

---

### F2.4 Frontend Type Declares `cached: boolean` That Backend Never Returns

**File:** [frontend/lib/api/types.ts](frontend/lib/api/types.ts)

`AnalyzeResponse` includes a `cached: boolean` field that the backend `AnalyzeReimbursementRequest` schema and compliance agent never emit. This is a silent contract mismatch — code that branches on `response.cached` will always receive `undefined`, not `false`.

Fix: remove the field or add the corresponding backend field and logic. Do not leave phantom contract fields in the type layer.

---

### F2.5 Duplicate User Mapping in Two Server Actions

**File:** [frontend/lib/actions/auth.ts](frontend/lib/actions/auth.ts)

Both `login()` and `getCurrentUser()` contain the same `UserResponse → User` mapping block. Any schema change (e.g., adding `department_id`) must be made in two places.

Fix: extract a `mapUserResponse(raw: UserResponse): User` pure function and call it from both actions.

---

### F2.6 No Data Invalidation After HR Status Update

**File:** [frontend/lib/actions/hr.ts](frontend/lib/actions/hr.ts)

After `updateReimbursementStatus` succeeds, there is no cache invalidation or re-fetch trigger. The HR claims table continues to show the pre-update status until a full page reload. In the absence of a query cache, the fix is to return the updated record from the server action and merge it into component state.

---

## F-Pillar 3 — Architecture & Component Design

### F3.1 HR Dashboard Is an 846-Line Mega-Component

**File:** [frontend/app/hr/dashboard/page.tsx](frontend/app/hr/dashboard/page.tsx)

The file contains at least six distinct UI units defined inline: `ClaimRow`, `Avatar`, `StatusBadge`, `FilterPanel`, `ViewAllModal`, and the page itself — plus all data-fetching logic. This violates single-responsibility and makes the file untestable in isolation.

Suggested split:
- `components/claims/ClaimRow.tsx`
- `components/claims/StatusBadge.tsx`
- `components/claims/FilterPanel.tsx`
- `components/claims/ViewAllModal.tsx`
- `components/ui/Avatar.tsx`
- `hooks/useClaimsFilter.ts` (filter logic + memoization)

---

### F3.2 Server Action Imports Types From a UI Mock-Data File — Inverted Dependency

**File:** [frontend/lib/actions/hr.ts](frontend/lib/actions/hr.ts), [frontend/app/hr/hr_components/mockData.ts](frontend/app/hr/hr_components/mockData.ts)

`hr.ts` (a server action in `lib/`) imports `Bundle` and related types from `app/hr/hr_components/mockData.ts` (a UI-layer file). The dependency arrow points the wrong direction: library code must not import from app-layer UI files.

Fix: move all shared types to `frontend/lib/api/types.ts` (where `ReimbursementRaw` already lives) and update all import sites. Delete `mockData.ts` once its types are moved and its empty mock arrays are unused.

---

### F3.3 `mapToBundle` Hardcodes `human_edited: false` — Silently Drops Fraud Trap Signal

**File:** [frontend/lib/actions/hr.ts](frontend/lib/actions/hr.ts)

The mapper that transforms backend reimbursements to the frontend `Bundle` type always sets `human_edited: false`, regardless of what the backend returns. This means HR reviewers never see the fraud-trap indicator — a field the backend carefully preserves.

```ts
// Current
human_edited: false,  // ← hardcoded, drops backend value
```

Fix:

```ts
human_edited: raw.human_edited ?? false,
```

Also: `entity: "Reclaim Sdn. Bhd."` is hardcoded. This should come from the authenticated user's company or a configuration constant, not a string literal in a mapper.

---

### F3.4 TopNav Search Returns Hardcoded Fake Results

**File:** [frontend/app/employee/_components/TopNav.tsx](frontend/app/employee/_components/TopNav.tsx)

The search bar renders result items `RC-8892` and `RC-8885` unconditionally, regardless of what the user types. This is non-functional UI presented as real search. It will confuse users and signal to any demo evaluator that the feature is incomplete.

Fix: either wire the search bar to a real `GET /api/v1/reimbursements?search=` endpoint or remove the dropdown entirely and replace with a placeholder that does not mimic real results.

---

### F3.5 Demo Password Hardcoded as String Literal in Client Bundle

**File:** [frontend/app/login/page.tsx](frontend/app/login/page.tsx)

```tsx
// Current
<p>Password: <strong>password</strong></p>
```

The string `"password"` is embedded in the JSX of the login page, which ships to every browser. Even for a demo, this trains users to ignore credential hygiene cues. For a hackathon judged on security posture, this is a visible signal.

Fix: move demo credential hints to a `README` or a non-bundled admin page; or at minimum render them only in `process.env.NODE_ENV === "development"`.

---

### F3.6 `next.config.ts` Is Completely Empty

**File:** [frontend/next.config.ts](frontend/next.config.ts)

The config file exports a bare `{}`. This leaves the following unaddressed:
- **No `images.remotePatterns`** — if Unsplash URL is ever moved to `next/image`, it will throw at runtime
- **No security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Content-Security-Policy` are all absent
- **No `poweredByHeader: false`** — response headers advertise `X-Powered-By: Next.js`
- **No bundle analyzer** — impossible to audit JS payload size

Minimal fix:

```ts
const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
};
```

---

## F-Pillar 4 — Robustness, Accessibility & Security

### F4.1 No React Error Boundaries — Any Component Crash White-Screens the App

**Files:** [frontend/app/layout.tsx](frontend/app/layout.tsx), [frontend/app/employee/layout.tsx](frontend/app/employee/layout.tsx)

Neither the root layout nor the employee/HR shell layouts wrap children in an `ErrorBoundary`. A single unhandled render error (e.g., unexpected `null` from a malformed API response) propagates to the root and replaces the entire app with a blank screen in production.

Fix: wrap each portal shell and each major page section in an `ErrorBoundary` with a graceful fallback UI. Next.js 13+ `error.tsx` files per route segment are the idiomatic solution.

---

### F4.2 HR Claims Table Has No Loading State — Empty Is Indistinguishable from No Data

**File:** [frontend/app/hr/dashboard/page.tsx](frontend/app/hr/dashboard/page.tsx)

During the initial claims fetch, the table renders with zero rows. There is no skeleton, spinner, or "Loading…" indicator. A reviewer evaluating the app for the first time on a slow connection will see an empty table and assume no data exists.

Fix: track a `isLoadingClaims` boolean and render a skeleton rows component while `isLoadingClaims && claims.length === 0`.

---

### F4.3 `ViewAllModal` Has No Focus Trap — Keyboard Users Tab Through Background

**File:** [frontend/app/hr/dashboard/page.tsx](frontend/app/hr/dashboard/page.tsx)

The modal overlay is implemented with a conditionally rendered `<div>` but contains no focus trap (`focus-trap-react` or equivalent). Keyboard users pressing Tab inside the modal will cycle through all tabbable elements in the background DOM, violating WCAG 2.1 SC 2.1.2 (No Keyboard Trap — inverted: the trap that should exist is absent, allowing escape from modal context).

Fix: use `focus-trap-react` or the native `<dialog>` element which provides a built-in focus trap and `Escape` key dismissal.

---

### F4.4 Clickable `<tr>` Rows Have No Keyboard Accessibility

**File:** [frontend/app/hr/review/[id]/page.tsx](frontend/app/hr/review/%5Bid%5D/page.tsx)

Table rows with `onClick` handlers are missing `tabIndex={0}`, `role="button"` (or `role="row"` with `aria-selected`), and `onKeyDown` (Enter/Space activation). Mouse-only interaction on data tables violates WCAG 2.1 SC 2.1.1.

Fix:

```tsx
<tr
  tabIndex={0}
  role="button"
  aria-label={`Review claim ${claim.id}`}
  onClick={() => handleRowClick(claim)}
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleRowClick(claim); }}
>
```

---

### F4.5 Notification Items Are `<div onClick>` — Not Keyboard Accessible

**File:** [frontend/app/employee/_components/TopNav.tsx](frontend/app/employee/_components/TopNav.tsx)

Notification dropdown items use `<div onClick={...}>` without `role`, `tabIndex`, or keyboard handlers. Screen readers announce no interactive role; keyboard users cannot activate them. This fails WCAG 2.1 SC 4.1.2 (Name, Role, Value).

Fix: replace with `<button type="button">` elements or add `role="menuitem"`, `tabIndex={0}`, and `onKeyDown` to each `<div>`.

---

### F4.6 Login Page Uses `data-alt` Attribute Instead of Standard `alt`

**File:** [frontend/app/login/page.tsx](frontend/app/login/page.tsx)

The hero image element uses `data-alt="..."` — a custom data attribute that screen readers do not interpret as an image alternative. The accessible name of the image is absent.

Fix: if the element is a semantic `<img>`, use `alt="..."`. If it is a decorative background `<div>`, add `aria-hidden="true"`.

---

### F4.7 `EventSource` Has No Auth Header and a Hardcoded Localhost Fallback

**File:** [frontend/lib/sse.ts](frontend/lib/sse.ts)

```ts
// Current
const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/documents/progress/${taskId}`;
const source = new EventSource(url);
```

Two issues:
1. `EventSource` does not support custom headers. The progress endpoint (`/documents/progress/{task_id}`) is currently unauthenticated on the backend, meaning any client who guesses or brute-forces a `task_id` can observe a user's document processing progress.
2. The `|| "http://localhost:8000"` fallback silently connects to a developer's local machine in production if `NEXT_PUBLIC_API_URL` is unset. This will fail silently in production deployments.

Fix for (1): scope `task_id` to the authenticated user server-side by requiring a JWT-signed task token. Fix for (2): throw an error at build time if `NEXT_PUBLIC_API_URL` is unset rather than defaulting to localhost.

---

### F4.8 `isLoading: true` Default in AuthContext Causes Full-App Flash

**File:** [frontend/context/AuthContext.tsx](frontend/context/AuthContext.tsx)

`AuthContext` initializes `isLoading` as `true`. On first render, before `verifySession` resolves, every page that reads `isLoading` from context is in a loading state. Without a skeleton layout, the app flashes blank for the duration of the session verification round-trip on every hard load.

Fix: render a full-page skeleton (matching the authenticated shell dimensions) while `isLoading` is true, rather than rendering nothing or the unauthenticated state. This eliminates the flash and provides a perceived performance improvement.

---

## Frontend Summary Table

| ID | Pillar | Severity | Issue |
|----|--------|----------|-------|
| F3.3 | Architecture | **Critical** | `mapToBundle` hardcodes `human_edited: false` — drops fraud trap signal — **done** |
| F3.4 | Architecture | **High** | TopNav search shows hardcoded fake results — **done** |
| F2.2 | State | **High** | No `middleware.ts` — unauthenticated users see protected layouts — **done** |
| F4.1 | Robustness | **High** | No Error Boundaries — any render crash white-screens the app — **done** |
| F4.7 | Security | **High** | `EventSource` unauthenticated; localhost fallback in production — **done** (localhost fallback removed; SSE auth tracked as backend 4.4 done) |
| F3.5 | Security | **High** | Demo password `"password"` hardcoded in client bundle *(skipped — demo buttons need working password for judges)* |
| F3.6 | Architecture | **High** | Empty `next.config.ts` — no security headers, no image domains — **done** |
| F3.2 | Architecture | **Medium** | Server action imports types from UI mock-data file (inverted dep) |
| F2.1 | State | **Medium** | `verifySession` hits backend on every app mount — no cache — **done** |
| F2.4 | State | **Medium** | `AnalyzeResponse.cached` field backend never returns (contract mismatch) — **done** |
| F3.1 | Architecture | **Medium** | HR dashboard is an 846-line mega-component |
| F4.3 | Accessibility | **Medium** | ViewAllModal has no focus trap — **done** |
| F4.4 | Accessibility | **Medium** | Clickable `<tr>` rows inaccessible to keyboard users — **done** |
| F4.5 | Accessibility | **Medium** | Notification `<div onClick>` items not keyboard accessible — **done** |
| F4.8 | Robustness | **Medium** | `isLoading: true` default causes full-app flash on every load |
| F1.1 | Performance | **Medium** | Filter computations not memoized — rerun on every keystroke — **done** |
| F2.3 | State | **Medium** | Sequential `useEffect` waterfalls instead of concurrent fan-out |
| F2.6 | State | **Medium** | No data invalidation after HR status update |
| F4.2 | Robustness | **Medium** | No loading state for HR claims table — **done** |
| F1.2 | Performance | **Low** | Notifications re-fetched on every TopNav mount — **done** |
| F1.3 | Performance | **Low** | Login background uses external Unsplash URL, bypasses `next/image` |
| F1.4 | Performance | **Low** | `useRouter()` called per table row — N hook subscriptions — **done** |
| F1.5 | Performance | **Low** | All API requests use `cache: "no-store"` — zero caching strategy |
| F1.6 | Performance | **Low** | 30+ icon imports without bundle analyzer to confirm tree-shaking |
| F2.5 | State | **Low** | Duplicate User mapping in two server actions — **done** |
| F4.6 | Accessibility | **Low** | Login page uses `data-alt` instead of `alt` attribute — **done** |
