**Task: Refactor Claim Details Drawer UI (History/Approval View)**

**Objective:** Expand the slide-out drawer to accommodate partial approvals, a line-item financial breakdown with support for multiple deduction reasons, HR notes, and PDF documentation.

**1. Layout Mechanics**
* **Expand Width:** Update the slide-out drawer container to be wider on desktop (e.g., `md:max-w-2xl` or `w-[600px]`). Keep it `w-full` on mobile.

**2. Header & Top-Level Summary**
* **Dual Totals:** Prominently display `Total Approved: $XXX`. If the claim was partially approved, display the original requested amount nearby with a strikethrough (e.g., `<del>Requested: $XXX</del>`).
* **HR General Note:** Render an alert/banner block directly below the totals to display a general "HR Note" if one exists.

**3. Dynamic Financial Breakdown (Line Items)**
* Replace the static "Merchant" card with a mapping of line-item categories.
* **Mock Data Structure (Support Multiple Reasons):**
  ```json
  [
    { "category": "Flight", "requested": 1000, "approved": 500, "reasons": ["Exceeds $500 cap per policy."] },
    { "category": "Meals", "requested": 150, "approved": 100, "reasons": ["Alcohol is non-reimbursable.", "Missing itemized receipt."] },
    { "category": "Transport", "requested": 50, "approved": 50, "reasons": [] }
  ]
  ```
* **UI Pattern:** Render each item in a list or table row. Display Category, Requested Amount, and Approved Amount. 
* **Deduction Logic:** If `approved < requested`, render an inline warning layout (e.g., a muted red/amber background for that row) and display the `reasons` array as a bulleted list so the employee instantly understands the multiple deductions.

**4. Timeline Integration**
* Retain the vertical status timeline. Ensure the final step's description dynamically reflects if the claim was "Fully Approved", "Partially Approved", or "Rejected".

**5. Documents Section (Bottom)**
* **Primary Document:** Replace the "Attached Receipt" block with "Official Claim Form (PDF)". Add a primary button to "View / Download PDF".
* **Secondary Documents:** Below the PDF, add a simple link list or a collapsed accordion for "Original Receipts (X Attached)" so the employee can still reference their raw uploads.
