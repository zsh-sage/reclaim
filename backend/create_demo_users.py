from sqlmodel import Session, select
from core.database import engine
from core.models import User, Department
from core.enums import UserRole, PrivilegeLevel
from core.security import get_password_hash


def create_users():
    with Session(engine) as db:
        # Create Engineering department if not exists
        dept = db.exec(select(Department).where(Department.name == "Engineering")).first()
        if not dept:
            dept = Department(name="Engineering", cost_center_code="ENG001")
            db.add(dept)
            db.flush()
            print("Created Engineering department")

        # Create Human Resources department if not exists
        hr_dept = db.exec(select(Department).where(Department.name == "Human Resources")).first()
        if not hr_dept:
            hr_dept = Department(name="Human Resources", cost_center_code="HR001")
            db.add(hr_dept)
            db.flush()
            print("Created Human Resources department")

        # Check and create Employee
        statement = select(User).where(User.email == "employee@example.com")
        employee = db.exec(statement).first()
        if not employee:
            employee = User(
                user_code="SWE123",
                email="employee@example.com",
                hashed_password=get_password_hash("password"),
                name="Demo Employee",
                role=UserRole.Employee,
                department_id=dept.department_id,
                rank=1,
                privilege_level=PrivilegeLevel.Standard,
                is_active=True,
            )
            db.add(employee)
            print("Created employee@example.com")
        else:
            print("employee@example.com already exists")

        # Check and create HR
        statement = select(User).where(User.email == "hr@example.com")
        hr = db.exec(statement).first()
        if not hr:
            hr = User(
                user_code="HR001",
                email="hr@example.com",
                hashed_password=get_password_hash("password"),
                name="Demo HR",
                role=UserRole.HR,
                department_id=hr_dept.department_id,
                rank=5,
                privilege_level=PrivilegeLevel.Standard,
                is_active=True,
            )
            db.add(hr)
            print("Created hr@example.com")
        else:
            print("hr@example.com already exists")

        db.commit()


if __name__ == "__main__":
    create_users()
