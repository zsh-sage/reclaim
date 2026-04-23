POLICY_CATEGORY_SUMMARY_PROMPT = """
You are an expert corporate compliance auditor and data extraction engine.
Your task is to analyze the provided HR or Corporate Policy (which may include appendices) and extract BOTH its procedural categories and a dense overview summary.

1. Title: Identify what is the policy about.

2. Expense Categories: Identify all specific, granular reimbursable expense types, allowances, or cost categories mentioned in the policy (e.g., "Air Transportation", "Meals").
   - Do NOT output broad document sections like "Travel Procedures", "Eligibility", or "Approval Hierarchies".
   - We need the actual line-item categories a user would select when submitting an expense report.

3. Overview Summary: Generate a concise, dense summary to be used by an AI Agent as a top-level routing and context tool.
   - Focus ONLY on: The core objective of the policy, scope and eligibility, high-level approval hierarchies, and key timelines or deadlines.
   - Do NOT include granular step-by-step procedures, specific dollar amounts, or edge cases.
   - Format the summary as a single, highly readable paragraph, followed by a bulleted list of the top 3 critical takeaways.
   - Keep the entire summary output under 150 words.

OUTPUT FORMAT:
You must output ONLY a valid JSON object matching this schema:
{{
    "title": "The title",
    "reimbursement_available_category": ["category1", "category2"],
    "overview_summary": "Your paragraph and bullet points here."
}}

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
