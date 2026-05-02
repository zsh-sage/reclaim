## **REFINED QUALITY ASSURANCE TESTING DOCUMENTATION (RQATD)** 



## **Document Control** 

|**Document Control**||
|---|---|
|**Field**|**Detail**|
|**System Under Test (SUT)**|UMHackathon 2026 - bogosort|
|**Team Repo URL**|https://github.com/zsh-sage/reclaim|
|**Project Board URL**|_[Insert link to your Jira/Trello/GitHub Projects board]_|
|**Live Deployment URL**|https://reclaimai.dev|



## **Objective:** 

_[State the primary goal of your QA process for this specific hackathon project.]_ 

_[e.g. The primary objective of this refined QATD is that our team YFood ensured the product producing accurate, hallucination-free dish suggestions. It handles edge cases of inputs and maintains stability. All the GLM outputs and other incidents we encountered are logged and resolved._ 

## _**FINAL ROUND (Execution, RCA & Hard Evidence)**_ 

## _**No evidence = No points.**_ 

## **1. Test Execution & Evidence (Manual)** 

_Execute the tests drafted in_ _**Part 1** . You must provide a link to visual proof for at least 3 critical tests._ 

|**Test**<br>**Case ID**|**Test Type &**<br>**Mapped**<br>**Feature**|**Test Description**|**Expected**<br>**Result**|**Actual**<br>**Result**|**Status**|**Proof of**<br>**Execution**<br>**(Required**<br>**for**<br>**P0/Critical**<br>**tests)**|
|---|---|---|---|---|---|---|
|_TC-01_|**_Happy Case_**<br>**_(Entire_**<br>**_Flow):_**_[e.g._<br>_User places_<br>_order of_<br>_food, end to_<br>_end]_|_[e.g. Verifies that_<br>_a registered users_<br>_can do browse_<br>_the restaurants,_<br>_adding items to_<br>_the cart, and does_<br>_checkout_<br>_successfully.]_|_[e.g. Order_<br>_gets_<br>_confirmed._<br>_ID is_<br>_generated,_<br>_status is_<br>_updated to_<br>_processing_<br>_and Riders_|_[e.g. Order_<br>_Placed,_<br>_confirmation_<br>_displayed,_<br>_but with_<br>_Incorrect_<br>_summaries]._|_[e.g. Fail]_|_[Screenshot]_|



_© UMHackathon 2026_ 

_Email: umhackathon@um.edu.my_ 

3 

|**Test**<br>**Case ID**|**Test Type &**<br>**Mapped**<br>**Feature**|**Test Description**|**Expected**<br>**Result**|**Actual**<br>**Result**|**Status**|**Proof of**<br>**Execution**<br>**(Required**<br>**for**<br>**P0/Critical**<br>**tests)**|
|---|---|---|---|---|---|---|
||||_gets_<br>_assigned.]_||||
|_TC-02_|**_Specific_**<br>**_Case_**<br>**_(Negative):_**<br>_[e.g._<br>_Checkout_<br>_with Empty_<br>_Cart]_|_[e.g. Verify that_<br>_the system we_<br>_built blocks_<br>_checkout when_<br>_the cart is_<br>_completely empty_<br>_and shows the_<br>_appropriate_<br>_errors.]_|_[e.g._<br>_Checkout_<br>_button_<br>_entirely_<br>_disables and_<br>_returns error_<br>_like “Your_<br>_cart is_<br>_Empty”, but_<br>_don’t crash.]_|_[e.g._<br>_Checkout_<br>_Blocked._<br>_Error_<br>_displayed_<br>_clearly and_<br>_application_<br>_didn’t fail.]_|_Pass_|_[Screenshot]_|
|_TC-03_|**_NFR_**<br>**_(Performan_**<br>**_ce):_**<br>_Concurrent_<br>_Order API_<br>_Load_|_[e.g. For our case,_<br>_API maintains_<br>_sub-800ms_<br>_latency especially_<br>_under 50 requests_<br>_coming_<br>_simultaneously]_|_Average_<br>_response_<br>_time of ours_<br>_should be_<br>_<800 with_<br>_0% error_<br>_rate._|_Average_<br>_response_<br>_time was_<br>_913ms._<br>_Though 0_<br>_errors._|_Failed_|_[Screenshot_<br>_URL of_<br>_Postman_<br>_Runner_<br>_results /_<br>_Terminal_<br>_output]_|
|_TC- AI-01_|**_AI Output_**<br>**_Validation:_**<br>_GLM_<br>_dish/Food_<br>_Recommend_<br>_ation_|_[e.g. Sent a_<br>_prompt to Z.AI_<br>_GLM with a user’s_<br>_last 5 orders and_<br>_their preference_<br>_of Diet and_<br>_returned_<br>_hallucination free_<br>_recommendation._|_GLM does_<br>_return 3 dish_<br>_recommenda_<br>_tion. The_<br>_food was_<br>_according to_<br>_diet._|_[Received_<br>_Output]_|_Passed_|_[Screenshot_<br>_of Prompt &_<br>_Response +_<br>_Parsed_<br>_Recommend_<br>_ation]_|



_© UMHackathon 2026_ 

_Email: umhackathon@um.edu.my_ 

4 

## _**2. Automated Testing Pipeline**_ 

## _2.1. Unit Testing (Core Logic & Functions)_ 

_Unit testing is primarily focused on Isolation of the individual components or functions to ensure that these functionalities work perfectly on their own without the need of any external dependencies. Mock your databases or APIs here._ 

- _**Test Runner Used:** [e.g., Jest (Node.js)]_ 

- _**Targeted Components:** [e.g., calculateDeliveryFee(), extractOrderHistory()]_ 

- _**File(s) Covered:** [Link to the test file of your github repo]_ 

|**_Unit Test ID_**|**_Function/Compone_**<br>**_nt Tested_**|**_Test Scenario_**|**_Expected_**<br>**_Outcome_**|**_Actual Result_**|**_Status_**|
|---|---|---|---|---|---|
|**_UT-01_**|_calculateDeliveryFe_<br>_e()_|_Distance over_<br>_3.6KM –_<br>_Verify if the_<br>_delivery is_<br>_calculated_<br>_correctly or_<br>_not._|_Returns RM_<br>_4.50._|_Returned RM 9._|**_Failed_**|



_**Execution Proof** : [Screenshot of your terminal with the tests conducted or CI/CD proof of Github conducting the tests with results is also applicable]_ 

_© UMHackathon 2026_ 

_Email: umhackathon@um.edu.my_ 

5 

## **2.2. Integration & API Testing (System Modules)** 

_This test is mainly conducting communicate (e.g., Frontend to Backend, Backend to Database). Do they integrate correctly?_ 

- **Test Tool Used:** [e.g., Postman automated collections] 

- **Targeted Integrations:** [e.g., Backend endpoints connecting to MongoDB, Frontend component fetching data from backend API.] 

- **File(s) Covered:** [e.g., Github repo showing Integration Tests or Postman Public Link] 

|**Test ID**|**Integration / Point**<br>**Tested**|**Test Scenario**|**Expected**<br>**Outcome**|**Actual Result**|**Status**|
|---|---|---|---|---|---|
|**IT-01**|[e.g. POST<br>/api/order -><br>MongoDB]|[e.g. So, this<br>sends a valid<br>order and<br>verify that<br>the database<br>record is<br>created and<br>correct status<br>is updated.]|[e.g. Should<br>return HTTP<br>201. Order<br>should be into<br>Processing<br>State.]|[Actual<br>Execution]|**PASS**|



**Execution Proof:** [Screenshot of Postman Test Runner Results/ Terminal output of integration tests] 

_© UMHackathon 2026_ 

_Email: umhackathon@um.edu.my_ 

6 

## **3. Defect Log & Fix Traceability (Root Cause Analysis)** 

_Log the bugs you_ _**fixed** . Include the exact Git Commit Hash to prove the fix. AI cannot fake your codebase's commit history._ 

|**Bug ID**|**Bug Description**|**Steps to**<br>**Reproduce**|**Console/Error Log**<br>**Snippet**|**Root Cause**<br>**Analysis (Why**<br>**did it break?)**|**Fix Commit**<br>**Hash / PR Link**|
|---|---|---|---|---|---|
|_DEF-01_|_Application_<br>_crashes when_<br>_form is submitted_<br>_with a blank date_<br>_field._|_1. Leave the_<br>_date blank._<br>_2. Submit._|Type Error:<br>Cannot read<br>properties of null|_The backend_<br>_parser_<br>_attempted to_<br>_format a null_<br>_date object._<br>_Missing null_<br>_checks._|_[Link to commit_<br>_e.g.,_<br>_github.com/rep_<br>_o/commit/8f4a_<br>_2b1]_|



## **4. Known Issues & Deferred Technical Debt** 

_It is normal to ship with minor bugs. Document the bugs you found but did not have time to fix. You are highly encouraged to convert these into open GitHub Issues to demonstrate proper defect tracking._ 

_Claiming a system has zero defects after a rapid development cycle is highly suspicious. This section evaluates your transparency and risk awareness. Clearly document any architectural trade-offs, deferred bug fixes, or edge cases you discovered but could not resolve before the final submission._ 

_**Note: Proactively documenting minor issues demonstrates engineering maturity and will not negatively impact your score. You WILL be penalized if judges find obvious issues that you hid or failed to identify.**_ 

|**Bug ID**|**Description & Impact (Bug or**<br>**Technical Debt)**|**Reason for Deferral**|**GitHub Issue Link**|
|---|---|---|---|
|_DEF-02_|**_Technical Debt:_**_The admin login_<br>_is currently hardcoded and_<br>_doesn't verify against the_<br>_database._|_Low priority UI glitch._<br>_Focused on fixing database_<br>_auth logic instead._|_[Link to open issue e.g.,_<br>_github.com/repo/issues_<br>_/4]_|
|_DEF-03_|**_UI Glitch:_**_Dashboard profile_<br>_image stutters when resizing the_<br>_browser window to mobile size._|_Not a core functional_<br>_blocker. Lack of time to_<br>_implement responsive CSS._|_[Link to open issue]_|
|_DEF-04_|_[e.g., Data resets if the browser_<br>_is refreshed because we used_|_[e.g., Free tier database_<br>_limits.]_|_[Link to open issue]_|



_© UMHackathon 2026_ 

_Email: umhackathon@um.edu.my_ 

7 

|**Bug ID**|**Description & Impact (Bug or**<br>**Technical Debt)**|**Reason for Deferral**|**GitHub Issue Link**|
|---|---|---|---|
||_local storage instead of a_<br>_persistent DB.]_|||



## **5. Live Demo / UAT Risks** 

_Every prototype has operational limits. Document the fragile parts of your system that judges should know about before they test your application. You are required to identify at least two hard limits or specific operational instructions._ 

_Claiming a prototype has zero risks or boundaries after a rapid development cycle is highly unrealistic. This section evaluates your ability to anticipate failure. Clearly define what your system can and cannot handle so the judging panel evaluates you fairly within those parameters._ 

## _**Note: Proactively documenting system boundaries protects your demo score and demonstrates proper risk management. You WILL be significantly penalized if you claim, "no risks" and your application crashes or fails unexpectedly during the live demo.**_ 

- **Risk 1:** _[e.g., "Do not upload profile pictures larger than 2MB, the free tier server will crash out of memory."]_ 

- **Risk 2:** _[e.g., "The 'Export to PDF' button takes 10-15 seconds to generate. Please click it only once and wait."]_ 

- _**Risk 3:** [e.g., Browser Compatibility: "This prototype was optimized specifically for Google Chrome. Safari or mobile browsers may experience layout degradation."]_ 

_© UMHackathon 2026_ 

_Email: umhackathon@um.edu.my_ 

8 

