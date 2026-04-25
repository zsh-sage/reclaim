## **QUALITY ASSURANCE TESTING DOCUMENTATION (QATD)** 

**Reclaim - AI-assisted expense reimbursement with intelligent decision support.** 

**_______________________________________________** 

## **Document Control** 

|**Document Control**||
|---|---|
|**Field**|**Detail**|
|**System Under Test (SUT)**|_[e.g., UMHackathon 2026 - Team_**_bogosort_**_]→ ACTUALLY I_<br>_DON’T HAVE ANY IDEA WHAT WE NEED TO INPUT IN HERE_|
|**Team Repo URL**|_(i’ll insert i here manually)_|
|**Project Board URL**|_(i’ll insert i here manually)_|



## **Objective:** 

_[Tell the objective of this QA for Reclaim, like it can help all of the process (elaborate more here) running smoothly from start to the end, until later we will go to deployment plan]_ 

_Note : 1 paragraph only (1-2 sentences)_ 

## **PRELIMINARY ROUND (Test Strategy & Planning)** 

## **1. Scope & Requirements Traceability** 

_[Tell this that this section purpose to ensure every test has been conducted to prevent bugs/failure in the products and unplanned feature creep, it’s also aligns the testing connected back to specific user requirements via Requirement Traceability Matrix]_ 

_Note : 1 paragraph only (1-2 sentences)_ 

## **1.1 In-Scope Core Features** 

[Explain each of the in-scope core features here of Reclaim, put it like in a bulletin list and also can explain what kind of action that we can do or each in-scope core features] 

## **1.2 Out-of-Scope** 

[Explain each of the out-of-scope features here of Reclaim, put it like in a bulletin list and also can explain what kind of action that we can do or each out-of-scope features like support, profile management, etc, etc] 

2 

## **2. Risk Assessment & Mitigation Strategy** 

_[Explain that Quality Assurance risks are anticipatory, so we identify the technical risk associated with our application requirements, architecture. Now the risk needs to be evaluated using the 5*5 Risk assessment Matrix. So, Risk Score = Likelihood * Severity] Note : 1-2 sentences only_ 

|**Technical Risk**|**Likelihood**<br>**(1–5)**|**Severity**<br>**(1–5)**|**Risk Score**<br>**(L×S)**|**Mitigation Strategy**|**Testing Approach**|
|---|---|---|---|---|---|
|_{{ Identify a_<br>_Critical risk_<br>_(Score 16-25)_<br>_based on the AI_<br>_Agent or_<br>_backend_<br>_connection_<br>_from the SAD }}_|_{{ 4 or 5 }}_|_{{ 4 or 5 }}_|_{{ Calculate_<br>_L x S }}_|_{{ Propose a specific_<br>_architectural fallback_<br>_}}_|_{{ Define how to_<br>_simulate this failure_<br>_}}_|
|_{{ Identify a_<br>_High risk (Score_<br>_11-15) based_<br>_on OCR_<br>_extraction_<br>_failure or user_<br>_input mismatch_<br>_}}_|_{{ 3 or 4 }}_|_{{ 3 or 4 }}_|_{{ Calculate_<br>_L x S }}_|_{{ Propose UI/UX_<br>_mitigation (e.g.,_<br>_manual override) }}_|_{{ Define testing_<br>_approach }}_|
|_{{ Identify a_<br>_Medium risk_<br>_(Score 6-10)_<br>_related to_<br>_Next.js state_<br>_management_<br>_or form_<br>_submission }}_|_{{ 2 or 3 }}_|_{{ 3 }}_|_{{ Calculate_<br>_L x S }}_|_{{ Propose mitigation_<br>_}}_|_{{ Define testing_<br>_approach }}_|
|_{{ Identify a_<br>_Low risk (Score_<br>_1-5) such as a_<br>_minor UI styling_<br>_glitch or_<br>_non-critical_<br>_animation_<br>_delay on the_<br>_frontend }}_|_{{ 1 or 2 }}_|_{{ 1 or 2 }}_|_{{ Calculate_<br>_L x S }}_|_{{ Acceptable risk._<br>_Monitor only. No_<br>_immediate_<br>_architectural fix_<br>_required. }}_|_{{ Standard visual QA_<br>_check }}_|



_**Note : DON’T DELETE THIS SCORING CRITERIA BELOW, IT’S ACT AS A RUBRIC SCORING CRITERIA SO THE**_ 

3 

## _**JUDGES KNOW**_ 

## _**Risk Assessment Scoring Criteria:**_ 

|_Likelihood (1-5)_|_Likelihood (1-5)_|_Severity (1-5)_|_Severity (1-5)_|
|---|---|---|---|
|_1_|_Rare_|_1_|_Impact is Negligible_|
|_2_|_Unlikely_|_2_|_Impact is Minor_|
|_3_|_Possible_|_3_|_Moderate Impact_|
|_4_|_Likely_|_4_|_Major Impact_|
|_5_|_Almost Certain_|_5_|_Critical Failure of the system_|



## _**Risk Score = Likelihood × Severity**_ 

## _**Risk Level Reference:**_ 

|**_Risk Score_**|**_Risk Level_**|**_Recommended Action_**|
|---|---|---|
|_1 – 5_|_Low_|_Monitor only. Acceptable risks._|
|_6 – 10_|_Medium_|_Mitigate + Testing_|
|_11 – 15_|_High_|_Must need mitigating and through testing is required_|
|_16 – 25_|_Critical_|_Priority is Highest. Need extensive level of testing._|



4 

## **3. Test Environment & Execution Strategy** 

Note : For section 3, make sure it fits with the SAD and PRD, especially regarding the whole system and architecture. 

_{{ Write a brief paragraph explaining that our Quality Assurance environment is strictly a localized Next.js build (localhost:3000). Explicitly state that while the final code is manually mirrored to a Digital Ocean droplet for the live judging demo, NO testing or QA occurs on the live server. TestSprite acts as our autonomous QA validation suite, orchestrated locally by Claude Code strictly as a final testing gate before code freeze. }}_ 

## **3.1. Testing Levels** 

## ● **Unit Test** 

   - _Scope: {{ Define scope based on PRD, e.g., the 'Fraud Trap' discrepancy calculation and OCR data extraction logic }}_ 

   - _Execution: {{ Mention that execution is handled dynamically by TestSprite against isolated functions during the final local QA testing phase }}_ 

   - _Isolation: {{ State that external backend endpoints are mocked to purely test the frontend logic and state management }}_ 

   - _Pass Condition: {{ e.g., The system correctly flags a boolean 'true' when User Input differs from OCR extraction by > RM 0.00 }}_ 

- **Integration Test** 

   - _Scope: {{ Define scope, e.g., Next.js 'Smart Entry' frontend communicating with the live AI Agent backend node }}_ 

   - _Execution: {{ Executed autonomously via TestSprite on localhost ONLY after all manual PRs and GitHub branch merges are finalized }}_ 

   - _Workflow: {{ Real API calls are tested using actual sample receipt images to ensure the full request-response lifecycle works locally }}_ 

   - _Pass Condition: {{ The AI Decision Agent correctly routes integrated claims to Bucket A or Bucket B based on the actual image provided }}_ 

## **3.2. Test Environment (Zero-Deployment MVP)** 

- _Local Active Testing: {{ Manual component validation on localhost:3000 by developers during active feature building }}_ 

- _Demo-Only Deployment (Out of QA Scope): {{ Explicitly state that the finalized, QA-passed local build is manually pushed to Digital Ocean purely for judging visibility. No automated testing or CI/CD pipelines touch this live droplet. }}_ 

- _Future Roadmap: {{ Note that post-MVP, the roadmap includes formal staging environments and automated GitHub Actions for CI/CD. }}_ 

## **3.3. Regression Testing & Pass/Fail Rules:** 

- _Execution Phase: {{ TestSprite autonomously runs the core 'Smart Entry' and 'Audit' workflows as a final regression pass across the completed local MVP architecture to ensure no late-stage merges broke the UI }}_ 

- _Pass/Fail Condition: {{ Tests pass only when actual AI routing aligns with the PRD expected result. Failures are instantly extracted by Claude Code and logged as defects. }}_ 

5 

- _Continuation Rule: {{ Core OCR and routing paths must achieve a 100% pass rate before UI/UX edge cases are evaluated }}_ 

## **3.4. Test Data Strategy** 

- _Manual Data: {{ Mention we created sample employee profiles and specific test receipt images (including clean receipts and non-compliant ones with alcohol/over-limits) }}_ 

- _Automated Data: {{ TestSprite autonomously generates boundary-case JSON payloads to simulate unpredictable user edits and stress-test the 'Fraud Trap' }}_ 

## **3.5. Passing Rate Threshold** 

_{{ Define the overall passing rate threshold (e.g., 95% of all executed TestSprite cases must pass). Crucially, explicitly state that 100% of Critical Priority tests—specifically the 'Fraud Trap' discrepancy calculation and the AI Decision Agent's routing logic—must pass with zero exceptions. Explain that because Reclaim handles financial data, any AI misclassification or hallucination in the core audit loop is considered a catastrophic failure. }}_ 

## **4. MVP Release Thresholds & Quality Gates** 

_{{ Write a brief paragraph explaining that because all QA is localized, these thresholds represent our strict manual "Go/No-Go" quality gates evaluated entirely on localhost:3000. Once these thresholds are met via TestSprite, the code is frozen and manually mirrored to Digital Ocean for the demo. }}_ 

## _**4.1 Pre-Merge Validation Gates**_ 

_We enforce these checks locally before executing manual GitHub merges to the main branch._ 

_Note : Can add more checks if you think it’s needed for this section from my program._ 

|**_Checks_**|**_Requirements_**|**_Project_**|**_Pass/Failed_**|
|---|---|---|---|
|**_Local Next.js Build_**|**_Zero Build Errors (`npm_**<br>**_run build`)_**|**_{{ Claude: Log actual_**<br>**_errors from the final_**<br>**_build }}_**|**_{{ Pass/Fail }}_**|
|**_TestSprite Unit Tests_**|**_100% Passing Rate on_**<br>**_Critical Logic_**|**_{{ Claude: Log actual_**<br>**_TestSprite pass_**<br>**_percentage }}_**|**_{{ Pass/Fail }}_**|
|**_Code Quality_**|**_Zero Next.js Linting_**<br>**_Errors_**|**_{{ Claude: Log actual_**<br>**_linting errors }}_**|**_{{ Pass/Fail }}_**|



6 

## _**4.2 Live Demo Deployment Gates (Pushing to Digital Ocean)**_ 

## _**These strict thresholds must be met before the final MVP build is pushed to the live Digital Ocean droplet for judging.**_ 

|**_droplet for judging._**||||
|---|---|---|---|
|**_Checks_**|**_Requirements_**|**_Project_**|**_Pass/Failed_**|
|**_AI Routing Accuracy_**|**_100% Pass Rate for 'Fraud_**<br>**_Trap' logic_**|**_{{ Claude: Log_**<br>**_actual AI_**<br>**_decision pass_**<br>**_percentage }}_**|**_{{ Pass/Fail }}_**|
|**_Regression Test_**|**_Minimum 95% overall local_**<br>**_TestSprite pass rate_**|**_{{ Claude: Log_**<br>**_overall actual_**<br>**_percentage }}_**|**_{{ Pass/Fail }}_**|
|**_Critical Bugs_**|**_Zero P0/P1 Bugs blocking the_**<br>**_UI_**|**_{{ Claude: Log_**<br>**_actual critical_**<br>**_bug count }}_**|**_{{ Pass/Fail }}_**|
|**_Local API Performance_**<br>**_(WF1: Policy Sync)_**|**_LangChain parses full policy_**<br>**_PDF in < 3.5 minutes_**|**_{{ Claude:_**<br>**_Execute WF1_**<br>**_locally and log_**<br>**_actual time_**<br>**_(Expected: 2-3_**<br>**_mins) }}_**|**_{{ Pass/Fail }}_**|
|**_Local API Performance_**<br>**_(WF2: Upload Receipt)_**|**_LangChain processes_**<br>**_uploaded receipt in < 45_**<br>**_seconds_**|**_{{ Claude:_**<br>**_Execute WF2_**<br>**_locally and log_**<br>**_actual time_**<br>**_(Expected:_**<br>**_15-30s) }}_**|**_{{ Pass/Fail }}_**|
|**_Local API Performance_**<br>**_(WF3: Compliance)_**|**_LangChain evaluates_**<br>**_compliance in < 150 seconds_**|**_{{ Claude:_**<br>**_Execute WF3_**<br>**_locally and log_**<br>**_actual time_**<br>**_(Expected:_**|**_{{ Pass/Fail }}_**|



7 

|||**_30-120s) }}_**||
|---|---|---|---|
|**_Security_**|**_Zero API keys exposed in_**<br>**_version control_**|**_{{ Claude: Verify_**<br>**_.env variables_**<br>**_are properly_**<br>**_excluded from_**<br>**_GitHub tracking_**|**_{{ Pass/Fail }}_**|



## **5. Test Case Specifications (Drafts)** 

_*(Note: As per our local QA strategy, Test Case execution is validated on localhost:3000 via TestSprite and developer monitoring)._ 

_(Note: As per our local QA strategy, Test Case execution is autonomously validated on localhost:3000 via TestSprite)._ 

## **Mandatory Testing Scope Completed:** 

- **1 Happy Case (Entire Flow):** End-to-end "Golden Path" validation. 

- **1 Specific Case (Negative/Edge Test):** System error/exception handling validation. 

- **2 Non-Functional (NFR) Tests:** Performance latency and architectural constraint validation. 

_(Note: Additional test cases generated by TestSprite's autonomous coverage are appended below these mandatory requirements)._ 

|**Test**<br>**Case**<br>**ID**|**Test Type &**<br>**Mapped**<br>**Feature**|**Test Description**|**Test Steps**|**Expected Result**|**Actual Result**|
|---|---|---|---|---|---|
|_TC-01_|**_**Happy Case_**<br>**_(Entire_**<br>**_Flow):** Smart_**<br>**_Entry &_**<br>**_Compliance_**<br>**_Audit_**|_{{ Claude: Describe a_<br>_user successfully_<br>_uploading a valid_<br>_receipt and the AI_<br>_routing it to Bucket A._<br>_}} y._|_{{ Claude: 1._<br>_User logs in. 2._<br>_Uploads clean_<br>_receipt. 3. AI_<br>_Agent processes_<br>_OCR. 4._<br>_Auto-approved._<br>_}}_|_Receipt is_<br>_processed, OCR_<br>_matches input,_<br>_and claim is_<br>_routed to Bucket_<br>_A._|_{{ Claude:_<br>_Execute_<br>_TestSprite on_<br>_localhost. Log_<br>_the exact_<br>_successful_<br>_output and note_<br>_'Status: Passed'._<br>_}}_|
|_TC-02_|**_**Specific Case_**<br>**_(Negative/Edg_**<br>**_e Test):**_**<br>**_Fraud Trap_**<br>**_Trigger_**|_Verify the system does_<br>_handle error quite_<br>_optimally and block_<br>_access when an_<br>_invalid card is entered_|_{{ Claude:_<br>_Describe a user_<br>_intentionally_<br>_altering the_<br>_input amount to_|_{{ Claude: 1._<br>_Upload receipt._<br>_2. Edit input field_<br>_to > receipt total._<br>_3. Submit. }} |_|_{{ Claude:_<br>_Execute_<br>_TestSprite edge_<br>_case. Log the_<br>_exact output_|



8 

|**Test**<br>**Case**<br>**ID**|**Test Type &**<br>**Mapped**<br>**Feature**|**Test Description**|**Test Steps**|**Expected Result**|**Actual Result**|
|---|---|---|---|---|---|
|||_without triggering_<br>_500 errors._|_differ from the_<br>_OCR extracted_<br>_amount. }}_|_The Fraud Trap_<br>_discrepancy_<br>_calculation_<br>_catches the_<br>_mismatch and_<br>_routes to Bucket_<br>_B for manual_<br>_review._|_and note_<br>_'Status: Passed'._<br>_}}_|
|_TC-03_|**_**Non-Functio_**<br>**_nal Test 1_**<br>**_(Performance):_**<br>**_** AI_**<br>**_Processing_**<br>**_Latency_**|_{{ Claude: Verify the_<br>_processing time of the_<br>_LangChain AI agent_<br>_during a standard_<br>_receipt upload (WF2)._<br>_}}_|_{{ Claude: 1._<br>_Trigger WF2_<br>_upload. 2._<br>_Measure_<br>_network/local_<br>_response time_<br>_until decision is_<br>_rendered. }}_|_System_<br>_completes AI_<br>_decision in < 45_<br>_seconds (as_<br>_defined in our_<br>_release_<br>_thresholds)._|_{{ Claude: Log_<br>_the actual_<br>_processing time_<br>_in seconds based_<br>_on local testing._<br>_Note 'Status:_<br>_Passed'. }}_|
|_TC-04_|**_**Non-Functio_**<br>**_nal Test 2_**<br>**_(Architecture/L_**<br>**_oad):** File_**<br>**_Size/Format_**<br>**_Rejection_**|_Claude: Verify the_<br>_system's architectural_<br>_constraint by_<br>_attempting to upload_<br>_an unsupported or_<br>_oversized file (e.g., a_<br>_20MB PDF or a .txt_<br>_file). }}_|_{{ Claude: 1._<br>_Attempt to_<br>_upload a 20MB_<br>_dummy file. 2._<br>_Monitor system_<br>_response. }}_|_Frontend rejects_<br>_the file before_<br>_sending to the_<br>_backend,_<br>_preventing_<br>_server overload_<br>_or AI Agent_<br>_crash._|_{{ Claude:_<br>_Execute local_<br>_test. Log the_<br>_exact error_<br>_message_<br>_displayed to_<br>_user. Note_<br>_'Status: Passed'._<br>_}}_|



{{ Claude: Scan the TestSprite report. If TestSprite successfully executed additional relevant tests beyond the 4 mandatory ones above, automatically generate new rows here starting with TC-05. Map them to their respective Test Types (e.g., UI/UX, Integration). Limit to a maximum of 6 additional rows to keep the document concise. CRITICAL: Filter these extra rows to only show the most important MVP features (e.g., database writes, state management, core UI flows). After generating the table, add a small, italicized paragraph below the table that says: *"Note: The tests listed above represent a curated subset of our critical path validation. The comprehensive suite of [Number] automated test cases executed during this QA phase can be reviewed in the raw `testsprite_results.md` log file included in our repository."* Fill in the [Number] with the actual total number of tests TestSprite ran. }} 

9 

## **6. AI Output & Boundary Testing (Drafts)** 

Note : For section 3, make sure it fits with the SAD, especially regarding the whole system and architecture. 

[Explain more in like this section validating that our LangChain integration produces deterministic, acceptable outputs for financial compliance and handles edge cases gracefully.] → 1 - 2 sentences. 

## **6.1. System Input/Output Test Pairs** 

These tests evaluate the core decision-making accuracy of the AI Agent across our primary workflows. 

Note : MAKE SURE WITH SAD AGAIN, Can add more test-id 

|Test ID|System Input /<br>Trigger|Expected AI<br>Output<br>(Acceptance<br>Criteria )|Actual Output|Status|
|---|---|---|---|---|
|AI-01|**(WF2) Valid<br>Upload:** User<br>uploads a clear,<br>standard meal<br>receipt<br>(JPEG/PNG).|JSON output must<br>exactly match the<br>visual receipt<br>numbers  and text<br>with 0<br>hallucinated<br>fields.|{{ Claude: Extract<br>local TestSprite<br>result for standard<br>OCR. }}|{{ Pass/Fail }}|
|AI-02|**(WF3)<br>Compliance<br>Trigger:** System<br>feeds a $50 meal<br>receipt extraction<br>into the policy<br>logic (Limit: $40).|AI Agent correctly<br>identifies the $10<br>overage and flags<br>the claim as<br>non-compliant.|{{ Claude: Extract<br>local TestSprite<br>result for policy<br>violation. }}|{{ Pass/Fail }}|
|AI-03|**Fraud Trap<br>Trigger:** User<br>manually edits the<br>input field to "RM<br>50.00", but the<br>OCR extraction<br>payload shows<br>"RM 30.00". |<br>System detects<br>the mathematical<br>discrepancy and|System detects<br>the mathematical<br>discrepancy and<br>explicitly routes<br>the claim to<br>Bucket B (Manual<br>Review).|{{ Claude: Extract<br>local TestSprite<br>result for<br>discrepancy<br>routing. }}|{{ Pass/Fail }}|



10 

explicitly routes the claim to Bucket B (Manual Review). 

## **6.2. Oversized/Larger Input Test** 

[Explain like because Reclaim processes visual data and PDF policies, we must strictly define our payload limits to prevent LangChain timeouts and control API costs. ] → 1 - 2 sentences. 

|Fields|Details|
|---|---|
|Maximum Input Size|Policy PDF: Max 10MB.  Receipt Image: Max 10 Receipt (2MB each).|
|Input used while testing|{{ Claude: Execute a test uploading a 50-page PDF or a 15MB image file<br>on localhost. }}|
|Expected Behavior|Frontend strictly rejects the upload before it hits the backend AI<br>Agent, displaying a "File too large" UI error.|
|Actual Behavior|{{ Claude: Log the actual UI response/error message triggered during<br>the local test. }}|
|Status|Pass|



## **6.3.  Adversarial/Edge Input Test** 

We tested the system's resilience against malformed document uploads and data manipulation. 

- Adversarial Input: User uploads a receipt where the total amount is physically scribbled out or unreadable, and then manually types a highly inflated amount into the frontend form. 

- Expected Handling: The LangChain OCR will fail to extract a confident total, returning a null or flagged value. The strict 'Fraud Trap' logic will immediately catch the mismatch between the user's high input and the missing OCR data, routing the claim directly to Bucket B. The AI cannot be "tricked" into approving it because the fallback logic requires a perfect match. 

- Actual Result: {{ Claude: Run this edge case locally via TestSprite. Confirm the system routes to Bucket B. Log output here. }} 

## **6.4. Hallucinating Handling** 

11 

[Explain like this : because Reclaim handles sensitive financial data, we utilize **"Deterministic Guardrails"** to mitigate LangChain hallucinations. Instead of asking the LLM to simply output "Approved" or "Rejected," the AI is strictly used for data extraction (Dates, Amounts) and policy querying. The final routing decision (Bucket A vs Bucket B) is executed by strict Next.js mathematical logic (`if user_amount != ocr_amount -> Bucket B`). This hybrid architecture guarantees that LLM hallucinations cannot bypass the financial audit loop. ] 

_Note : Make sure again with SAD for this part. Cause i’m not sure it is like this workflow that i’ve being writing._ 

## **A Note on Agile QA Methodology** 

_In accordance with Agile development principles, the Quality Assurance strategies defined in this document were not treated as a rigid, final-hour phase. Testing—particularly the AI boundary constraints and localized component checks—was conducted iteratively throughout the Reclaim MVP development cycle to ensure continuous integration stability prior to this final Code Freeze._ 

12 

