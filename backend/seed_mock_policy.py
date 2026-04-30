"""Seed the Business Travel Policy with all 22 reimbursable categories."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from uuid import uuid4
from datetime import datetime, timezone

from sqlmodel import Session, select
from core.database import engine, init_db
from core.models import Policy, PolicyReimbursableCategory, User
from core.enums import PolicyStatus


POLICY_ALIAS = "BTP-2024"
POLICY_TITLE = "Daily Trip Allowance Policy (MOCK UP DATA, DON'T USE)"

REIMBURSABLE_CATEGORIES = [
    "Daily Trip Allowance (Diem Allowance)",
    "Accommodations",
    "Internet Expenses",
    "Telephone (Business & Private Calls)",
    "Laundry",
    "Toll Expenses",
]

OVERVIEW_SUMMARY = """The Daily Trip Allowance Policy (DTAP) governs the provision of daily allowances to employees undertaking business travel. It defines the entitlements, reimbursement procedures, and documentation requirements to ensure cost-effective and compliant travel expenses. The policy applies to both domestic and international business travel, with specific provisions for calculating allowances based on travel duration and employee job grade. Key aspects include approval requirements, cash advance procedures, and responsibilities for both employees and line managers. The policy aims to ensure fair and consistent compensation for travel-related expenses while maintaining fiscal responsibility."""

import json as _json

MANDATORY_CONDITIONS = _json.dumps({
    "Daily Trip Allowance (Diem Allowance)": {
        "condition": [
            "Calculated based on duration of trip according to employee entitlement based on job grade",
            "Departure time before 12.00 p.m. and/or arrival time after 12.00 p.m. shall be calculated as 1 full day trip",
            "Departure time after 12.00 p.m. and/or arrival time before 12.00 p.m. shall be calculated as a half day",
            "Employees conducting Business Travel with categorization as half day trip will only be entitled for 50% of the standard daily allowance",
        ],
    },
    "Accommodations": {
        "condition": [
            "Employees may accept a room upgrade if the upgrade is at no additional cost to Company",
            "Only Employee with grade 9 and above entitle to reserve a single occupancy during a group Business Travel",
            "Employees may using the same hotel based on Regulatory/Government/VVIP recommendation along with the approval from President Director",
        ],
    },
    "Internet Expenses": {
        "condition": [
            "Full reimbursement for Employee with grade 8 and above",
        ],
    },
    "Telephone (Business & Private Calls)": {
        "condition": [
            "Full reimbursement for Employee with grade 8 and above",
        ],
    },
    "Laundry": {
        "condition": [
            "Full reimbursement for Employee with grade 8 and above, minimum 3 days trip and maximum 2 sets",
        ],
    },
    "Toll Expenses": {
        "condition": [
            "Full reimbursement for Employee with grade 8 and above",
        ],
    },
})


def seed():
    init_db()
    with Session(engine) as db:
        # Find an HR user to be the policy creator
        creator = db.exec(select(User).where(User.role == "HR")).first()
        if not creator:
            creator = db.exec(select(User)).first()
        if not creator:
            print("No users found. Run seed_demo_employees.py first.")
            return

        # Check if policy already exists
        existing = db.exec(select(Policy).where(Policy.alias == POLICY_ALIAS)).first()
        if existing:
            print(f"Policy '{POLICY_ALIAS}' already exists: {existing.policy_id}")
            return

        policy = Policy(
            policy_id=uuid4(),
            alias=POLICY_ALIAS,
            title=POLICY_TITLE,
            effective_date=datetime(2026, 4, 21, 4, 49, 9, tzinfo=timezone.utc),
            expiry_date=None,
            overview_summary=OVERVIEW_SUMMARY,
            mandatory_conditions=MANDATORY_CONDITIONS,
            source_file_url="/storage/policies/Example Policy.pdf | /storage/policies/Appendix1.pdf",
            status=PolicyStatus.ACTIVE,
            created_by=creator.user_id,
            created_at=datetime(2026, 4, 21, 4, 49, 9, tzinfo=timezone.utc),
        )
        db.add(policy)
        db.flush()

        for cat in REIMBURSABLE_CATEGORIES:
            prc = PolicyReimbursableCategory(
                id=uuid4(),
                policy_id=policy.policy_id,
                category=cat,
            )
            db.add(prc)

        db.commit()
        print(f"Seeded policy {policy.policy_id}: {policy.title}")
        print(f"   Categories: {len(REIMBURSABLE_CATEGORIES)}")


if __name__ == "__main__":
    seed()
