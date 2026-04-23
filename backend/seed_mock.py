"""Seed one mock reimbursement into the database."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from uuid import uuid4
from decimal import Decimal
from datetime import datetime, timezone

from sqlmodel import Session, select
from core.database import engine, init_db
from core.models import User, Reimbursement

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
            sub_category="Air Transportation",
            employee_department=user.department or "Engineering",
            employee_rank=user.rank or 1,
            currency="USD",
            amount=Decimal("850.00"),
            judgment="APPROVED",
            status="Approved",
            chain_of_thought={
                "steps": [
                    "Receipt verified: Delta Airlines flight SFO→JFK",
                    "Amount $850.00 within economy class policy limit",
                    "Business travel pre-approved by manager",
                ]
            },
            summary="Economy class flight from San Francisco to New York for Q4 client meeting. Receipt and boarding pass verified. Amount within policy limits.",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(reim)
        db.commit()
        print(f"✅ Seeded reimbursement {reim.reim_id} for user {user.email}")
        print(f"   Category: {reim.main_category} / {reim.sub_category}")
        print(f"   Amount: {reim.currency} {reim.amount}")
        print(f"   Status: {reim.status}")

if __name__ == "__main__":
    seed()
