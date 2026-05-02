import os
from sqlmodel import create_engine, Session, SQLModel
from sqlalchemy import text as sql_text, inspect
from core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
)

# Compute backend root for locating alembic.ini regardless of CWD
_backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ALEMBIC_INI = os.path.join(_backend_root, "alembic.ini")


def init_db():
    """Apply schema changes safely in any environment (dev/Docker/production).

    Strategy:
      - Fresh DB (no tables):     create_all from models + alembic stamp head
      - Existing DB (tracked):    alembic upgrade head (apply pending migrations)
      - Existing DB (untracked):  alembic stamp head (acknowledge current state,
                                  then future migrations will apply correctly)

    This replaces the old create_all-only approach which conflicted with Alembic.
    """
    from core import models  # noqa: F811

    # pgvector extension must exist before any Vector column operations
    with engine.connect() as conn:
        conn.execute(sql_text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    from alembic.config import Config as AlembicConfig
    from alembic import command

    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    has_tables = bool(table_names)
    has_alembic = "alembic_version" in table_names

    alembic_cfg = AlembicConfig(_ALEMBIC_INI)

    if not has_tables:
        # Brand-new database — bootstrap with full model schema + stamp
        SQLModel.metadata.create_all(engine)
        command.stamp(alembic_cfg, "head")
    elif not has_alembic:
        # Tables exist but Alembic never tracked this DB (old create_all-only flow)
        command.stamp(alembic_cfg, "head")
    else:
        # Normal path — apply any pending migrations
        command.upgrade(alembic_cfg, "head")
