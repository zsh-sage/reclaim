from sqlmodel import create_engine, Session, SQLModel
from core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=True,
)

def get_session():
    """Dependency for getting a database session."""
    with Session(engine) as session:
        yield session

def init_db():
    """Creates tables if they don't exist. Run this on startup."""
    # Import models to ensure they are registered with SQLModel.metadata
    from core import models
    SQLModel.metadata.create_all(engine)