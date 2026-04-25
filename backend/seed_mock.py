"""Seed one mock reimbursement into the database."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from uuid import uuid4
from datetime import datetime, timezone

from sqlmodel import Session, select
from core.database import engine, init_db
from core.models import User, Reimbursement, LineItem, ReimbursementSubCategory
from core.enums import JudgmentResult, ReimbursementStatus


def seed():
    init_db()
    with Session(engine) as db:
        # Find the first Employee user to attach the reimbursement to
        user = db.exec(select(User)).first()
        if not user:
            print("No users found. Create a user first (register via /api/v1/auth/register).")
            return

        # Check if we already seeded
        existing = db.exec(select(Reimbursement).where(Reimbursement.user_id == user.user_id)).first()
        if existing:
            print(f"Reimbursement already exists for user {user.email}: {existing.reim_id}")
            return

        reim = Reimbursement(
            reim_id=uuid4(),
            user_id=user.user_id,
            policy_id=None,
            main_category="Business Travel Policy",
            currency="USD",
            total_claimed_amount=850.00,
            judgment=JudgmentResult.APPROVED,
            status=ReimbursementStatus.APPROVED,
            ai_reasoning={
                "model": "ilmu-glm-5.1",
                "policy_refs": [],
                "reasoning": "Economy class flight within policy limits",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
            summary="Economy class flight from San Francisco to New York for Q4 client meeting. Receipt and boarding pass verified. Amount within policy limits.",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(reim)
        db.flush()

        # Create line item
        line_item = LineItem(
            line_item_id=uuid4(),
            reim_id=reim.reim_id,
            description="Delta Airlines flight SFO->JFK",
            category="Air Transportation",
            claimed_amount=850.00,
            approved_amount=850.00,
            currency="USD",
            judgment=JudgmentResult.APPROVED,
            rejection_reason=None,
        )
        db.add(line_item)

        # Create sub category
        sub_cat = ReimbursementSubCategory(
            id=uuid4(),
            reim_id=reim.reim_id,
            sub_category="Air Transportation",
        )
        db.add(sub_cat)

        db.commit()
        print(f"Seeded reimbursement {reim.reim_id} for user {user.email}")
        print(f"   Category: {reim.main_category}")
        print(f"   Amount: {reim.currency} {reim.total_claimed_amount}")
        print(f"   Status: {reim.status}")


if __name__ == "__main__":
    seed()
