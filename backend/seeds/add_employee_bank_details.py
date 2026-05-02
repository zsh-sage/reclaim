"""Add bank details to employee@example.com - run this to update existing database"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from sqlmodel import Session, select
from core.database import engine
from core.models import User

with Session(engine) as db:
    employee = db.exec(select(User).where(User.email == "employee@example.com")).first()
    if employee:
        employee.bank_code = "MY_MAYBANK"
        employee.bank_account_number = "1234567890"
        employee.bank_account_holder_name = "Demo Employee"
        db.add(employee)
        db.commit()
        print(f"✓ Added bank details to {employee.name}")
        print(f"  Bank: Maybank (MY_MAYBANK)")
        print(f"  Account: 1234567890")
        print(f"  Holder: Demo Employee")
    else:
        print("✗ Employee not found")
