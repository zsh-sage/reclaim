POLICY_CATEGORY_SUMMARY_PROMPT = """
You are an expert corporate compliance auditor and data extraction engine.
Your task is to analyze the provided HR or Corporate Policy (which may include appendices) and extract BOTH its procedural categories and a dense overview summary.

1. Title: Identify what is the policy about.

2. Expense Categories: Identify all specific, granular reimbursable expense types, allowances, or cost categories mentioned in the policy (e.g., "Air Transportation", "Meals").
   - Do NOT output broad document sections like "Travel Procedures", "Eligibility", or "Approval Hierarchies".
   - We need the actual line-item categories a user would select when submitting an expense report.
   - For each category, extract the auto-approval budget if explicitly mentioned in the policy (as a number without currency symbol).
   - If no budget limit is mentioned for a category, set auto_approval_budget to null.

3. Overview Summary: Generate a concise, dense summary to be used by an AI Agent as a top-level routing and context tool.
   - Focus ONLY on: The core objective of the policy, scope and eligibility, high-level approval hierarchies, and key timelines or deadlines.
   - Do NOT include granular step-by-step procedures, specific dollar amounts, or edge cases.
   - Format the summary as a single, highly readable paragraph, followed by a bulleted list of the top 3 critical takeaways.
   - Keep the entire summary output under 150 words.

OUTPUT FORMAT:
You must output ONLY a valid JSON object matching this schema:
{{
    "title": "The title",
    "reimbursement_available_category": [
        {{"category": "Air Transportation", "auto_approval_budget": 500}},
        {{"category": "Meals", "auto_approval_budget": null}},
        {{"category": "Accommodation", "auto_approval_budget": 1500}}
    ],
    "overview_summary": "Your paragraph and bullet points here."
}}

IMPORTANT:
- If the policy specifies a monetary limit for a category (e.g., "maximum RM 500 per night"), extract it as auto_approval_budget (as a number, not including currency).
- If no limit is mentioned, set auto_approval_budget to null.
- Do NOT invent budgets - use null when not explicitly stated in the policy.

Unified Policy Text:
{text}
"""

POLICY_CONDITIONS_PROMPT = """
For the categories identified, extract the mandatory constraints from the unified policy text.

Conditions: Extract ONLY strict, mandatory constraints (e.g., "must", "shall", numerical limits, time limits, deadlines).

Target Categories: {categories}

Unified Policy Text:
{text}

OUTPUT FORMAT:
You must output ONLY a valid JSON object. Do not include markdown formatting, conversational filler, or internal scratchpads.
Your JSON must match this exact schema structure:
{{
    "procedures": {{
        "Category Name" : {{
            "condition": [
                "Condition 1",
                "Condition 2"
            ]
        }}
    }}
}}
"""
