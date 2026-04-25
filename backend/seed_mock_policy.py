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
POLICY_TITLE = "Business Travel Policy"

REIMBURSABLE_CATEGORIES = [
    "Air Transportation",
    "Train",
    "Ferry",
    "Shuttle Bus",
    "Other Transportation",
    "Car Rental",
    "Personal Vehicle Usage",
    "Daily Trip Allowance (Diem Allowance)",
    "Accommodations",
    "Seaport/Airport Tax",
    "Travel Insurance",
    "Internet Expenses",
    "Telephone (Business & Private Calls)",
    "Laundry",
    "Minibar (Non-Alcohol)",
    "Parking",
    "Toll Expenses",
    "Client's Entertainment",
    "Inner City Transportation",
    "Intercity Transportation",
    "Remote Area Transportation",
    "Residence/Office to Airport Transportation",
]

OVERVIEW_SUMMARY = """The Business Travel Policy establishes standardized procedures and entitlements for employees undertaking business travel, both domestically and internationally. It outlines eligibility criteria, approval hierarchies, and reimbursement categories for transportation, accommodation, and daily allowances based on job grade. The policy emphasizes compliance with delegated authority parameters, proper documentation, and timely settlement of expenses. Key aspects include approval requirements, cash advance procedures, and responsibilities for both employees and line managers. The policy aims to ensure cost-effective and compliant business travel while providing clear guidelines for employees and managers.

- Approval required from Line Manager/Head Department for domestic travel and President Director for international travel.
- Daily allowances and accommodation standards vary by job grade, with specific rates for Zone 1 and Zone 2 domestic locations.
- Cash advances available for employees with job grade 7 and below, with settlement required within 14 calendar days post-travel."""

MANDATORY_CONDITIONS = """Air Transportation:
- Economy class for all employees (non-executives)
- Economy class refers to budget airline, except ticket issued 2 weeks prior departure may choose preferred airline
- Changing issued ticket to and from destination city will be subject to President Director approval

Train:
- Economy class for all employees (non-executives)

Ferry:
- Economy class for all employees (non-executives)

Shuttle Bus:
- Economy class for all employees (non-executives)

Other Transportation:
- Economy class for all employees (non-executives)

Car Rental:
- Approval from President Director required
- Conditions: less expensive than other transportation modes, for entertaining company customers, more than 3 employees traveling together, or using taxi is not a more practical option

Personal Vehicle Usage:
- Approval from BOD/Chief Department required
- Conditions: prior approved in writing by Line Manager, less expensive than hiring a car or taking a taxi, or more timely than taking public transportation

Daily Trip Allowance (Diem Allowance):
- Calculated based on duration of trip according to employee entitlement based on job grade
- Departure time before 12.00 p.m. and/or arrival time after 12.00 p.m. shall be calculated as 1 full day trip
- Departure time after 12.00 p.m. and/or arrival time before 12.00 p.m. shall be calculated as a half day
- Employees conducting Business Travel with categorization as half day trip will only be entitled for 50% of the standard daily allowance

Accommodations:
- Employees may accept a room upgrade if the upgrade is at no additional cost to Company
- Only Employee with grade 9 and above entitle to reserve a single occupancy during a group Business Travel
- Employees may using the same hotel based on Regulatory/Government/VVIP recommendation along with the approval from President Director

Seaport/Airport Tax:
- Reimbursement for Business Travel transportation costs covering seaport/airport tax

Travel Insurance:
- Reimbursement for Business Travel transportation costs covering travel insurance if applicable

Internet Expenses:
- Full reimbursement for Employee with grade 8 and above

Telephone (Business & Private Calls):
- Full reimbursement for Employee with grade 8 and above

Laundry:
- Full reimbursement for Employee with grade 8 and above, minimum 3 days trip and maximum 2 sets

Minibar (Non-Alcohol):
- Full reimbursement for Employee with grade 8 and above, non-alcohol only

Parking:
- Full reimbursement for Employee with grade 8 and above

Toll Expenses:
- Full reimbursement for Employee with grade 8 and above

Client's Entertainment:
- Refer to compliance regulation (Gifts and Entertainment Policy)

Inner City Transportation:
- Full reimbursement for Employee with grade 8 and above

Intercity Transportation:
- Full reimbursement for Employee with grade 8 and above, maximum MYR 90.00 per day for other intercity transportation mode in remote area

Remote Area Transportation:
- Full reimbursement for Employee with grade 8 and above, maximum MYR 90.00 per day for other intercity transportation mode in remote area

Residence/Office to Airport Transportation:
- Company will provide payment based on reimbursement of actual transportation costs"""


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
