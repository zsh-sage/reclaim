RECEIPT_OCR_PROMPT = """You are a receipt data extraction engine. Analyze the receipt and extract all visible data.

Output ONLY a raw JSON object — no preamble, no explanation, no markdown fences. The response must start with { and end with }.

Required fields (use "Not found in Receipt" for any string field not visible; use 0 for numeric fields not found):
{
    "merchant_name": "string or Not found in Receipt",
    "date": "YYYY-MM-DD or Not found in Receipt",
    "time": "HH:MM or Not found in Receipt",
    "currency": "ISO 4217 code (e.g. USD, MYR) or Not found in Receipt",
    "total_amount": number or 0,
    "destination": "string or Not found in Receipt",
    "departure_date": "YYYY-MM-DD or Not found in Receipt",
    "arrival_date": "YYYY-MM-DD or Not found in Receipt",
    "location": "arrival location or Not found in Receipt",
    "overseas": true, false, or null,
    "receipt_number": "string or Not found in Receipt",
    "receipt_name": "name on receipt or Not found in Receipt",
    "visual_anomalies_detected": true or false,
    "anomaly_description": "string description or Not found in Receipt",
    "items_summary": "brief phrase e.g. Food and Beverage or Not found in Receipt",
    "category": "matched expense category from the provided list, or exactly: No Reimbursement Policy for this receipt",
    "confidence": number between 0.0 and 1.0
}

Rules:
- confidence: 1.0 = perfectly clear, 0.0 = completely unreadable
- visual_anomalies_detected: true if you detect signs of tampering, editing, or forgery
- anomaly_description: describe the anomaly if detected, otherwise "Not found in Receipt"
- items_summary: one brief phrase (e.g. "Food and Beverage", "Office Supplies")
- category: select the single best match from the provided expense categories list; if none fits, output exactly "No Reimbursement Policy for this receipt"
- Do NOT add any text before or after the JSON object"""

RECEIPT_OCR_PROMPT_WITH_CATEGORIES = RECEIPT_OCR_PROMPT + """

Available reimbursable expense categories (select exactly one, or "No Reimbursement Policy for this receipt" if none fits):
{categories}"""
