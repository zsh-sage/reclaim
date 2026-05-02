"""Seed demo employees and departments into the database."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from sqlmodel import Session, select
from core.database import engine, init_db
from core.models import User, Department
from core.enums import UserRole, PrivilegeLevel
from core.security import get_password_hash


DEPARTMENTS = [
    ("Engineering", "ENG001"),
    ("Human Resources", "HR001"),
    ("Sales", "SAL001"),
    ("Marketing", "MKT001"),
    ("Finance", "FIN001"),
    ("Operations", "OPS001"),
    ("Legal", "LEG001"),
    ("Product & Engineering", "PNE001"),
]

EMPLOYEES = [
    # (email, name, role, department_name, rank, privilege_level, user_code)
    ("employee@example.com", "Demo Employee", UserRole.Employee, "Engineering", 1, PrivilegeLevel.Standard, "SWE123"),
    ("hr@example.com", "Demo HR", UserRole.HR, "Human Resources", 5, PrivilegeLevel.Standard, "HR001"),
    ("sarah.jenkins@reclaim.my", "Sarah Jenkins", UserRole.Employee, "Marketing", 4, PrivilegeLevel.Standard, "EMP-2041"),
    ("emma.larson@reclaim.my", "Emma Larson", UserRole.Employee, "Sales", 2, PrivilegeLevel.Standard, "EMP-1887"),
    ("michael.chen@reclaim.my", "Michael Chen", UserRole.Employee, "Engineering", 3, PrivilegeLevel.Standard, "EMP-3155"),
    ("daniel.reyes@reclaim.my", "Daniel Reyes", UserRole.Employee, "Finance", 3, PrivilegeLevel.Standard, "EMP-2291"),
    ("priya.nair@reclaim.my", "Priya Nair", UserRole.Employee, "Operations", 2, PrivilegeLevel.Standard, "EMP-4102"),
    ("james.okafor@reclaim.my", "James Okafor", UserRole.Employee, "Operations", 4, PrivilegeLevel.Standard, "EMP-3012"),
    ("liu.wei@reclaim.my", "Liu Wei", UserRole.Employee, "Sales", 4, PrivilegeLevel.Standard, "EMP-2788"),
    ("aisha.patel@reclaim.my", "Aisha Patel", UserRole.Employee, "Finance", 2, PrivilegeLevel.Standard, "EMP-1923"),
    ("noah.williams@reclaim.my", "Noah Williams", UserRole.Employee, "Engineering", 3, PrivilegeLevel.Standard, "EMP-3321"),
    ("mei.lin@reclaim.my", "Mei Lin", UserRole.Employee, "Marketing", 2, PrivilegeLevel.Standard, "EMP-2876"),
    ("samuel.adeyemi@reclaim.my", "Samuel Adeyemi", UserRole.Employee, "Human Resources", 3, PrivilegeLevel.Standard, "EMP-3055"),
    ("clara.hoffmann@reclaim.my", "Clara Hoffmann", UserRole.Employee, "Legal", 4, PrivilegeLevel.Standard, "EMP-2711"),
    ("alex.tan@reclaim.my", "Alex Tan Wei Ming", UserRole.Employee, "Product & Engineering", 5, PrivilegeLevel.Standard, "EMP-00421"),
]


def seed():
    init_db()
    with Session(engine) as db:
        # Create departments
        dept_map = {}
        for name, cost_code in DEPARTMENTS:
            dept = db.exec(select(Department).where(Department.name == name)).first()
            if not dept:
                dept = Department(name=name, cost_center_code=cost_code)
                db.add(dept)
                db.flush()
                print(f"Created department: {name}")
            else:
                print(f"Department exists: {name}")
            dept_map[name] = dept.department_id

        # Create employees
        for email, name, role, dept_name, rank, privilege, user_code in EMPLOYEES:
            existing = db.exec(select(User).where(User.email == email)).first()
            if existing:
                print(f"User exists: {email}")
                continue

            dept_id = dept_map.get(dept_name)
            user = User(
                user_code=user_code,
                email=email,
                hashed_password=get_password_hash("password"),
                name=name,
                role=role,
                department_id=dept_id,
                rank=rank,
                privilege_level=privilege,
                is_active=True,
                # Add bank details for demo employee
                bank_code="MY_MAYBANK" if email == "employee@example.com" else None,
                bank_account_number="1234567890" if email == "employee@example.com" else None,
                bank_account_holder_name="Demo Employee" if email == "employee@example.com" else None,
            )
            db.add(user)
            print(f"Created user: {email} ({name})")

        db.commit()
        print("\nDone.")


if __name__ == "__main__":
    seed()
