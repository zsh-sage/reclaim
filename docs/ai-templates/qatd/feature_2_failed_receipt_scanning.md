# Feature Request #2: Failed Receipt Scanning — Save to Draft Instead of Skip

**Category**: **🔴 HIGH PRIORITY** (Critical UX / Bug Fix) — **NEEDS VERIFICATION FIRST**

---

## ⚠️ VERIFICATION REQUIRED

Before implementation, verify the following:

1. **Backend Check**:
   - Does `/api/v1/documents/upload` return receipts that failed OCR extraction?
   - What is the exact response structure when `amount` or `currency` is missing?
   - Are failed receipts currently being filtered/removed or stored somewhere?

2. **Frontend Check**:
   - How does `/app/employee/claims/page.tsx` handle receipts with missing `amount`/`currency`?
   - Are failed receipts displayed at all?
   - Is there any existing draft/save mechanism?

3. **Database Check**:
   - Does the reimbursement/document schema support a "draft" or "pending_manual_entry" state?

---

## Current Problem (Suspected)

When an employee uploads receipts or documents in **Employee Portal → Submit Claim** (`/employee/claims`):

**Flow**:
1. Employee uploads receipt → AI/OCR processes it
2. AI extracts data (amount, currency, date, category, etc.)
3. If extraction **FAILS** (no `amount` or `currency` detected):
   - Receipt marked for **"skip"** (not included in claim)
   - ❌ NOT displayed in UI
4. Employee sees partial receipts (only successful ones)
5. ❌ Failed receipts are **lost** — employee can't retry or manually enter data
6. ❌ Poor UX: Employee has no idea what happened to their receipt

**Example Scenario**:
- Employee uploads 5 receipts
- AI successfully extracts: Receipt #1, #2, #4 (amounts, currencies OK)
- AI fails on: Receipt #3, #5 (handwritten, blurry, or unclear)
- ❌ Frontend only shows: #1, #2, #4
- ❌ Employee loses receipts #3, #5
- Employee thinks: "Where are my receipts?! 😞"

---

## Desired UX

### Step 1: Upload and OCR Processing
- Employee selects files → Upload
- AI processes receipts
- Show progress with results per receipt

### Step 2: Failed Receipt Alert
When AI fails to extract `amount` or `currency`:
```
⚠️ Receipt "Invoice_003.pdf" Failed to Scan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Unable to extract amount or currency information.

[View Details] [Manually Enter] [Discard] [Save to Draft]
```

### Step 3: Draft Save
- Employee clicks **"Save to Draft"**
- All receipts (successful + failed) are saved to draft
- Message: ✅ "Draft saved! You can continue later."
- Employee can navigate away

### Step 4: Draft Recovery (NEW)
- Employee sidebar gets new section: **"📋 Drafts"**
- Shows list: "Claim Draft - 3 receipts (2 need manual entry)"
- Click to open → Returns to claims page with:
  - All previously uploaded receipts pre-loaded
  - Failed receipts marked with ⚠️ badge
  - Option to: manually enter amount/currency, re-upload, or discard

### Step 5: Manual Entry for Failed Receipts
- Employee clicks failed receipt
- Modal opens with:
  - Receipt preview (image/PDF)
  - Input fields: Amount, Currency, Category
  - Save button
- Receipt moves to "completed" state

---

## Implementation Areas

### Backend
- `backend/api/documents.py` → `/api/v1/documents/upload` endpoint
  - Ensure response includes receipts with `extraction_status: "failed"`
  - Each failed receipt should include reason (e.g., "missing_amount", "missing_currency")
  
- `backend/core/models.py`
  - Verify `Reimbursement` model has `status: "draft"` option
  - Add `draft_data` JSONB field if needed (stores incomplete receipts)
  
- `backend/api/reimbursements.py` (NEW endpoints)
  - `POST /api/v1/reimbursements/save-draft` → Save current upload progress
  - `GET /api/v1/reimbursements/drafts` → List user drafts
  - `GET /api/v1/reimbursements/drafts/{id}` → Load specific draft
  - `DELETE /api/v1/reimbursements/drafts/{id}` → Delete draft

### Frontend
- `frontend/app/employee/claims/page.tsx`
  - Modify OCR result display to show failed receipts (not skip them)
  - Add "Save to Draft" button
  - Show receipt-by-receipt status (✅ success, ⚠️ failed, ⏳ processing)
  
- `frontend/components/Sidebar.tsx`
  - Add new section: **"📋 Drafts"** (for employee portal)
  - Show draft count badge
  - Link to `/employee/claims?draft_id=123`
  
- `frontend/app/employee/claims/_components/FailedReceiptModal.tsx` (NEW)
  - Manual entry form for failed receipts
  - Amount input, currency dropdown, category selector
  
- `frontend/lib/api/claims.ts`
  - Add functions:
    - `saveDraft(receipts, metadata)`
    - `loadDraft(draftId)`
    - `listDrafts()`
    - `deleteDraft(draftId)`

---

## Database Schema Changes (If Needed)

```sql
-- Add to reimbursement status enum
ALTER TYPE reimbursement_status ADD VALUE 'draft' BEFORE 'pending';

-- Add draft data column
ALTER TABLE reimbursements 
ADD COLUMN draft_data JSONB DEFAULT NULL,
ADD COLUMN draft_saved_at TIMESTAMP DEFAULT NULL;

-- New draft table (alternative approach)
CREATE TABLE reimbursement_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id),
    title TEXT,
    receipts JSONB NOT NULL,  -- array of receipt objects with extraction status
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);
```

---

## API Response Examples

### Before: Upload Fails
```json
{
  "status": "error",
  "message": "Some receipts could not be processed"
}
```

### After: Upload with Failed Receipts
```json
{
  "status": "partial_success",
  "message": "3 of 5 receipts processed successfully",
  "data": {
    "successful_receipts": [
      {
        "id": "receipt_001",
        "file_name": "invoice_001.pdf",
        "extracted": {
          "amount": 45.99,
          "currency": "USD",
          "date": "2026-04-28",
          "category": "meals"
        }
      }
    ],
    "failed_receipts": [
      {
        "id": "receipt_003",
        "file_name": "handwritten_receipt.jpg",
        "extraction_status": "failed",
        "failure_reason": "missing_amount",
        "message": "Could not extract amount from receipt"
      }
    ]
  },
  "draft_id": "draft_abc123"  -- auto-generated if user wants to save later
}
```

---

## User Flow Diagram

```
Employee → /employee/claims
    ↓
Select files (PDF, JPG, PNG)
    ↓
Upload + AI Processing
    ↓
┌─────────────────────────────────────┐
│ Results Screen                      │
├─────────────────────────────────────┤
│ ✅ Receipt #1: $45.99 USD          │
│ ✅ Receipt #2: $120.00 CAD         │
│ ⚠️  Receipt #3: FAILED TO SCAN     │
│ ✅ Receipt #4: $30.00 USD          │
│ ⚠️  Receipt #5: FAILED TO SCAN     │
├─────────────────────────────────────┤
│ [Manually Enter #3] [Manually Enter #5] │
│ [Save to Draft] [Submit] [Cancel]  │
└─────────────────────────────────────┘
    ↓
    ├─→ [Save to Draft]
    │    ↓
    │    ✅ "Draft saved!"
    │    Sidebar shows: 📋 Drafts (1)
    │    ↓
    │    Later...
    │    ↓
    │    Click "📋 Drafts" → Load draft
    │    ↓
    │    [Manually Enter #3] [Manually Enter #5]
    │    [Submit when ready]
    │
    ├─→ [Manually Enter #3/#5]
    │    ↓
    │    Modal: Enter Amount, Currency
    │    ↓
    │    Receipt marked as completed
    │    ↓
    │    [Submit] when all done
    │
    └─→ [Submit]
         ↓
         Create reimbursement claim
```

---

## Success Criteria

- [ ] Failed receipts are **displayed** (not hidden/skipped)
- [ ] Failed receipts show **clear error message** with reason
- [ ] Employee can **save to draft** at any time
- [ ] Drafts are **persisted** (survives page reload, browser close)
- [ ] Sidebar shows **"Drafts" section** with count
- [ ] Clicking draft **pre-loads all receipts** into claims form
- [ ] Failed receipts can be **manually entered** via modal
- [ ] Manual entry includes: Amount, Currency, Category
- [ ] Receipt transitions from "failed" → "completed" after manual entry
- [ ] No data loss: uploads are always saved (draft or submitted)

---

## Estimated Effort

- **Backend**: 1-2 days (endpoints, schema changes, draft storage)
- **Frontend**: 2-3 days (UI, draft loading, manual entry modal)
- **Testing**: 1 day (edge cases, draft recovery, manual entry validation)
- **Total**: 4-6 days

---

## Questions for User

1. Should drafts auto-save every N seconds, or only on manual "Save" click?
2. Should drafts have expiration (e.g., auto-delete after 30 days)?
3. Should employee be able to create multiple drafts, or just one active draft per claim?
4. Should draft show which receipts need manual entry before allowing submit?

---

# Feature Request #3: Draft Section in Employee Sidebar

**Category**: **🟡 MODERATE PRIORITY** (UX Feature - Tightly Coupled with Feature #2)

**Status**: **Dependent on Feature #2** — Draft infrastructure must exist first

---

## Current State

**Employee Portal Sidebar** (`frontend/components/Sidebar.tsx` or similar):
- Currently shows: Dashboard, Submit, Claims, History, Settings, Support
- ❌ NO "Drafts" section
- ❌ No indication that drafts exist or how to access them

**Problem**:
- Even if Feature #2 (draft saving) is implemented, employees won't know where to find their drafts
- No visual indicator of unsaved work
- Poor discoverability

---

## Desired Sidebar Design

### Option A: Simple Badge Indicator (Recommended)
```
📊 Dashboard
✈️  Submit
📝 Claims
📜 History
📋 Drafts            ← NEW (with count badge)
      ↳ Draft #1 (3 receipts)
      ↳ Draft #2 (2 receipts)
⚙️  Settings
💬 Support
```

### Option B: Expandable Section
```
📊 Dashboard
✈️  Submit
📝 Claims
📜 History

📋 DRAFTS (expandable section)
   ├─ Draft - Apr 28 (3 receipts, 2 need review)
   ├─ Draft - Apr 27 (2 receipts)
   └─ + New Draft

⚙️  Settings
💬 Support
```

### Option C: Floating Badge (Minimal)
```
📊 Dashboard
✈️  Submit
📝 Claims
📜 History
📋 Drafts (2)       ← NEW - shows count, clickable
⚙️  Settings
💬 Support
```

---

## Implementation Areas

### Sidebar Component Updates

**File**: `frontend/components/Sidebar.tsx` (or `frontend/app/employee/_components/Sidebar.tsx`)

**Add**:
1. **Draft count state** — fetch via API
   ```tsx
   const [draftCount, setDraftCount] = useState(0);
   
   useEffect(() => {
     fetchDraftCount().then(count => setDraftCount(count));
   }, []);
   ```

2. **New sidebar item**:
   ```tsx
   <SidebarItem
     icon={<FileText className="w-5 h-5" />}
     label="Drafts"
     badge={draftCount > 0 ? draftCount : null}
     href="/employee/claims?view=drafts"
     onClick={() => navigate("/employee/drafts")}
   />
   ```

3. **Optional: Expandable submenu** (if multiple drafts):
   ```tsx
   <SidebarSection title="Drafts" expandable={draftCount > 0}>
     {drafts.map(draft => (
       <SidebarSubitem
         key={draft.id}
         label={`Draft - ${formatDate(draft.created_at)}`}
         subtitle={`${draft.receipt_count} receipts`}
         onClick={() => loadDraft(draft.id)}
       />
     ))}
   </SidebarSection>
   ```

### Navigation Routes

**Option 1: Dedicated Draft View Route**
- Create new route: `frontend/app/employee/drafts/page.tsx`
- Lists all drafts in a card/table view
- Click draft → loads into claims page

**Option 2: Integrated into Claims Page**
- Add draft view mode to `/employee/claims/page.tsx`
- Query param: `/employee/claims?view=drafts`
- Tab switching: "New Claim" vs "My Drafts"

**Option 3: Sidebar Expansion**
- Sidebar shows draft list as expandable section
- Click any draft → auto-loads into claims page
- Minimal page navigation needed

### API Integration

**Frontend API calls needed**:
```tsx
// In frontend/lib/api/claims.ts (add these):

export async function fetchDraftCount(): Promise<number> {
  // GET /api/v1/reimbursements/drafts/count
}

export async function listDrafts(): Promise<DraftSummary[]> {
  // GET /api/v1/reimbursements/drafts
  // Returns: [{ id, created_at, receipt_count, status }]
}

export async function loadDraft(draftId: string): Promise<Draft> {
  // GET /api/v1/reimbursements/drafts/{id}
  // Returns full draft with all receipts and metadata
}
```

**Backend API endpoints** (if not already in Feature #2):
- `GET /api/v1/reimbursements/drafts/count` → returns: `{ count: 3 }`
- `GET /api/v1/reimbursements/drafts` → returns: `[{ id, created_at, receipt_count, ... }]`
- `GET /api/v1/reimbursements/drafts/{id}` → returns full draft object

---

## Visual Design Specifications

### Draft Badge

**When draft count > 0**:
```
┌──────────────────┐
│ 📋 Drafts    [3] │  ← Red or accent color badge
│                  │
└──────────────────┘
```

**When hovering**:
```
"You have 3 unsaved claims. Click to view."
```

### Draft List View (Optional)

```
┌─────────────────────────────────────────────────┐
│ My Drafts                                       │
├─────────────────────────────────────────────────┤
│ □ Draft - April 28, 2026                       │
│   3 receipts • 2 need review                   │
│   Last edited: 2 hours ago                     │
│   [Resume] [Delete]                            │
├─────────────────────────────────────────────────┤
│ □ Draft - April 27, 2026                       │
│   2 receipts • All ready                       │
│   Last edited: 1 day ago                       │
│   [Resume] [Delete]                            │
└─────────────────────────────────────────────────┘
```

### Draft Loading State

When clicking a draft from sidebar:
```
⏳ Loading draft...
   [Skeleton loader for receipts]
   [Skeleton loader for form]
```

---

## User Experience Flow

### Accessing Drafts

```
Employee Portal
    ↓
Sidebar: "📋 Drafts (3)"
    ↓
Click Drafts
    ↓
┌─────────────────────────────────────────┐
│ My Draft Claims (3)                     │
├─────────────────────────────────────────┤
│ Draft #1: 3 receipts, 2 need review    │
│ Draft #2: 1 receipt, ready to submit   │
│ Draft #3: 5 receipts (auto-saved)      │
└─────────────────────────────────────────┘
    ↓
Click "Draft #1"
    ↓
/employee/claims?draft_id=xyz
    ↓
Claims form pre-loads:
  - All 3 receipts from draft
  - 2 marked as "⚠️ needs manual entry"
  - Can manually fill in missing data
  - [Continue] [Save Draft Again] [Submit]
```

---

## Success Criteria

- [ ] Sidebar shows "📋 Drafts" link or badge
- [ ] Draft count badge updates in real-time
- [ ] Clicking "Drafts" navigates to draft view or list
- [ ] Draft list shows all user's drafts with metadata
- [ ] Clicking a draft loads it into claims form
- [ ] All receipts (successful + failed) display when draft loads
- [ ] Failed receipts are marked with ⚠️ badge
- [ ] User can continue editing or re-save draft
- [ ] User can delete draft from list
- [ ] Sidebar updates when new draft is created

---

## Estimated Effort

- **Frontend**: 1-2 days (sidebar component, draft view page, styling)
- **Backend**: Already covered in Feature #2
- **Testing**: 0.5 days (navigation, state management)
- **Total**: 1.5-2.5 days (after Feature #2 backend is ready)

---

## Implementation Sequence

**Phase 1** (Feature #2):
1. ✅ Create backend draft endpoints (`save-draft`, `list`, `get`, `delete`)
2. ✅ Modify `/api/v1/documents/upload` to return failed receipts
3. ✅ Add draft storage (DB schema changes)

**Phase 2** (Feature #3 - This):
1. ✅ Add sidebar "Drafts" link/badge
2. ✅ Create draft list view page (or integrate into claims)
3. ✅ Add draft loading/resume functionality
4. ✅ Update claims form to pre-populate from draft
5. ✅ Add real-time badge count update

---

## Design Notes

- **Icon Suggestion**: Use 📋 (clipboard) or 📄 (document) for drafts
- **Color**: Use accent color for badge (red, orange, or blue)
- **Position in Sidebar**: After "History", before "Settings"
- **Animation**: Subtle slide-in when draft list expands
- **Accessibility**: 
  - Badge should have aria-label: "You have 3 draft claims"
  - Draft items should be keyboard navigable
  - Focus states clearly visible

---

## Combined Frontend Implementation Summary

### Files to Create/Modify

1. **Sidebar Component**:
   - `frontend/components/Sidebar.tsx` (or employee-specific version)
   - Add drafts section with badge/count

2. **New Components** (Feature #3):
   - `frontend/app/employee/drafts/page.tsx` — Draft list/management
   - `frontend/app/employee/drafts/_components/DraftList.tsx` — Draft cards
   - `frontend/app/employee/drafts/_components/DraftHeader.tsx` — Stats header

3. **Updated Components** (Feature #2 + #3):
   - `frontend/app/employee/claims/page.tsx` — Add draft loading
   - `frontend/app/employee/claims/_components/FailedReceiptModal.tsx` — Manual entry
   - `frontend/app/employee/claims/_components/OCRResultsDisplay.tsx` — Show failed receipts

4. **API Module**:
   - `frontend/lib/api/claims.ts` — Add draft functions

5. **Types** (if needed):
   - `frontend/lib/types/draft.ts` — TypeScript interfaces for drafts
