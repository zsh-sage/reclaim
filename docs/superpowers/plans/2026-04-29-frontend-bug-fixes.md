# Frontend Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 critical/high-priority frontend bugs: RBAC bypass (TC007), broken claim navigation (TC004), dead-end submit page (WF2), and lax file-type validation (WF1+WF2).

**Architecture:** Client-side `HRRoleGuard` wraps the entire HR layout shell; history page reads a `?claimId=` URL param to pre-open the sidebar; submit page gains a "Start New Claim" CTA; file inputs add inline MIME-type validation with user-visible error messages.

**Tech Stack:** Next.js 16 App Router, TypeScript, React 19, Tailwind CSS 4. No new dependencies.

---

## File Map

| Action | File |
|--------|------|
| **Create** | `frontend/app/hr/hr_components/HRRoleGuard.tsx` |
| **Modify** | `frontend/app/hr/layout.tsx` |
| **Modify** | `frontend/app/employee/dashboard/_components/RecentClaimsTable.tsx` |
| **Modify** | `frontend/app/employee/history/page.tsx` |
| **Modify** | `frontend/app/employee/submit/page.tsx` |
| **Modify** | `frontend/app/employee/claims/page.tsx` |
| **Modify** | `frontend/app/hr/policy/page.tsx` |

---

## Task 1: TC007 — HR RBAC Guard

**Files:**
- Create: `frontend/app/hr/hr_components/HRRoleGuard.tsx`
- Modify: `frontend/app/hr/layout.tsx`

- [ ] **Step 1: Create `HRRoleGuard` client component**

```tsx
// frontend/app/hr/hr_components/HRRoleGuard.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HRRoleGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role !== "HR") {
      router.replace("/employee/dashboard");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== "HR") return null;

  return <>{children}</>;
}
```

- [ ] **Step 2: Wrap the entire HR layout in `HRRoleGuard`**

Replace `frontend/app/hr/layout.tsx` with:

```tsx
import SideNav   from "./hr_components/SideNav";
import TopNav    from "./hr_components/TopNav";
import BottomNav from "./hr_components/BottomNav";
import HRRoleGuard from "./hr_components/HRRoleGuard";

export default function HRLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <HRRoleGuard>
      <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
        <SideNav />
        <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
          <TopNav />
          <main
            id="main-content"
            className="flex-1 overflow-y-auto bg-surface"
          >
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </HRRoleGuard>
  );
}
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd frontend && npm run lint`

Expected: No errors in `app/hr/layout.tsx` or `app/hr/hr_components/HRRoleGuard.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/hr/hr_components/HRRoleGuard.tsx frontend/app/hr/layout.tsx
git commit -m "fix(rbac): add HR role guard to prevent employee access to /hr/* routes"
```

---

## Task 2: TC004 — Fix Claim Navigation from Dashboard

**Files:**
- Modify: `frontend/app/employee/dashboard/_components/RecentClaimsTable.tsx`
- Modify: `frontend/app/employee/history/page.tsx`

### Step A: Update RecentClaimsTable navigation

- [ ] **Step 1: Pass `claim.id` as URL param when navigating to history**

In `frontend/app/employee/dashboard/_components/RecentClaimsTable.tsx`, change both `onClick` handlers (desktop row at line 97, mobile card at line 135) from:

```tsx
onClick={() => router.push("/employee/history")}
```

to:

```tsx
onClick={() => router.push(`/employee/history?claimId=${claim.id}`)}
```

There are two occurrences — one inside `<tr>` (desktop) and one inside `<div>` (mobile card). Change both.

### Step B: Auto-select claim in HistoryPage from URL param

- [ ] **Step 2: Add `useSearchParams` and auto-select logic to `HistoryPage`**

In `frontend/app/employee/history/page.tsx`:

1. Add imports at the top (after existing imports):
```tsx
import { useSearchParams } from "next/navigation";
```

2. Inside `HistoryPage`, after the existing `useState` declarations, add:
```tsx
const searchParams = useSearchParams();
```

3. Add a new `useEffect` after the existing `useEffect` that fetches claims (the one with `getRawReimbursements`):
```tsx
useEffect(() => {
  const claimId = searchParams.get("claimId");
  if (!claimId || claims.length === 0) return;
  const match = claims.find((c) => c.id === claimId);
  if (match) handleSelectClaim(match);
}, [claims, searchParams]);
```

Note: `handleSelectClaim` is already defined in this file and fetches full claim detail before setting `selectedClaim`.

- [ ] **Step 3: Verify TypeScript**

Run: `cd frontend && npm run lint`

Expected: No errors in the two modified files.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/employee/dashboard/_components/RecentClaimsTable.tsx frontend/app/employee/history/page.tsx
git commit -m "fix(navigation): claim card navigates to history page with sidebar pre-opened (TC004)"
```

---

## Task 3: WF2 — Fix Submit Page Dead End

**Files:**
- Modify: `frontend/app/employee/submit/page.tsx`

- [ ] **Step 1: Replace placeholder with a functional landing page**

Replace the entire content of `frontend/app/employee/submit/page.tsx` with:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function EmployeeSubmit() {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface p-6">
      <div className="glass-card rounded-[2rem] p-10 shadow-ambient-lg border border-white/40 max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <span className="material-symbols-outlined text-tertiary text-5xl">
            receipt_long
          </span>
        </div>
        <h1 className="font-headline text-3xl font-bold text-tertiary mb-2">Employee Portal</h1>
        <p className="text-on-surface-variant mb-8">Welcome back, {user?.name || "Employee"}!</p>

        <button
          onClick={() => router.push("/employee/claims")}
          className="w-full py-3 px-6 bg-tertiary text-on-tertiary rounded-xl font-semibold hover:bg-tertiary/90 transition-all shadow-sm mb-3"
        >
          Start New Claim
        </button>

        <button
          onClick={() => router.push("/employee/dashboard")}
          className="w-full py-3 px-6 bg-surface-container text-on-surface rounded-xl font-semibold hover:bg-surface-container-highest/80 transition-all shadow-sm mb-3"
        >
          Go to Dashboard
        </button>

        <button
          onClick={logout}
          className="w-full py-3 px-6 bg-surface-container-highest text-on-surface rounded-xl font-semibold hover:bg-surface-container-highest/80 transition-all shadow-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `cd frontend && npm run lint`

Expected: No errors in `app/employee/submit/page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/employee/submit/page.tsx
git commit -m "fix(ux): add 'Start New Claim' and 'Go to Dashboard' buttons to submit landing page (WF2)"
```

---

## Task 4: File Type Validation — Employee Claims Page

**Files:**
- Modify: `frontend/app/employee/claims/page.tsx`

The existing `ACCEPT` constant is `".pdf,.jpg,.jpeg,.png"`. We need to:
1. Add `.webp` to the constant (per spec).
2. Add MIME-type validation inside `handleAddFiles` with a visible inline error.
3. Add an error state and dismissible error banner.

- [ ] **Step 1: Add error state and update ACCEPT constant**

Near the top of the component function (around the existing `useState` declarations), locate the `ACCEPT` constant at the top of the file (line ~53):

```tsx
const ACCEPT = ".pdf,.jpg,.jpeg,.png";
```

Change to:

```tsx
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";
```

Also add a `VALID_MIME_TYPES` set near the same location (after `ACCEPT`):

```tsx
const VALID_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
```

Then inside the component function, add a new state for file validation errors. Find the existing `useState` declarations block and add:

```tsx
const [fileError, setFileError] = useState<string | null>(null);
```

- [ ] **Step 2: Add validation inside `handleAddFiles`**

Locate `handleAddFiles` (around line 524). Replace the opening of the function to add validation before processing:

Current:
```tsx
async function handleAddFiles(rawFiles: File[]) {
  const remaining = MAX_FILES - files.length;
  if (remaining <= 0) return;
  const list = rawFiles.slice(0, remaining);
  setIsLoading(true);
```

Replace with:
```tsx
async function handleAddFiles(rawFiles: File[]) {
  const remaining = MAX_FILES - files.length;
  if (remaining <= 0) return;

  const invalidType = rawFiles.find(f => !VALID_MIME_TYPES.has(f.type));
  if (invalidType) {
    setFileError(`Invalid file type "${invalidType.name}". Only JPG, PNG, WebP, and PDF files are accepted.`);
    return;
  }
  const oversized = rawFiles.find(f => f.size > MAX_FILE_SIZE);
  if (oversized) {
    setFileError(`File "${oversized.name}" exceeds the 10 MB limit (${(oversized.size / (1024 * 1024)).toFixed(1)} MB).`);
    return;
  }
  setFileError(null);

  const list = rawFiles.slice(0, remaining);
  setIsLoading(true);
```

- [ ] **Step 3: Add error banner in JSX**

Locate the main form JSX return. Find the top-level container div of the form stage. Add the error banner right below the opening container (before the dropzone/file list). Search for the section heading area (look for "Upload Receipts" or the main upload area) and insert:

```tsx
{fileError && (
  <div className="mx-4 mt-4 flex items-start gap-3 bg-error/10 border border-error/30 text-error rounded-xl px-4 py-3 text-sm font-body">
    <span className="shrink-0 font-bold">✕</span>
    <span className="flex-1">{fileError}</span>
    <button onClick={() => setFileError(null)} className="shrink-0 font-bold hover:opacity-70">✕</button>
  </div>
)}
```

Place this banner after the opening tag of the form-stage container, before any dropzone or file list content. The exact location should be just below the element that wraps the upload area.

- [ ] **Step 4: Update the UI hint text for accepted file types**

Find the text that describes supported formats (look for "Supports" near the upload zone). Update it to:

```tsx
<p className="font-body text-[11px] text-outline-variant">Supports JPG, PNG, WebP, PDF • Max 10 MB</p>
```

- [ ] **Step 5: Verify TypeScript**

Run: `cd frontend && npm run lint`

Expected: No errors in `app/employee/claims/page.tsx`.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/employee/claims/page.tsx
git commit -m "fix(validation): enforce file type and size limits on receipt upload (WF2)"
```

---

## Task 5: File Type Validation — HR Policy Page

**Files:**
- Modify: `frontend/app/hr/policy/page.tsx`

The policy page has two file inputs: Main Policy (accepts `.pdf,.docx,.doc,.txt`) and Appendix (accepts `.pdf,.docx,.doc,.txt,.xlsx,.xls,.csv`). Backend only processes PDF. Both must be restricted to PDF only.

- [ ] **Step 1: Add MIME validation constants and error state near the top of the component**

Find the component function. After the first `useState` declarations, add:

```tsx
const [policyFileError, setPolicyFileError] = useState<string | null>(null);
const POLICY_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
```

- [ ] **Step 2: Restrict Main Policy file input to PDF only**

Locate the Main Policy `<input type="file">` (around line 660):

```tsx
accept=".pdf,.docx,.doc,.txt"
```

Change to:

```tsx
accept=".pdf"
```

Update its `onChange` handler to add validation:

```tsx
onChange={(e) => {
  const file = e.target.files?.[0];
  if (file) {
    if (file.type !== "application/pdf") {
      setPolicyFileError(`Invalid file type. Only PDF files are accepted for policy documents.`);
      e.target.value = '';
      return;
    }
    if (file.size > POLICY_MAX_SIZE) {
      setPolicyFileError(`File too large. Maximum 10 MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`);
      e.target.value = '';
      return;
    }
    setPolicyFileError(null);
    setMainPolicyFile(file);
  }
  e.target.value = '';
}}
```

- [ ] **Step 3: Restrict Appendix file input to PDF only**

Locate the Appendix `<input type="file">` (around line 745):

```tsx
accept=".pdf,.docx,.doc,.txt,.xlsx,.xls,.csv"
```

Change to:

```tsx
accept=".pdf"
```

Update its `onChange` handler to add validation:

```tsx
onChange={(e) => {
  const files = Array.from(e.target.files || []);
  const invalid = files.find(f => f.type !== "application/pdf");
  if (invalid) {
    setPolicyFileError(`Invalid file type "${invalid.name}". Only PDF files are accepted.`);
    e.target.value = '';
    return;
  }
  const oversized = files.find(f => f.size > POLICY_MAX_SIZE);
  if (oversized) {
    setPolicyFileError(`File "${oversized.name}" exceeds 10 MB.`);
    e.target.value = '';
    return;
  }
  setPolicyFileError(null);
  if (files.length) setAppendixFiles(prev => [...prev, ...files]);
  e.target.value = '';
}}
```

- [ ] **Step 4: Add error banner above the policy form sections**

Locate the area just above the "Main Policy" heading in the form JSX. Insert:

```tsx
{policyFileError && (
  <div className="flex items-start gap-3 bg-error/10 border border-error/30 text-error rounded-xl px-4 py-3 text-sm font-body">
    <span className="shrink-0 font-bold">✕</span>
    <span className="flex-1">{policyFileError}</span>
    <button onClick={() => setPolicyFileError(null)} className="shrink-0 font-bold hover:opacity-70">✕</button>
  </div>
)}
```

- [ ] **Step 5: Update UI hint text for both upload zones**

For Main Policy upload zone, find:
```tsx
<p className="font-body text-[11px] text-outline-variant">Supports PDF, DOCX, TXT • Max 10 MB</p>
```
Change to:
```tsx
<p className="font-body text-[11px] text-outline-variant">Supports PDF • Max 10 MB</p>
```

For Appendix upload zone, find similar text and change to `Supports PDF • Max 10 MB`.

- [ ] **Step 6: Verify TypeScript**

Run: `cd frontend && npm run lint`

Expected: No errors in `app/hr/policy/page.tsx`.

- [ ] **Step 7: Commit**

```bash
git add frontend/app/hr/policy/page.tsx
git commit -m "fix(validation): restrict policy file upload to PDF only (WF1)"
```