"""merge claim_drafts and normalize_schema heads

Revision ID: 62328b82ed1f
Revises: e2f3a4b5c6d7, 1e338ce32d1e
Create Date: 2026-04-30 15:27:08.547413

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '62328b82ed1f'
down_revision: Union[str, None] = ('e2f3a4b5c6d7', '1e338ce32d1e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
