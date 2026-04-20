import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from core.database import AsyncSessionLocal
from core.models import User, UserRole
from core.security import get_password_hash

async def create_users():
    async with AsyncSessionLocal() as db:
        # Check and create Employee
        result = await db.execute(select(User).where(User.email == "employee@example.com"))
        employee = result.scalars().first()
        if not employee:
            employee = User(
                email="employee@example.com",
                hashed_password=get_password_hash("password"),
                name="Demo Employee",
                role=UserRole.Employee,
                department="Engineering",
                privilege_level="Standard"
            )
            db.add(employee)
            print("Created employee@example.com")
        else:
            print("employee@example.com already exists")

        # Check and create HR
        result = await db.execute(select(User).where(User.email == "hr@example.com"))
        hr = result.scalars().first()
        if not hr:
            hr = User(
                email="hr@example.com",
                hashed_password=get_password_hash("password"),
                name="Demo HR",
                role=UserRole.HR,
                department="Human Resources",
                privilege_level="Admin"
            )
            db.add(hr)
            print("Created hr@example.com")
        else:
            print("hr@example.com already exists")

        await db.commit()

if __name__ == "__main__":
    asyncio.run(create_users())
