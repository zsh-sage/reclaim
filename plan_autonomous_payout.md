# Autonomous Multi-Policy Reimbursement Workflow

## Context

Currently, every AI judgment (APPROVE, REJECT, PARTIAL) routes to REVIEW status, requiring HR to manually confirm before any action occurs. This defeats the purpose of having an AI agent for speed.

**The revision removes HR from the loop for clear-cut cases:**
- High-confidence approvals get auto-paid via Xendit
- Clear rejections get auto-dismissed
- Only ambiguous/flagged cases land on HR's desk

---

## Decision Matrix

| Judgment | Confidence | Human-Edited | Result Status | Payout Action |
|----------|-----------|--------------|---------------|---------------|
| APPROVED | > 0.7 | No | APPROVED | Auto-trigger Xendit (if banking details exist) |
| APPROVED | ≤ 0.7 | Any | REVIEW | None — HR Required Attention |
| APPROVED | Any | Yes | REVIEW | None — HR Required Attention |
| REJECTED | Any | Any | REJECTED | None — auto-dismissed |
| PARTIAL | Any | Any | REVIEW | None — HR Required Attention |
| NEEDS_INFO | Any | Any | REVIEW | None — HR Required Attention |

**Key insight:** `reviewed_by IS NULL` on a resolved claim (APPROVED/REJECTED) means it was auto-processed, not HR-reviewed. This is the discriminator everywhere.

---

## HR Dashboard Display Logic

| Status | reviewed_by | Age | Location |
|--------|-----------|-----|----------|
| REVIEW | null | Any | Required Attention |
| APPROVED / DISBURSING / PAID | null | ≤ 24h | Passed AI Review |
| REJECTED | null | ≤ 24h | Flagged AI Review |
| Any (HR-reviewed) | not null | Any | History (combined) |
| Any (auto-processed) | null | > 24h | History (combined) |

All three dashboard tabs sorted by `created_at DESC` (most recent first).

---

## Critical Files

- `backend/engine/agents/compliance_agent.py` — save_reimbursement node (lines ~462–566)
- `backend/api/reimbursements.py` — analyze background task (lines ~371–578)
- `backend/api/payouts.py` — payout creation logic to extract into service
- `backend/engine/services/payout_service.py` — **NEW** shared service
- `frontend/lib/actions/hr.ts` — getHRClaims() return shape
- `frontend/app/hr/dashboard/page.tsx` — tabs, KPI cards
- `frontend/app/hr/history/page.tsx` — combined history filter

---

## Implementation Steps

### Step 1: Extract Shared Payout Service

**New file:** `backend/engine/services/payout_service.py`

Extract Xendit trigger logic from `payouts.py` (route handler lines 84–192) into:

```python
async def initiate_payout(reim_id: UUID, db: AsyncSession) -> Payout | None
```

- Validates: reim `status=APPROVED`, employee has banking details
- If no banking details → returns `None` (skip silently, claim stays APPROVED)
- Sets `status=DISBURSING`, calls `_xendit.create_payout()`, saves Payout record, schedules mock webhook

Refactor `POST /payouts/` route in `payouts.py` to call this service function (no behavior change).

---

### Step 2: Compliance Agent Auto-Status Logic

**File:** `backend/engine/agents/compliance_agent.py` — save_reimbursement node

Replace the `is_auto_reimburse_enabled` block with:

```python
has_human_edits = any(
    r.get("_human_edit", {}).get("has_changes") for r in receipts
)
if judgment_enum == JudgmentResult.APPROVED and (confidence or 0) > 0.7 and not has_human_edits:
    status = ReimbursementStatus.APPROVED   # auto — payout triggered in API layer
    reimbursement.reviewed_at = datetime.now(UTC)
    # reviewed_by stays NULL intentionally
elif judgment_enum == JudgmentResult.REJECTED:
    status = ReimbursementStatus.REJECTED   # auto-dismiss
    reimbursement.reviewed_at = datetime.now(UTC)
    # reviewed_by stays NULL intentionally
else:
    status = ReimbursementStatus.REVIEW     # HR Required Attention
```

Keep `is_auto_reimburse_enabled` as a kill switch: wrap the auto-approval block with `if settings.AUTO_REIMBURSE_ENABLED:` (default True). Add this to `core/config.py`.

---

### Step 3: Analyze Endpoint — Trigger Payouts + Send Notifications

**File:** `backend/api/reimbursements.py` — inside the SSE background task, after all compliance pipelines complete and reimbursements are saved:

```python
for reim in newly_saved_reimbursements:
    if reim.status == ReimbursementStatus.APPROVED and reim.reviewed_by is None:
        # Auto-approve: trigger payout (no-op if missing banking details)
        await initiate_payout(reim.reim_id, db)
        # Notify employee
        await create_notification(reim.user_id, "success",
            "Your claim was automatically approved. Payment is being processed.")
    elif reim.status == ReimbursementStatus.REJECTED and reim.reviewed_by is None:
        # Auto-reject: notify employee
        await create_notification(reim.user_id, "error",
            f"Your claim was automatically rejected. Reason: {reim.summary}")
```

Use the existing notifications module pattern (same as HR-approval notification at lines 296–318).

---

### Step 4: Frontend Types

**File:** `frontend/lib/api/types.ts`

- Add `"Auto-Approved" | "Auto-Rejected"` to AiStatus type union (or reuse existing values — map `reviewed_by: null` + APPROVED/REJECTED in the action layer instead)
- Ensure ReimbursementRaw exposes `reviewed_by: string | null` (it already does per exploration)
- No other type changes needed

---

### Step 5: HR Server Action — Three Buckets

**File:** `frontend/lib/actions/hr.ts` — update getHRClaims():

Change return type to `{ attention: Claim[], passed: Claim[], flagged: Claim[] }`.

```typescript
const now = new Date();
const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

attention: reims
  .filter(r => r.status === "REVIEW")
  .sort(byCreatedAtDesc)

passed: reims
  .filter(r =>
    ["APPROVED", "DISBURSING", "PAID"].includes(r.status) &&
    r.reviewed_by == null &&
    new Date(r.created_at) >= cutoff
  )
  .sort(byCreatedAtDesc)

flagged: reims
  .filter(r =>
    r.status === "REJECTED" &&
    r.reviewed_by == null &&
    new Date(r.created_at) >= cutoff
  )
  .sort(byCreatedAtDesc)
```

---

### Step 6: HR Dashboard — Three Tabs + Auto-Solve Rate

**File:** `frontend/app/hr/dashboard/page.tsx`

**Three tabs:** "Required Attention", "Passed AI Review", "Flagged AI Review"

- **Required Attention:** attention bucket — action = "Review" (existing review page)
- **Passed AI Review:** passed bucket — action = "View" (read-only, payout already auto-triggered)
- **Flagged AI Review:** flagged bucket — action = "View" (read-only, already dismissed)

Replace "Auto-Approval Rate" KPI with "Auto-Solve Rate":

```typescript
const autoSolved = reims.filter(r =>
  r.reviewed_by == null &&
  ["APPROVED", "DISBURSING", "PAID", "REJECTED"].includes(r.status)
).length;
const autoSolveRate = total > 0 ? (autoSolved / total) * 100 : 0;
```

- **"Pending Manual Reviews" KPI:** count = `attention.length` (unchanged concept, updated source)
- Ensure all three tab tables sort most-recent first (already done via sort in Step 5)

---

### Step 7: HR History — Combined 24h+ Filter

**File:** `frontend/app/hr/history/page.tsx`

Currently shows APPROVED/PAID/REJECTED claims. Adjust filter to:

- Include all auto-processed older than 24h (`reviewed_by=null`, `created_at < cutoff`)
- Include all HR-reviewed (`reviewed_by != null`, any age)
- Exclude anything still in REVIEW (those live in Required Attention)

If the history page already fetches all resolved statuses and the 24h cutoff isn't applied, add a client-side filter to exclude claims that would appear in the "Passed AI Review" / "Flagged AI Review" tabs (i.e., auto-processed within 24h).

---

## Xendit Failure Handling

If auto-payout Xendit call throws:

- Log the error
- Leave reimbursement status as APPROVED (not DISBURSEMENT_FAILED)
- The claim will appear in "Passed AI Review" with no payout attached
- HR can see the missing payout and manually trigger it via the existing "Send Payout" button on the review/view page

---

## Verification Checklist

- [ ] Submit a claim with receipts that should clearly pass → AI produces APPROVED + high confidence → DB: status=APPROVED, reviewed_by=null, reviewed_at set → Payout record created → employee gets notification
- [ ] Submit a claim that should be rejected → DB: status=REJECTED, reviewed_by=null → employee gets rejection notification
- [ ] Submit an ambiguous claim (edited fields, partial category) → DB: status=REVIEW → appears in Required Attention tab
- [ ] Wait/mock 24h+ → previously auto-processed claims disappear from dashboard tabs, appear in history
- [ ] HR dashboard: verify "Auto-Solve Rate" = (auto-approved + auto-rejected) / total is correct
- [ ] HR dashboard: verify all three tabs sorted by most recent first
- [ ] Check kill switch: set `AUTO_REIMBURSE_ENABLED=false` → all claims revert to REVIEW behavior
