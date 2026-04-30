"""Add claim_drafts table

Revision ID: e2f3a4b5c6d7
Revises: 1e338ce32d1e
Create Date: 2026-04-29 19:00:00.000000

Changes:
- Create claim_drafts table for persisting incomplete claim sessions
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e2f3a4b5c6d7'
down_revision: Union[str, None] = '1e338ce32d1e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'claim_drafts',
        sa.Column('draft_id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('employees.user_id'), nullable=False, index=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('main_category', sa.String(), nullable=True),
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('travel_settlements.settlement_id'), nullable=True),
        sa.Column('draft_data', postgresql.JSONB(), server_default='{}', nullable=False),
        sa.Column('receipt_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('failed_receipt_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('claim_drafts')
