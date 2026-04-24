"""Sync reimbursements table schema with model

Revision ID: d1e2f3a4b5c6
Revises: c7d8e9f0a1b2
Create Date: 2026-04-24 08:30:00.000000

Changes:
- Add settlement_id (UUID FK -> travel_settlements)
- Add totals (JSONB)
- Add line_items (JSONB)
- Add confidence (Float, nullable)
- Change sub_category from VARCHAR to JSONB
- Drop legacy amount column (replaced by totals)
- Drop legacy chain_of_thought column (replaced by summary/judgment)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd1e2f3a4b5c6'
down_revision: Union[str, None] = 'c7d8e9f0a1b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Add missing columns ---
    op.add_column(
        'reimbursements',
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        'fk_reimbursements_settlement_id',
        'reimbursements', 'travel_settlements',
        ['settlement_id'], ['settlement_id'],
    )

    op.add_column(
        'reimbursements',
        sa.Column('totals', postgresql.JSONB(), nullable=True, server_default='{}'),
    )
    op.add_column(
        'reimbursements',
        sa.Column('line_items', postgresql.JSONB(), nullable=True, server_default='[]'),
    )
    op.add_column(
        'reimbursements',
        sa.Column('confidence', sa.Float(), nullable=True),
    )

    # --- Fix sub_category: VARCHAR -> JSONB ---
    # Cast existing string values into a single-element JSON array where possible
    op.execute(
        """
        ALTER TABLE reimbursements
        ALTER COLUMN sub_category TYPE jsonb
        USING CASE
            WHEN sub_category IS NULL THEN '[]'::jsonb
            ELSE to_jsonb(ARRAY[sub_category])
        END
        """
    )

    # --- Drop legacy columns no longer in the model ---
    op.drop_column('reimbursements', 'amount')
    op.drop_column('reimbursements', 'chain_of_thought')


def downgrade() -> None:
    # Restore legacy columns
    op.add_column(
        'reimbursements',
        sa.Column('amount', sa.Numeric(), nullable=True),
    )
    op.add_column(
        'reimbursements',
        sa.Column('chain_of_thought', postgresql.JSONB(), nullable=True),
    )

    # Revert sub_category back to VARCHAR (lossy — takes first element)
    op.execute(
        """
        ALTER TABLE reimbursements
        ALTER COLUMN sub_category TYPE varchar
        USING (sub_category->>0)
        """
    )

    # Remove added columns
    op.drop_constraint('fk_reimbursements_settlement_id', 'reimbursements', type_='foreignkey')
    op.drop_column('reimbursements', 'settlement_id')
    op.drop_column('reimbursements', 'totals')
    op.drop_column('reimbursements', 'line_items')
    op.drop_column('reimbursements', 'confidence')
