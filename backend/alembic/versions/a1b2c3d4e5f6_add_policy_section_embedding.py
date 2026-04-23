"""Add embedding vector column to policy_sections

Revision ID: a1b2c3d4e5f6
Revises: fbf2632e7f92
Create Date: 2026-04-24 04:22:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'fbf2632e7f92'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure pgvector extension exists
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # Add the embedding column (nullable so existing rows aren't broken)
    op.add_column(
        'policy_sections',
        sa.Column('embedding', Vector(1536), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('policy_sections', 'embedding')
