from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text as sql_text
from core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
)

def init_db():
    """Creates tables if they don't exist. Run this on startup."""
    from core import models
    # pgvector extension must exist before Vector columns can be created
    with engine.connect() as conn:
        conn.execute(sql_text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    SQLModel.metadata.create_all(engine)
