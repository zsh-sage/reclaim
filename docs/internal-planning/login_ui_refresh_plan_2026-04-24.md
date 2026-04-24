# Login UI Refresh Implementation Plan

**Goal:** Improve `frontend\app\login\page.tsx` UX for MVP by adding interactive portal highlighting, restricted-forgot-password toast, left-panel visual polish, and true full-page no-scroll behavior on all viewports.

**Current state summary:**
- Login page already uses split layout, glass card, and existing palette tokens from `frontend\app\globals.css`.
- Portal buttons are static (Employee appears active; HR has hover only, no active state handling).
- Forgot Password is an anchor (`href="#"`) with no explicit MVP restriction feedback.
- Root layout/body + login section sizing can create extra vertical overflow due to combined `min-h-full` + `min-h-screen` + large paddings.

**Confirmed decisions:**
- HR button change is **visual highlight only** (no alternate auth flow).
- Forgot Password uses a **non-blocking toast banner**.
- Full-page no-scroll target is **desktop and mobile**.

---

## Approach options

### Option A (recommended): Local state + inline toast + viewport-safe sizing fixes
- Keep all behavior inside `frontend\app\login\page.tsx`.
- Add `activePortal` state for Employee/HR visual toggle only.
- Add lightweight local toast state with auto-dismiss timer.
- Replace overflow-prone sizing/padding combinations with `min-h-dvh` and controlled container height.
- **Pros:** Fast, low-risk, minimal surface area.
- **Cons:** Toast logic remains page-local.

### Option B: Shared MVP toast component reuse
- Reuse/adapt patterns from `frontend\app\employee\claims\_components\CameraModal.tsx` and `frontend\app\employee\_components\MvpFeatureRestricted.tsx`.
- Build a small reusable `MvpToast` component for login + future screens.
- **Pros:** Better reusability.
- **Cons:** Slightly larger change set for this request.

### Option C: Introduce global toast library
- Add a dependency (e.g., Sonner/React Hot Toast) and wire provider globally.
- **Pros:** Long-term standardization.
- **Cons:** Unnecessary for current MVP scope (YAGNI), increases integration/testing scope.

**Recommendation:** Option A now; evolve to Option B only if a second page needs the same MVP restriction toast.

---

## File map

### Primary
- Modify: `frontend\app\login\page.tsx`
  - Add portal active-state model and class switching.
  - Add forgot-password toast state + trigger.
  - Add left-panel visual refinements (non-breaking, same palette).
  - Adjust layout classes for full-page fit/no-scroll.

### Supporting (only if needed)
- Modify: `frontend\app\globals.css`
  - Add 1–2 utility classes only if Tailwind utilities become too verbose for toast animation or safe viewport handling.

### Validation
- Use existing frontend checks:
  - `cd frontend && npm run lint`
  - `cd frontend && npm run build`

---

## Implementation tasks

### Task 1 — Portal toggle active highlight behavior
- Implement `activePortal` state (`"employee" | "hr"`), default `"employee"`.
- On button click, update state only (no routing/auth behavior changes).
- Apply active/inactive class variants so clicked tab receives highlighted style, shadow, and stronger contrast.
- Keep current spacing and rounded-pill container.

### Task 2 — Forgot Password MVP restriction toast
- Replace anchor element with `button type="button"` for semantic click behavior.
- Add `showRestrictionToast` + `toastMessage` state and a dismiss timer (auto-hide).
- Message text: `Feature Restricted during MVP Stages`.
- Ensure toast is keyboard accessible and non-blocking.

### Task 3 — Left-side panel UI modernization (same palette)
- Preserve existing gradient colors (`primary`, `primary-dim`, `tertiary` family).
- Improve hierarchy with:
  - stronger headline lockup,
  - clearer supporting copy width/line-height,
  - subtle depth accents (controlled blur blobs / grain overlay / glass edge).
- Keep content concise and legible; avoid visual clutter.

### Task 4 — Full-page mode and no-scroll behavior
- Replace login root sizing strategy with `min-h-dvh` and bounded inner containers.
- Reduce oversized vertical paddings on smaller viewports to prevent overflow.
- Ensure split panel and card center correctly without body-level scrolling.
- Verify no vertical scrollbar appears at common breakpoints.

### Task 5 — Regression pass for auth UX
- Confirm sign-in, demo buttons, error display, and password visibility toggle remain unchanged functionally.
- Confirm HR/Employee toggle remains purely visual and does not alter `AuthContext` routing logic.

---

## Notes for left-side UI direction (proposal set)

1. **Editorial + trust-led:** Keep one strong headline and 2–3 short supporting lines with “efficiency by exception” value framing.
2. **Data motif overlay:** Introduce faint audit-grid lines and tiny pulse dots for “AI review pipeline” feeling using low-opacity white/palette tints.
3. **Brand anchor chip:** Add compact “MVP Production” or “AI-assisted reimbursement” capsule near title for immediate context.

These can be delivered incrementally; start with (1) + (3), then add (2) only if readability remains strong.

