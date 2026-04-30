# Frontend Analysis: TC007 & TC004 Critical Bugs

## Overview
TestSprite identified 2 critical bugs affecting RBAC security and employee experience. This document provides detailed code-level analysis.

---

## 🔴 BUG #1: TC007 — RBAC BYPASS (Employee can view HR Dashboard)

### What TestSprite Found
- **Test**: Employee logs in → navigates directly to `/hr/dashboard`
- **Result**: ❌ HR dashboard RENDERS (KPI cards, "Auto-Approval Rate 84.2%")
- **Expected**: 403 Forbidden or redirect to employee dashboard
- **Severity**: 🚨 SECURITY & DATA CONFIDENTIALITY FAILURE

### Root Cause in Your Code

**File**: `frontend/app/hr/layout.tsx` (Lines 1-46)

```tsx
// ❌ CURRENT CODE - NO ROLE GUARD
export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <SideNav />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <TopNav />
        <main id="main-content" className="flex-1 overflow-y-auto bg-surface">
          {children}  {/* ← NO role check! ANY user can render this */}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
```

### Why It's Broken

1. **AuthContext redirects WORK on login** (Lines 64-69 in `AuthContext.tsx`):
   ```tsx
   if (result.user?.role === "HR") {
     router.push("/hr/dashboard");
   } else {
     router.push("/employee/dashboard");
   }
   ```
   ✅ HR user logs in → `/hr/dashboard`  
   ✅ Employee logs in → `/employee/dashboard`

2. **BUT this only protects INITIAL LOGIN**
   - If employee is already logged in
   - And manually types: `http://localhost:3000/hr/dashboard`
   - **Nothing stops them** ← Layout has no role check

3. **The layout renders for ANYONE**:
   - No role validation
   - No middleware protection
   - No redirect check
   - Just renders `{children}` blindly

### What "RBAC Bypass" Means

**RBAC** = Role-Based Access Control

Employee CAN ACCESS:
- ✗ All reimbursement claims from **ALL staff** (not just their own)
- ✗ HR KPI dashboard (auto-approval rates, statistics)
- ✗ HR review pages (`/hr/review/*`)
- ✗ HR decision-making interface
- ✗ **Data leak**: Employees see sensitive company & peer financial data

### Affected Routes
- `/hr/dashboard` (should require HR role)
- `/hr/review/*` (should require HR role)
- `/hr/view/*` (should require HR role)

---

## 🔴 BUG #2: TC004 — Employee Claim Detail Page Broken

### What TestSprite Found
- **Test**: Employee clicks on claim card in dashboard
- **Result**: ❌ NO navigation happens (page stays in place)
- **Expected**: Navigate to `/employee/claims/[id]` and display audit trail
- **Impact**: Employees cannot see audit trail of their own claims

### Root Cause #1: Wrong Navigation Target

**File**: `frontend/app/employee/dashboard/_components/RecentClaimsTable.tsx`

#### Desktop Version (Lines 94-124)
```tsx
{claims.map((claim) => (
  <tr
    key={claim.id}
    onClick={() => router.push("/employee/history")}  {/* ❌ WRONG PATH */}
    className="border-t border-outline-variant/5 hover:bg-surface-container-highest/40 transition-colors cursor-pointer group"
  >
    <td className="p-4 font-medium text-on-surface">{claim.id}</td>
    {/* ... other cells ... */}
  </tr>
))}
```

#### Mobile Version (Lines 131-165)
```tsx
{claims.map((claim) => (
  <div
    key={claim.id}
    onClick={() => router.push("/employee/history")}  {/* ❌ WRONG PATH */}
    className="bg-surface-container-lowest p-4 rounded-xl..."
  >
    {/* ... claim content ... */}
  </div>
))}
```

### Root Cause #2: Detail Page Doesn't Exist

**File**: `frontend/app/employee/claims/page.tsx` (44.8 KB)

- This file is the **RECEIPT UPLOAD form** page
- NOT a detail/history page
- NO `/employee/claims/[id]` dynamic route exists for viewing claim details

### What Actually Exists

✅ `app/employee/history/page.tsx` — General claims history/list
✅ `app/employee/history/_components/ClaimSidebar.tsx` — Detail sidebar exists

❌ No specific route to pre-select & display a clicked claim
❌ Clicking a claim doesn't populate the sidebar automatically

### Why It Breaks the Value Proposition

- ✗ Employee cannot view audit trail of their own claim
- ✗ Breaks transparency & user trust
- ✗ Takes employee to generic history page instead of specific claim detail
- ✗ Clicking a claim card does nothing — poor UX

---

## 📊 Summary Table

| Test ID | Issue | Status | Root Cause | File |
|---------|-------|--------|-----------|------|
| **TC007** | RBAC Bypass: Employee → HR Dashboard | FAILED | No role guard in layout | `app/hr/layout.tsx` |
| **TC004** | Claim detail navigation broken | FAILED | Routes to `/employee/history` instead of `/employee/claims/[id]` | `app/employee/dashboard/_components/RecentClaimsTable.tsx` |

---

## 🔐 Security Impact

**TC007 (RBAC Bypass)**: 🔴 **CRITICAL**
- Employees can access HR-only data
- Confidentiality breach
- Compliance/audit risk

**TC004 (Detail Page)**: 🟠 **HIGH**
- Undermines transparency promise
- Employee cannot verify claim status
- User trust issue

---

## 🟡 HIGH-PRIORITY GAPS

### Gap #3: WF2 (Receipt Upload) — Navigation & File Type Issues

**Status**: ⚠️ **PARTIALLY IMPLEMENTED — Navigation broken + File type validation missing**

**Clarification**:
- TestSprite reported: "WF2 receipt upload frontend not implemented"
- **Actually**: WF2 UI IS fully implemented at `/employee/claims/page.tsx`
- **The problems**: 
  1. ❌ Employee cannot navigate TO it (routing issue)
  2. ❌ File type validation is not enforced (UI accepts wrong file types)

---

## WF2 Problem #1: Navigation Routing Issue

**What's Actually There**:

File: `app/employee/claims/page.tsx` (44.8 KB - FULL IMPLEMENTATION)
- ✅ Receipt file upload input
- ✅ Document preview viewer (images + PDF support)
- ✅ Zoom controls for image preview
- ✅ File list with rename/delete functionality
- ✅ OCR processing screen with animated status
- ✅ Verification screen for review
- ✅ Success modal after submission
- ✅ Integration with `uploadDocuments()` server action
- ✅ SSE subscription for progress tracking

**Current Navigation Problem**:
1. `/employee/submit/page.tsx` is just a placeholder welcome card with logout button
2. Employees login → directed to `/employee/submit`
3. They only see welcome message, no way to upload receipts
4. The actual WF2 form is "hidden" at `/employee/claims` (not linked)
5. Employees don't know about it

**Navigation Flow (Current - Broken)**:
```
Employee login → /employee/submit (placeholder) → DEAD END ❌
                                      ↓
                      No link to /employee/claims
```

**Navigation Flow (Fixed - Should Be)**:
```
Employee login → /employee/submit → [Start New Claim] button
                                      ↓
                         /employee/claims (upload form) ✅
                                      ↓
                      Upload receipts → OCR → Verify → Submit
```

### How to Fix WF2 Navigation

**Implementation Option A: Add Navigation Button (RECOMMENDED)**

**File**: `frontend/app/employee/submit/page.tsx`
```tsx
// CURRENT (broken):
export default function SubmitPage() {
  return (
    <div>
      <h1>Welcome to Reclaim</h1>
      <p>Your expense reimbursement portal</p>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
}

// FIXED:
export default function SubmitPage() {
  const router = useRouter();
  
  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Welcome to Reclaim</h1>
        <p className="text-gray-600">Submit your expense reimbursement claims</p>
      </div>
      
      <button 
        onClick={() => router.push("/employee/claims")}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        📄 Start New Claim
      </button>
      
      <button onClick={() => logout()} className="text-sm text-gray-600">
        Logout
      </button>
    </div>
  );
}
```

**Implementation Option B: Redirect Directly**

**File**: `frontend/app/employee/submit/page.tsx`
```tsx
// Simple redirect approach:
import { redirect } from 'next/navigation';

export default function SubmitPage() {
  redirect("/employee/claims");
}
```

**Implementation Option C: Embed Upload Form**

**File**: `frontend/app/employee/submit/page.tsx`
```tsx
// Re-use the claims form component on submit page
import ClaimsForm from "@/app/employee/claims/_components/ClaimsForm";

export default function SubmitPage() {
  return <ClaimsForm />;
}
```

**Decision Points**:
- Option A: Keep `/employee/submit` as landing page, add button to navigate to claims
- Option B: Remove `/employee/submit` redirect entirely, save route
- Option C: Consolidate into one page (simplest UX)

**Update Sidebar Navigation** (if needed):
- Make sure "Submit" or "New Claim" in sidebar points to `/employee/claims` OR `/employee/submit`
- Ensure user flow is clear

---

## WF2 Problem #2: Receipt File Type Validation (SAME AS VALIDATION ISSUE #1)

**See**: [VALIDATION ISSUE #1: File Type Validation Not Enforced](#validation-issue-1-file-type-validation-not-enforced-bugsecurity--ux) above

**Correct file types for receipts**:
- ✅ Accept: `.jpg`, `.jpeg`, `.png`, `.webp`, `.pdf`
- ❌ Reject: `.doc`, `.docx`, `.txt`, and any other types
- 🔔 Show toast notification if user tries unsupported type

**Backend Status**: ✅ READY
- `/api/v1/documents/upload` endpoint exists
- OCR + LangGraph chain implemented
- Estimated latency: 3–8 seconds
- Already enforces correct file types

**Impact**:
- 🟠 **High**: WF2 is built but unreachable by employees due to navigation
- 🔴 **High**: File type validation allows wrong files (backend rejects, bad UX)

**Fixes Required**:
1. ✅ Add navigation button/redirect from `/employee/submit` to `/employee/claims`
2. ✅ Update file input `accept` attribute to `.jpg,.jpeg,.png,.webp,.pdf` ONLY
3. ✅ Add toast notification for invalid file types

**Status**: ⚠️ **IMPLEMENTED but ROUTING ISSUE — TestSprite Miscommunication**

**Clarification**:
- TestSprite reported: "WF2 receipt upload frontend not implemented"
- **Actually**: WF2 IS fully implemented at `/employee/claims/page.tsx`
- **The issue**: Employee cannot navigate TO it properly
- **Root cause**: `/employee/submit` is a placeholder, should link to `/employee/claims`

**What's Actually There**:

File: `app/employee/claims/page.tsx` (44.8 KB - FULL IMPLEMENTATION)
- ✅ Receipt file upload input
- ✅ Document preview viewer (images + PDF support)
- ✅ Zoom controls for image preview
- ✅ File list with rename/delete functionality
- ✅ OCR processing screen with animated status
- ✅ Verification screen for review
- ✅ Success modal after submission
- ✅ Integration with `uploadDocuments()` server action
- ✅ SSE subscription for progress tracking
- ✅ Accepts: `.pdf, .jpg, .jpeg, .png`

**Current Problem**:
1. `/employee/submit/page.tsx` is just a placeholder welcome card with logout button
2. Employees login → directed to `/employee/submit`
3. They only see welcome message, no way to upload receipts
4. The actual WF2 form is "hidden" at `/employee/claims` (not linked)
5. Employees don't know about it

**Navigation Flow (Current - Broken)**:
```
Employee login → /employee/submit (placeholder) → DEAD END ❌
                                   ↓
                   No link to /employee/claims
```

**Navigation Flow (Should Be)**:
```
Employee login → /employee/submit → Link to /employee/claims (upload form) ✅
                                   ↓
                         Full receipt upload workflow
```

**What Needs to Change**:
- Update `/employee/submit` placeholder to either:
  - Add a "Start New Claim" button → router.push("/employee/claims")
  - Or just redirect to `/employee/claims` directly
  - Or embed the claims form on this page

**Backend Status**: ✅ READY
- `/api/v1/documents/upload` endpoint exists
- OCR + LangGraph chain implemented
- Estimated latency: 3–8 seconds

**Impact**:
- 🟠 **High**: WF2 is built but unreachable by employees
- Employees can't submit receipts even though the UI is there
- Navigation/UX issue, not implementation issue

**Recommendation**:
- Add navigation link from `/employee/submit` to `/employee/claims`
- Update `submit` page button text to something like "Submit Reimbursement Claim"
- Or consider if these should be combined into one flow

---

### Gap #4: HR History Page Locked Behind MVP Restriction

**Status**: 🚫 **BLOCKED — Feature Restricted Banner — DO NOT EXECUTE FIRST**

**⚠️ EXECUTION NOTE**: This should be fixed **AFTER** all high-priority fixes are completed. It is a lower priority feature.

**What TestSprite Found** (Test TC012):
- File: `app/hr/history/page.tsx`
- Current page displays a **"FEATURE RESTRICTED - MVP PRODUCTION"** banner
- NO search input
- NO claim list rendering
- NO export controls
- Only shows a "Back to Dashboard" button

**Blocked Test**: TC012 · HR can search history and open a past claim
- Test could not run due to feature restriction banner
- Dependent test TC017 also blocked

**Recommendation** (Execute after high-priority fixes):
- ✅ NOTED FOR LATER: Remove MVP restriction banner to unlock history page
- Will need to implement search, filter, and claim list display
- Export functionality may also need implementation

---

## 🔴 BUG FIX: File Upload Validation (WF1 + Validation Issues #1 & #2)

**Status**: 🔴 **FAILED — File Type & Size Validation Not Enforced on Frontend**

**Tests Affected**: TC003 (WF1 Policy upload), TC002 (WF2 Receipt upload)

**Problem**: Backend enforces correct file types/sizes, but frontend accepts anything. Users upload wrong files, frontend accepts, backend rejects → poor UX.

### Files to Fix

**1. Receipt Upload** - `frontend/app/employee/claims/page.tsx`
```tsx
// Accept types: .jpg, .jpeg, .png, .webp, .pdf (10MB max)
<input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={handleFileSelect} />

// UI text:
<p>Supports JPG, PNG, WebP, PDF • Max 10 MB</p>
```

**2. Policy Upload** - `frontend/app/hr/policy/page.tsx`
```tsx
// Accept types: .pdf only (10MB max)
<input type="file" accept=".pdf" onChange={handleFileSelect} />

// UI text:
<p>Supports PDF • Max 10 MB</p>
```

### Validation Function (use in both files)

```tsx
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const handleFileSelect = (file: File, type: 'policy' | 'receipt') => {
  const config = {
    policy: { types: ['application/pdf'], display: 'PDF' },
    receipt: { types: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], display: 'JPG, PNG, WebP, PDF' }
  };
  
  const cfg = config[type];
  
  // Check file type
  if (!cfg.types.includes(file.type)) {
    toast.error(`❌ Invalid file type. ${type === 'policy' ? 'Policy must be PDF only.' : `Receipt must be ${cfg.display}.`}`);
    return;
  }
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    toast.error(`❌ File too large. Maximum 10MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    return;
  }
  
  // Valid - process file
  uploadFile(file);
};
```

### Success Criteria
- [ ] Receipt input accepts `.jpg,.jpeg,.png,.webp,.pdf` only
- [ ] Policy input accepts `.pdf` only
- [ ] UI text matches accepted types
- [ ] Invalid file type shows toast: "❌ Invalid file type..."
- [ ] File >10MB shows toast: "❌ File too large. Maximum 10MB..."
- [ ] TC003 (WF1 policy upload) passes
- [ ] TC002 (WF2 receipt upload) passes

## 🟡 FEATURE REQUEST #1: Lazy Loading with Skeleton Components on Page Navigation

**Category**: **MODERATE PRIORITY** (UX Enhancement)

**What's Needed**:
When users navigate between pages (e.g., from employee dashboard to claims page, or from HR dashboard to review page), add skeleton/placeholder loading components to make the transition feel smooth and professional.

**Current Experience**:
- User clicks navigation link
- Page briefly goes blank
- Content suddenly appears (jarring transition)

**Desired Experience**:
- User clicks navigation link
- Skeleton loaders appear immediately (mimics page structure)
- Real content gradually fades in and replaces skeleton
- Feels polished and responsive

**Implementation Areas**:
- `/app/employee/*` pages (dashboard, claims, history, settings, support)
- `/app/hr/*` pages (dashboard, review, policy, history, view, settings, support)

**Suggested Approach**:
1. Create reusable skeleton component (`components/SkeletonLoader.tsx`)
2. Add loading state to layout transitions (Next.js `useTransition()` hook)
3. Show skeleton on navigation start, hide when content loads
4. Apply to all major page transitions

**Estimated Effort**: Medium (1-2 days)

---

## Next Steps

### Critical (RBAC Security)
1. **Fix TC007**: Add role guard to `app/hr/layout.tsx`

### High Priority (Employee Experience)
2. **Fix TC004**: 
   - Either: Create `/employee/claims/[id]` detail route
   - Or: Update `RecentClaimsTable` to navigate to `/employee/history` with claim ID parameter

3. **Fix WF2 Navigation**: Update `/employee/submit` to link to `/employee/claims`
   - Add button "Start New Claim" → `/employee/claims`
   - OR redirect `/employee/submit` to `/employee/claims`
   - OR combine both into single flow

### Medium Priority (UX)
4. **Fix WF1 File Input**: Update file accept attribute to `.pdf` only in `app/hr/policy`

### Medium Priority (Future)
5. **Unlock HR History**: Remove MVP restriction from `app/hr/history` **(user to fix later)**
