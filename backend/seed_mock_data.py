"""Seed mock claims data from the old MOCK_BUNDLES into the normalized schema."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from uuid import uuid4, UUID
from datetime import datetime, timezone, date

from sqlmodel import Session, select
from core.database import engine, init_db
from core.models import (
    User, Policy, TravelSettlement, SettlementCategory, SettlementReceipt,
    SupportingDocument, Reimbursement, LineItem, ReimbursementSubCategory,
    Department,
)
from core.enums import JudgmentResult, ReimbursementStatus, DocumentClass


MOCK_BUNDLES = [
    {
        "employee_email": "sarah.jenkins@reclaim.my",
        "submitted_at": "2026-04-18T14:34:00+08:00",
        "travel_destination": "Singapore",
        "travel_purpose": "Q2 Client Pitch — Acme Corp Singapore",
        "departure_date": "2026-04-16",
        "arrival_date": "2026-04-18",
        "is_overseas": True,
        "currency": "MYR",
        "total_claimed_amount": 1430.00,
        "total_approved_amount": 1150.00,
        "total_rejected_amount": 280.00,
        "overall_judgment": "PARTIAL",
        "confidence": 0.92,
        "summary": "Bundle partially approved. Accommodation exceeded rank limit; one transportation receipt rejected for late submission.",
        "status": "REVIEW",
        "line_items": [
            {"description": "Client dinner at Sushi Zanmai, Orchard Road", "category": "meals", "claimed_amount": 150.00, "approved_amount": 150.00, "judgment": "APPROVED"},
            {"description": "Taxi to KLIA", "category": "transportation", "claimed_amount": 80.00, "approved_amount": 0.00, "judgment": "REJECTED", "rejection_reason": "Receipt date is over 6 months old. Policy requires submission within 90 days."},
            {"description": "Hilton Hotel Singapore (2 nights)", "category": "accommodation", "claimed_amount": 1200.00, "approved_amount": 1000.00, "judgment": "PARTIAL", "rejection_reason": "Policy caps accommodation for Rank 2 employees at MYR 500/night. Capped at MYR 1,000 for 2 nights."},
        ],
    },
    {
        "employee_email": "emma.larson@reclaim.my",
        "submitted_at": "2026-04-20T16:50:00+08:00",
        "travel_destination": "Penang",
        "travel_purpose": "Regional Sales Conference & Client Entertainment",
        "departure_date": "2026-04-19",
        "arrival_date": "2026-04-20",
        "is_overseas": False,
        "currency": "MYR",
        "total_claimed_amount": 2640.00,
        "total_approved_amount": 380.00,
        "total_rejected_amount": 2260.00,
        "overall_judgment": "PARTIAL",
        "confidence": 0.31,
        "summary": "High fraud risk: one receipt amount is 10× higher than AI extraction. Alcohol detected on the same receipt. Two line items rejected.",
        "status": "REVIEW",
        "line_items": [
            {"description": "Client dinner at Ferringhi Garden Restaurant", "category": "meals", "claimed_amount": 2200.00, "approved_amount": 0.00, "judgment": "REJECTED", "rejection_reason": "Receipt contains alcohol charges (MYR 480). Policy prohibits alcohol reimbursement. Amount edited by employee: AI extracted MYR 220.00, employee submitted MYR 2,200.00 (10× discrepancy)."},
            {"description": "Hard Rock Hotel Penang (1 night)", "category": "accommodation", "claimed_amount": 380.00, "approved_amount": 380.00, "judgment": "APPROVED"},
            {"description": "Grab car KL to Penang (inter-city)", "category": "transportation", "claimed_amount": 60.00, "approved_amount": 0.00, "judgment": "REJECTED", "rejection_reason": "Inter-city travel must use approved vendor or company vehicle. Grab not approved for this route."},
        ],
    },
    {
        "employee_email": "james.okafor@reclaim.my",
        "submitted_at": "2026-04-24T09:11:00+08:00",
        "travel_destination": "Johor Bahru",
        "travel_purpose": "Site inspection — Q2 logistics audit",
        "departure_date": "2026-04-23",
        "arrival_date": "2026-04-24",
        "is_overseas": False,
        "currency": "MYR",
        "total_claimed_amount": 1150.00,
        "total_approved_amount": 1150.00,
        "total_rejected_amount": 0.00,
        "overall_judgment": "APPROVED",
        "confidence": 0.98,
        "summary": "All 3 receipts verified and within policy limits. No edits detected. AI recommends full approval.",
        "status": "APPROVED",
        "line_items": [
            {"description": "Team lunch at R&R Seremban", "category": "meals", "claimed_amount": 89.00, "approved_amount": 89.00, "judgment": "APPROVED"},
            {"description": "Petronas petrol — company vehicle", "category": "transportation", "claimed_amount": 120.00, "approved_amount": 120.00, "judgment": "APPROVED"},
            {"description": "Hotel Seri Malaysia JB (1 night)", "category": "accommodation", "claimed_amount": 941.00, "approved_amount": 941.00, "judgment": "APPROVED"},
        ],
    },
    {
        "employee_email": "liu.wei@reclaim.my",
        "submitted_at": "2026-04-23T13:45:00+08:00",
        "travel_destination": "Kuala Lumpur (Local)",
        "travel_purpose": "Client lunch — TechCorp Malaysia",
        "departure_date": "2026-04-23",
        "arrival_date": "2026-04-23",
        "is_overseas": False,
        "currency": "MYR",
        "total_claimed_amount": 210.50,
        "total_approved_amount": 210.50,
        "total_rejected_amount": 0.00,
        "overall_judgment": "APPROVED",
        "confidence": 0.96,
        "summary": "Both receipts verified. Amounts within daily meal and transport limits. Passed all policy checks.",
        "status": "APPROVED",
        "line_items": [
            {"description": "Business lunch at Nobu KLCC", "category": "meals", "claimed_amount": 168.00, "approved_amount": 168.00, "judgment": "APPROVED"},
            {"description": "Grab — KLCC to office", "category": "transportation", "claimed_amount": 42.50, "approved_amount": 42.50, "judgment": "APPROVED"},
        ],
    },
]


def parse_date(s: str) -> date | None:
    if not s:
        return None
    return datetime.strptime(s, "%Y-%m-%d").date()


def seed():
    init_db()
    with Session(engine) as db:
        policy = db.exec(select(Policy).where(Policy.alias == "BTP-2024")).first()
        if not policy:
            print("Business Travel Policy not found. Run seed_mock_policy.py first.")
            return

        for bundle in MOCK_BUNDLES:
            user = db.exec(select(User).where(User.email == bundle["employee_email"])).first()
            if not user:
                print(f"User not found: {bundle['employee_email']} — skipping bundle")
                continue

            # Check if this user already has a reimbursement with this summary
            existing = db.exec(
                select(Reimbursement).where(
                    Reimbursement.user_id == user.user_id,
                    Reimbursement.summary == bundle["summary"],
                )
            ).first()
            if existing:
                print(f"Reimbursement already exists for {user.email}: {existing.reim_id}")
                continue

            # 1. TravelSettlement
            settlement = TravelSettlement(
                settlement_id=uuid4(),
                user_id=user.user_id,
                main_category="Business Travel Policy",
                destination=bundle["travel_destination"],
                departure_date=parse_date(bundle["departure_date"]),
                arrival_date=parse_date(bundle["arrival_date"]),
                overseas=bundle["is_overseas"],
                purpose=bundle["travel_purpose"],
                currency=bundle["currency"],
                total_claimed_amount=bundle["total_claimed_amount"],
                total_approved_amount=bundle["total_approved_amount"],
                total_rejected_amount=bundle["total_rejected_amount"],
            )
            db.add(settlement)
            db.flush()

            # 2. SettlementCategories
            cats = set()
            for li in bundle["line_items"]:
                cats.add(li["category"])
            for cat in cats:
                db.add(SettlementCategory(id=uuid4(), settlement_id=settlement.settlement_id, category=cat))

            # 3. SupportingDocuments + SettlementReceipts
            doc_ids = []
            for li in bundle["line_items"]:
                doc = SupportingDocument(
                    document_id=uuid4(),
                    settlement_id=settlement.settlement_id,
                    user_id=user.user_id,
                    name=li["description"],
                    path=f"/storage/documents/{user.user_id}/{uuid4()}.jpg",
                    type="image/jpeg",
                    is_main=True,
                    document_class=DocumentClass.RECEIPT,
                    extracted_data={
                        "merchant_name": li["description"],
                        "category": li["category"],
                        "amount": li["claimed_amount"],
                    },
                )
                db.add(doc)
                db.flush()
                doc_ids.append(doc.document_id)

                receipt = SettlementReceipt(
                    receipt_id=uuid4(),
                    settlement_id=settlement.settlement_id,
                    document_id=doc.document_id,
                    merchant_name=li["description"],
                    claimed_amount=li["claimed_amount"],
                    currency=bundle["currency"],
                    category=li["category"],
                )
                db.add(receipt)

            # 4. Reimbursement
            judgment_map = {
                "APPROVED": JudgmentResult.APPROVED,
                "REJECTED": JudgmentResult.REJECTED,
                "PARTIAL": JudgmentResult.PARTIAL,
                "NEEDS_INFO": JudgmentResult.NEEDS_INFO,
            }
            status_map = {
                "PENDING": ReimbursementStatus.PENDING,
                "REVIEW": ReimbursementStatus.REVIEW,
                "APPROVED": ReimbursementStatus.APPROVED,
                "REJECTED": ReimbursementStatus.REJECTED,
            }

            reim = Reimbursement(
                reim_id=uuid4(),
                user_id=user.user_id,
                policy_id=policy.policy_id,
                settlement_id=settlement.settlement_id,
                main_category="Business Travel Policy",
                currency=bundle["currency"],
                total_claimed_amount=bundle["total_claimed_amount"],
                total_approved_amount=bundle["total_approved_amount"],
                total_rejected_amount=bundle["total_rejected_amount"],
                judgment=judgment_map.get(bundle["overall_judgment"], JudgmentResult.PARTIAL),
                confidence=bundle["confidence"],
                ai_reasoning={
                    "model": "ilmu-glm-5.1",
                    "policy_refs": [],
                    "reasoning": bundle["summary"],
                },
                summary=bundle["summary"],
                status=status_map.get(bundle["status"], ReimbursementStatus.REVIEW),
            )
            db.add(reim)
            db.flush()

            # 5. LineItems
            for li, doc_id in zip(bundle["line_items"], doc_ids):
                line_item = LineItem(
                    line_item_id=uuid4(),
                    reim_id=reim.reim_id,
                    document_id=doc_id,
                    description=li["description"],
                    category=li["category"],
                    claimed_amount=li["claimed_amount"],
                    approved_amount=li["approved_amount"],
                    currency=bundle["currency"],
                    judgment=judgment_map.get(li["judgment"], JudgmentResult.PARTIAL),
                    rejection_reason=li.get("rejection_reason"),
                )
                db.add(line_item)

            # 6. ReimbursementSubCategories
            for cat in cats:
                db.add(ReimbursementSubCategory(id=uuid4(), reim_id=reim.reim_id, sub_category=cat))

            db.commit()
            print(f"Seeded bundle for {user.name}: {reim.reim_id}")

        print("\nDone.")


if __name__ == "__main__":
    seed()
