**Task: Refactor Claim Submission Architecture & OCR Validation Flow (Frontend UI Implementation)**

**Core Objective:** Transition the claim submission flow from a locked-PDF generation model to a dynamic, user-validated JSON state model. Eliminate auto-retries for OCR failures, establish a single, progressive submission pipeline, and implement a live HTML preview. **This task is STRICTLY for frontend UI development. Do not build backend endpoints or generate actual PDF files in the browser.**

**Mock Data Architecture (Crucial for Backend Handoff):**
* To ensure clean component architecture and make it extremely easy for the backend team to connect endpoints later, all mock JSON data must be strictly separated from the page/component files.
* Store mock DB payloads and simulated OCR responses in a dedicated external directory (e.g., `src/mocks/claimMockData.ts` or `src/services/mockApi.ts`). The UI components will import or fetch this data. When the backend is ready, developers will simply swap these mock imports with actual API fetch calls.

**Phase 1: Initialization & Progressive Upload**
* **Main Category Selection:** User selects the overarching claim envelope (e.g., "Business Trip").
* **Batch Upload:** User can upload up to 10 supporting documents (PDFs or Images) in a single batch.
* **UI Requirement:** Cross-platform preview capability. Users must be able to review, delete, or swap documents before hitting submit.

**Phase 2: Asynchronous AI Extraction (Frontend State)**
* **Action:** UI simulates sending documents to the backend OCR/Vision endpoint.
* **State Management:** The UI receives the AI's extracted data mapped into a JSON payload, classifying each receipt into Sub-Categories (Meals, Transport, etc.) based on the Main Category envelope.
* **UX Requirement:** Implement progressive loading (e.g., "Processing receipt 3 of 10..."). Do not block the UI with a static spinner for the entire batch.

**Phase 3: The Verification Stage (User-Driven Validation & Live Preview)**
* **UI Layout:** Split-view. Editable React form fields on the left, and a live "A4 Paper" HTML document preview on the right.

* **Left Panel (Form Entry) - Organize strictly by this user-intent flow:**
    * **Section 1: The Identity Block (Read-Only):** Pull from mock `dbData` (Entity Name, Employee Name, Employee Number, Position, Location, Department). Render as a compact, read-only badge or collapsed accordion at the top.
    * **Section 2: The Claim Context (Editable):** Render inputs for Travel Destination, Travel Purpose, Overseas (Yes/No), Departure Date, Arrival Date. If the AI payload includes flight dates, pre-fill them but leave them fully editable.
    * **Section 3: The Financial Breakdown (Editable):** Pull from mock `ocrData` (Expense Dates, Merchant/Description, Transport, Accommodations, Meals, Others). Group these logically. **Do not lock these fields.** The user must be able to edit any number.
    * **Section 4: The Summary & Action:** Calculate a `Sub-Total` dynamically based on Section 3. Render this as a locked, read-only display alongside a single "Submit Claim" button. (No "HR Review" or "Retry" buttons).

* **Right Panel (Live Preview Behavior):**
    * The right-side HTML container (styled with CSS to simulate a physical A4 document) must instantly bind to the overall form state. As the user types in the left panel, the right panel updates in real-time.

* **Exception Handling (Strict Rule):** If OCR fails on a document, do not retry. Leave the mapped form fields blank, flag them with validation errors (Required), and force the user to manually type the data while looking at the document preview.

**Phase 4: Backend Handoff & HR Routing**
* **Frontend Action:** Upon clicking submit, the UI calculates the Sub-Total dynamically, packages the fully user-validated state into a single, clean JSON payload, and executes a POST request (simulate with a `console.log` or mock API response for now). **The frontend does not generate the PDF file.**
* **Backend Action (For Context Only - Do Not Build):** The backend consumes the JSON payload, merges it with the DB variables, dynamically generates the finalized PDF form, and flags the claim as PENDING_APPROVAL. HR reviews the employee-verified data against the raw document images to approve or reject. HR performs zero data entry.