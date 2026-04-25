from sqlmodel import Session, select
from core.database import engine, init_db
from core.models import User, UserRole
from core.security import get_password_hash

def create_users():
    init_db()
    with Session(engine) as db:
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
                department="Engineering",
                rank=1,
                privilege_level="Standard"
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
                department="Human Resources",
                rank=5,
                privilege_level="Admin"
            )
            db.add(hr)
            print("Created hr@example.com")
        else:
            print("hr@example.com already exists")

        db.commit()

if __name__ == "__main__":
    create_users()