from app.core.config import settings
from sqlmodel import create_engine, Session

# Fallback URL assumes local development if environment variables aren't set.
# Change 'postgres', 'password', and 'db:5432' to match your Docker setup.
DATABASE_URL = settings.DATABASE_URL

# echo=True prints out the raw SQL to your console (helpful for debugging)
engine = create_engine(DATABASE_URL, echo=True)

def get_session():
    """Dependency for getting a database session."""
    with Session(engine) as session:
        yield session

def init_db():
    """Creates tables if they don't exist. Run this on startup."""
    from app.db.base import SQLModel
    SQLModel.metadata.create_all(engine)