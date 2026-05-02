"""add auto approval budget to policy reimbursable categories

Revision ID: de1ad2be3cf4
Revises: cb6ce2252fcc
Create Date: 2026-05-02 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker


# revision identifiers, used by Alembic.
revision: str = 'de1ad2be3cf4'
down_revision: Union[str, None] = 'cb6ce2252fcc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make embedding column in policy_sections nullable
    op.alter_column(
        'policy_sections',
        'embedding',
        nullable=True
    )

    # Add the auto_approval_budget column
    op.add_column(
        'policy_reimbursable_categories',
        sa.Column('auto_approval_budget', sa.Numeric(precision=12, scale=2), nullable=True)
    )

    # Backfill existing categories with intelligent defaults
    # Get database connection and session
    bind = op.get_bind()
    Session = sessionmaker(bind=bind)
    session = Session()

    try:
        # Fetch all categories
        result = session.execute(sa.text("""
            SELECT id, category, policy_id
            FROM policy_reimbursable_categories
        """))

        rows = result.fetchall()

        # Update each category with intelligent defaults
        for row in rows:
            category_id = row[0]
            category_name = row[1]
            cat_lower = category_name.lower()

            # Determine default budget based on category name
            if any(k in cat_lower for k in ['accommod', 'hotel', 'lodging']):
                default_budget = 500.0
            elif any(k in cat_lower for k in ['meal', 'food', 'dinner', 'lunch', 'breakfast']):
                default_budget = 100.0
            elif any(k in cat_lower for k in ['transport', 'travel', 'taxi', 'flight', 'bus', 'train']):
                default_budget = 200.0
            else:
                default_budget = 50.0

            # Update the category with default budget
            session.execute(sa.text("""
                UPDATE policy_reimbursable_categories
                SET auto_approval_budget = :budget
                WHERE id = :id
            """), {"budget": default_budget, "id": category_id})

        session.commit()
    except Exception as e:
        session.rollback()
        raise e
    finally:
        session.close()


def downgrade() -> None:
    # Remove the auto_approval_budget column
    op.drop_column('policy_reimbursable_categories', 'auto_approval_budget')

    # Make embedding column in policy_sections NOT NULL again
    op.alter_column(
        'policy_sections',
        'embedding',
        nullable=False
    )
