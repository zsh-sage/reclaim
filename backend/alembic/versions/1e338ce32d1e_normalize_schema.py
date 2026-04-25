"""normalize_schema

Revision ID: 1e338ce32d1e
Revises: d1e2f3a4b5c6
Create Date: 2026-04-25 16:19:00.121517

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '1e338ce32d1e'
down_revision: Union[str, None] = 'd1e2f3a4b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # 1. Create departments table
    # ============================================================
    op.create_table(
        'departments',
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('cost_center_code', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('department_id'),
        sa.UniqueConstraint('name')
    )

    # ============================================================
    # 2. Alter employees
    # ============================================================
    op.add_column('employees', sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_employees_department_id', 'employees', 'departments', ['department_id'], ['department_id'])
    op.add_column('employees', sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'))
    op.add_column('employees', sa.Column('created_at', sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE employees SET created_at = NOW() WHERE created_at IS NULL")
    op.alter_column('employees', 'created_at', nullable=False)
    op.alter_column('employees', 'privilege_level', nullable=False, server_default='Standard')
    op.create_index('ix_employees_user_code', 'employees', ['user_code'], unique=True)

    # ============================================================
    # 3. Alter policies
    # ============================================================
    op.add_column('policies', sa.Column('expiry_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('policies', sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_policies_created_by', 'policies', 'employees', ['created_by'], ['user_id'])
    op.alter_column('policies', 'status', nullable=False, server_default='ACTIVE')
    op.create_index('ix_policies_alias', 'policies', ['alias'], unique=True)

    # ============================================================
    # 4. Create policy_reimbursable_categories
    # ============================================================
    op.create_table(
        'policy_reimbursable_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('policy_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['policy_id'], ['policies.policy_id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('policy_id', 'category', name='uq_policy_category')
    )
    op.create_index('ix_policy_reimbursable_categories_policy_id', 'policy_reimbursable_categories', ['policy_id'], unique=False)

    # ============================================================
    # 5. Migrate Policy.reimbursable_category -> policy_reimbursable_categories
    # ============================================================
    op.execute("""
        INSERT INTO policy_reimbursable_categories (id, policy_id, category)
        SELECT gen_random_uuid(), policy_id, jsonb_array_elements_text(reimbursable_category)
        FROM policies
        WHERE reimbursable_category IS NOT NULL AND jsonb_array_length(reimbursable_category) > 0
    """)

    # ============================================================
    # 6. Drop reimbursable_category from policies
    # ============================================================
    op.drop_column('policies', 'reimbursable_category')

    # ============================================================
    # 7. Alter policy_sections
    # ============================================================
    op.add_column('policy_sections', sa.Column('section_title', sa.String(), nullable=True))
    op.add_column('policy_sections', sa.Column('section_order', sa.Integer(), nullable=True))
    op.create_index('ix_policy_sections_policy_id', 'policy_sections', ['policy_id'], unique=False)

    # ============================================================
    # 8. Alter travel_settlements
    # ============================================================
    op.add_column('travel_settlements', sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_travel_settlements_user_id', 'travel_settlements', 'employees', ['user_id'], ['user_id'])
    op.create_index('ix_travel_settlements_user_id', 'travel_settlements', ['user_id'], unique=False)

    op.add_column('travel_settlements', sa.Column('total_claimed_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('travel_settlements', sa.Column('total_approved_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('travel_settlements', sa.Column('total_rejected_amount', sa.Numeric(12, 2), nullable=True))

    # Change currency to String(3)
    op.alter_column('travel_settlements', 'currency', type_=sa.String(3), existing_nullable=True)
    # Change purpose to Text
    op.alter_column('travel_settlements', 'purpose', type_=sa.Text(), existing_nullable=True)

    # ============================================================
    # 9. Migrate travel_settlements data
    # ============================================================
    # Migrate totals JSONB -> flat columns
    op.execute("""
        UPDATE travel_settlements
        SET total_claimed_amount = COALESCE((totals->>'grand_total')::numeric, 0),
            total_approved_amount = NULL,
            total_rejected_amount = NULL
        WHERE totals IS NOT NULL AND totals != '{}'
    """)

    # Migrate employee_id -> user_id (employee_id was stored as string)
    op.execute("""
        UPDATE travel_settlements
        SET user_id = employee_id::uuid
        WHERE employee_id IS NOT NULL AND employee_id != ''
    """)

    # Migrate departure_date and arrival_date from string to date
    op.execute("""
        UPDATE travel_settlements
        SET departure_date = NULL
        WHERE departure_date = '' OR departure_date = 'Not found in Receipt'
    """)
    op.execute("""
        UPDATE travel_settlements
        SET arrival_date = NULL
        WHERE arrival_date = '' OR arrival_date = 'Not found in Receipt'
    """)
    op.execute("ALTER TABLE travel_settlements ALTER COLUMN departure_date TYPE date USING departure_date::date")
    op.execute("ALTER TABLE travel_settlements ALTER COLUMN arrival_date TYPE date USING arrival_date::date")

    # ============================================================
    # 10. Create settlement_categories
    # ============================================================
    op.create_table(
        'settlement_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['settlement_id'], ['travel_settlements.settlement_id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('settlement_id', 'category', name='uq_settlement_category')
    )
    op.create_index('ix_settlement_categories_settlement_id', 'settlement_categories', ['settlement_id'], unique=False)

    # ============================================================
    # 11. Migrate TravelSettlement.all_category -> settlement_categories
    # ============================================================
    op.execute("""
        INSERT INTO settlement_categories (id, settlement_id, category)
        SELECT gen_random_uuid(), settlement_id, jsonb_array_elements_text(all_category)
        FROM travel_settlements
        WHERE all_category IS NOT NULL AND jsonb_array_length(all_category) > 0
    """)

    # ============================================================
    # 12. Create settlement_receipts
    # ============================================================
    op.create_table(
        'settlement_receipts',
        sa.Column('receipt_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('settlement_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('merchant_name', sa.String(), nullable=True),
        sa.Column('receipt_date', sa.Date(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('claimed_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('currency', sa.String(3), nullable=True),
        sa.ForeignKeyConstraint(['settlement_id'], ['travel_settlements.settlement_id']),
        sa.ForeignKeyConstraint(['document_id'], ['supporting_documents.document_id']),
        sa.PrimaryKeyConstraint('receipt_id')
    )
    op.create_index('ix_settlement_receipts_settlement_id', 'settlement_receipts', ['settlement_id'], unique=False)

    # ============================================================
    # 13. Migrate TravelSettlement.receipts -> settlement_receipts
    # ============================================================
    op.execute("""
        INSERT INTO settlement_receipts (receipt_id, settlement_id, document_id, merchant_name, receipt_date, category, claimed_amount, currency)
        SELECT
            gen_random_uuid(),
            ts.settlement_id,
            NULLIF(rec->>'document_id', '')::uuid,
            rec->>'description',
            NULLIF(rec->>'date', '')::date,
            rec->>'category',
            NULLIF(rec->>'amount', '')::numeric,
            COALESCE(NULLIF(rec->>'currency', ''), ts.currency)
        FROM travel_settlements ts,
        LATERAL jsonb_array_elements(ts.receipts) AS rec
        WHERE ts.receipts IS NOT NULL AND jsonb_array_length(ts.receipts) > 0
    """)

    # ============================================================
    # 14. Drop circular FK and reimbursement_id from travel_settlements
    # ============================================================
    op.drop_constraint('fk_settlement_reim_id', 'travel_settlements', type_='foreignkey')
    op.drop_column('travel_settlements', 'reimbursement_id')

    # ============================================================
    # 15. Drop denormalized columns from travel_settlements
    # ============================================================
    op.drop_column('travel_settlements', 'employee_name')
    op.drop_column('travel_settlements', 'employee_id')
    op.drop_column('travel_settlements', 'employee_code')
    op.drop_column('travel_settlements', 'employee_department')
    op.drop_column('travel_settlements', 'employee_rank')
    op.drop_column('travel_settlements', 'all_category')
    op.drop_column('travel_settlements', 'receipts')
    op.drop_column('travel_settlements', 'totals')

    # ============================================================
    # 16. Alter reimbursements
    # ============================================================
    op.add_column('reimbursements', sa.Column('total_claimed_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('reimbursements', sa.Column('total_approved_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('reimbursements', sa.Column('total_rejected_amount', sa.Numeric(12, 2), nullable=True))
    op.add_column('reimbursements', sa.Column('ai_reasoning', postgresql.JSONB(), nullable=True, server_default='{}'))
    op.add_column('reimbursements', sa.Column('reviewed_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_reimbursements_reviewed_by', 'reimbursements', 'employees', ['reviewed_by'], ['user_id'])
    op.add_column('reimbursements', sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True))
    op.alter_column('reimbursements', 'currency', type_=sa.String(3), existing_nullable=False)
    op.alter_column('reimbursements', 'main_category', nullable=False)
    op.alter_column('reimbursements', 'judgment', nullable=False)
    op.alter_column('reimbursements', 'status', nullable=False, server_default='PENDING')
    op.create_index('ix_reimbursements_main_category', 'reimbursements', ['main_category'], unique=False)
    op.create_index('ix_reimbursements_status', 'reimbursements', ['status'], unique=False)

    # ============================================================
    # 17. Migrate Reimbursement.totals -> flat columns
    # ============================================================
    op.execute("""
        UPDATE reimbursements
        SET total_claimed_amount = COALESCE(
            (totals->>'total_requested')::numeric,
            (totals->>'grand_total')::numeric,
            0
        )
    """)
    op.alter_column('reimbursements', 'total_claimed_amount', nullable=False)

    # ============================================================
    # 18. Create reimbursement_sub_categories
    # ============================================================
    op.create_table(
        'reimbursement_sub_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reim_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sub_category', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['reim_id'], ['reimbursements.reim_id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('reim_id', 'sub_category', name='uq_reim_sub_category')
    )
    op.create_index('ix_reimbursement_sub_categories_reim_id', 'reimbursement_sub_categories', ['reim_id'], unique=False)

    # ============================================================
    # 19. Migrate Reimbursement.sub_category -> reimbursement_sub_categories
    # ============================================================
    op.execute("""
        INSERT INTO reimbursement_sub_categories (id, reim_id, sub_category)
        SELECT gen_random_uuid(), reim_id, jsonb_array_elements_text(sub_category)
        FROM reimbursements
        WHERE sub_category IS NOT NULL AND jsonb_array_length(sub_category) > 0
    """)

    # ============================================================
    # 20. Create line_items
    # ============================================================
    op.create_table(
        'line_items',
        sa.Column('line_item_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('reim_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=True, server_default='1.0'),
        sa.Column('unit_price', sa.Numeric(12, 2), nullable=True),
        sa.Column('claimed_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('approved_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('currency', sa.String(3), nullable=False),
        sa.Column('expense_date', sa.Date(), nullable=True),
        sa.Column('judgment', sa.String(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('policy_section_ref', postgresql.UUID(as_uuid=True), nullable=True),
        sa.ForeignKeyConstraint(['reim_id'], ['reimbursements.reim_id']),
        sa.ForeignKeyConstraint(['document_id'], ['supporting_documents.document_id']),
        sa.ForeignKeyConstraint(['policy_section_ref'], ['policy_sections.section_id']),
        sa.PrimaryKeyConstraint('line_item_id')
    )
    op.create_index('ix_line_items_reim_id', 'line_items', ['reim_id'], unique=False)

    # ============================================================
    # 21. Migrate Reimbursement.line_items -> line_items
    # ============================================================
    op.execute("""
        INSERT INTO line_items (
            line_item_id, reim_id, document_id, description, category,
            claimed_amount, approved_amount, currency, judgment
        )
        SELECT
            gen_random_uuid(),
            r.reim_id,
            NULLIF(li->>'document_id', '')::uuid,
            COALESCE(li->>'description', li->>'merchant_name', ''),
            COALESCE(li->>'category', ''),
            COALESCE((li->>'requested_amount')::numeric, 0),
            NULLIF(li->>'approved_amount', '')::numeric,
            COALESCE(NULLIF(li->>'currency', ''), r.currency),
            CASE
                WHEN li->>'status' = 'APPROVED' THEN 'APPROVED'
                WHEN li->>'status' = 'REJECTED' THEN 'REJECTED'
                WHEN li->>'status' = 'PARTIAL_APPROVE' THEN 'PARTIAL'
                ELSE NULL
            END
        FROM reimbursements r,
        LATERAL jsonb_array_elements(r.line_items) AS li
        WHERE r.line_items IS NOT NULL AND jsonb_array_length(r.line_items) > 0
    """)

    # ============================================================
    # 22. Drop legacy columns from reimbursements
    # ============================================================
    op.drop_column('reimbursements', 'sub_category')
    op.drop_column('reimbursements', 'line_items')
    op.drop_column('reimbursements', 'totals')
    op.drop_column('reimbursements', 'employee_department')
    op.drop_column('reimbursements', 'employee_rank')

    # ============================================================
    # 23. Alter supporting_documents
    # ============================================================
    op.alter_column('supporting_documents', 'is_main', nullable=False)
    op.alter_column('supporting_documents', 'document_class', nullable=False, server_default='RECEIPT')
    op.alter_column('supporting_documents', 'human_edited', nullable=False)
    op.create_index('ix_supporting_documents_reim_id', 'supporting_documents', ['reim_id'], unique=False)
    op.create_index('ix_supporting_documents_settlement_id', 'supporting_documents', ['settlement_id'], unique=False)
    op.create_index('ix_supporting_documents_user_id', 'supporting_documents', ['user_id'], unique=False)

    # ============================================================
    # 24. Create document_change_logs
    # ============================================================
    op.create_table(
        'document_change_logs',
        sa.Column('log_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('field_name', sa.String(), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('changed_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['supporting_documents.document_id']),
        sa.ForeignKeyConstraint(['changed_by'], ['employees.user_id']),
        sa.PrimaryKeyConstraint('log_id')
    )
    op.create_index('ix_document_change_logs_document_id', 'document_change_logs', ['document_id'], unique=False)

    # ============================================================
    # 25. Migrate SupportingDocument.change_summary -> document_change_logs
    # ============================================================
    op.execute("""
        INSERT INTO document_change_logs (log_id, document_id, changed_by, field_name, old_value, new_value, changed_at)
        SELECT
            gen_random_uuid(),
            sd.document_id,
            sd.user_id,
            kv.key,
            kv.value->>'original',
            kv.value->>'edited',
            sd.created_at
        FROM supporting_documents sd,
        LATERAL jsonb_each(sd.change_summary->'changes_by_field') AS kv
        WHERE sd.change_summary IS NOT NULL
          AND sd.change_summary->'changes_by_field' IS NOT NULL
          AND jsonb_typeof(sd.change_summary->'changes_by_field') = 'object'
    """)

    # ============================================================
    # 26. Drop change_summary from supporting_documents
    # ============================================================
    op.drop_column('supporting_documents', 'change_summary')


def downgrade() -> None:
    # ============================================================
    # Reverse order: drop new tables, restore old columns
    # ============================================================

    # 26. Restore change_summary
    op.add_column('supporting_documents', sa.Column('change_summary', postgresql.JSONB(), nullable=True, server_default='{}'))

    # 25. Migrate back change_summary from document_change_logs
    op.execute("""
        UPDATE supporting_documents sd
        SET change_summary = jsonb_build_object(
            'has_changes', true,
            'change_count', sub.cnt,
            'high_risk_count', 0,
            'changes_by_field', sub.changes,
            'overall_risk', 'MEDIUM'
        )
        FROM (
            SELECT
                document_id,
                COUNT(*) AS cnt,
                jsonb_object_agg(field_name, jsonb_build_object('original', old_value, 'edited', new_value, 'severity', 'MEDIUM')) AS changes
            FROM document_change_logs
            GROUP BY document_id
        ) sub
        WHERE sd.document_id = sub.document_id
    """)

    # 24. Drop document_change_logs
    op.drop_index('ix_document_change_logs_document_id', table_name='document_change_logs')
    op.drop_table('document_change_logs')

    # 23. Revert supporting_documents alterations
    op.drop_index('ix_supporting_documents_user_id', table_name='supporting_documents')
    op.drop_index('ix_supporting_documents_settlement_id', table_name='supporting_documents')
    op.drop_index('ix_supporting_documents_reim_id', table_name='supporting_documents')
    op.alter_column('supporting_documents', 'human_edited', nullable=True)
    op.alter_column('supporting_documents', 'document_class', nullable=True)
    op.alter_column('supporting_documents', 'is_main', nullable=True)

    # 22. Restore legacy columns on reimbursements
    op.add_column('reimbursements', sa.Column('employee_rank', sa.Integer(), nullable=True, server_default='1'))
    op.add_column('reimbursements', sa.Column('employee_department', sa.String(), nullable=True))
    op.add_column('reimbursements', sa.Column('totals', postgresql.JSONB(), nullable=True, server_default='{}'))
    op.add_column('reimbursements', sa.Column('line_items', postgresql.JSONB(), nullable=True, server_default='[]'))
    op.add_column('reimbursements', sa.Column('sub_category', postgresql.JSONB(), nullable=True, server_default='[]'))

    # Migrate back from flat totals
    op.execute("""
        UPDATE reimbursements
        SET totals = jsonb_build_object(
            'total_requested', total_claimed_amount,
            'net_approved', total_approved_amount,
            'total_deduction', total_rejected_amount
        )
    """)

    # Migrate back line_items from line_items table
    op.execute("""
        UPDATE reimbursements r
        SET line_items = COALESCE(sub.items, '[]'::jsonb)
        FROM (
            SELECT reim_id, jsonb_agg(jsonb_build_object(
                'document_id', document_id::text,
                'description', description,
                'category', category,
                'requested_amount', claimed_amount::text,
                'approved_amount', COALESCE(approved_amount::text, '0'),
                'currency', currency,
                'status', COALESCE(judgment, 'APPROVED')
            )) AS items
            FROM line_items
            GROUP BY reim_id
        ) sub
        WHERE r.reim_id = sub.reim_id
    """)

    # Migrate back sub_category from reimbursement_sub_categories
    op.execute("""
        UPDATE reimbursements r
        SET sub_category = COALESCE(sub.cats, '[]'::jsonb)
        FROM (
            SELECT reim_id, jsonb_agg(sub_category) AS cats
            FROM reimbursement_sub_categories
            GROUP BY reim_id
        ) sub
        WHERE r.reim_id = sub.reim_id
    """)

    # 21. Drop line_items
    op.drop_index('ix_line_items_reim_id', table_name='line_items')
    op.drop_table('line_items')

    # 20. Drop reimbursement_sub_categories
    op.drop_index('ix_reimbursement_sub_categories_reim_id', table_name='reimbursement_sub_categories')
    op.drop_table('reimbursement_sub_categories')

    # 19. (no action needed — data already migrated back)

    # 18. (no action needed — table already dropped)

    # 17. Revert reimbursements alterations
    op.drop_index('ix_reimbursements_status', table_name='reimbursements')
    op.drop_index('ix_reimbursements_main_category', table_name='reimbursements')
    op.drop_column('reimbursements', 'reviewed_at')
    op.drop_constraint('fk_reimbursements_reviewed_by', 'reimbursements', type_='foreignkey')
    op.drop_column('reimbursements', 'reviewed_by')
    op.drop_column('reimbursements', 'ai_reasoning')
    op.drop_column('reimbursements', 'total_rejected_amount')
    op.drop_column('reimbursements', 'total_approved_amount')
    op.drop_column('reimbursements', 'total_claimed_amount')
    op.alter_column('reimbursements', 'status', nullable=True)
    op.alter_column('reimbursements', 'judgment', nullable=True)
    op.alter_column('reimbursements', 'main_category', nullable=True)
    op.alter_column('reimbursements', 'currency', type_=sa.String(), existing_nullable=False)

    # 16. (no action needed — columns already restored)

    # 15. Restore denormalized columns on travel_settlements
    op.add_column('travel_settlements', sa.Column('totals', postgresql.JSONB(), nullable=True, server_default='{}'))
    op.add_column('travel_settlements', sa.Column('receipts', postgresql.JSONB(), nullable=True, server_default='[]'))
    op.add_column('travel_settlements', sa.Column('all_category', postgresql.JSONB(), nullable=True, server_default='[]'))
    op.add_column('travel_settlements', sa.Column('employee_rank', sa.Integer(), nullable=True))
    op.add_column('travel_settlements', sa.Column('employee_department', sa.String(), nullable=True))
    op.add_column('travel_settlements', sa.Column('employee_code', sa.String(), nullable=True))
    op.add_column('travel_settlements', sa.Column('employee_id', sa.String(), nullable=True))
    op.add_column('travel_settlements', sa.Column('employee_name', sa.String(), nullable=True))
    op.add_column('travel_settlements', sa.Column('reimbursement_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_settlement_reim_id', 'travel_settlements', 'reimbursements', ['reimbursement_id'], ['reim_id'], use_alter=True)

    # Migrate back data
    op.execute("""
        UPDATE travel_settlements
        SET totals = jsonb_build_object('grand_total', total_claimed_amount)
    """)

    # Migrate back receipts from settlement_receipts
    op.execute("""
        UPDATE travel_settlements ts
        SET receipts = COALESCE(sub.receipts, '[]'::jsonb)
        FROM (
            SELECT settlement_id, jsonb_agg(jsonb_build_object(
                'document_id', document_id::text,
                'description', merchant_name,
                'date', receipt_date::text,
                'category', category,
                'amount', claimed_amount::text,
                'currency', currency
            )) AS receipts
            FROM settlement_receipts
            GROUP BY settlement_id
        ) sub
        WHERE ts.settlement_id = sub.settlement_id
    """)

    # Migrate back all_category from settlement_categories
    op.execute("""
        UPDATE travel_settlements ts
        SET all_category = COALESCE(sub.cats, '[]'::jsonb)
        FROM (
            SELECT settlement_id, jsonb_agg(category) AS cats
            FROM settlement_categories
            GROUP BY settlement_id
        ) sub
        WHERE ts.settlement_id = sub.settlement_id
    """)

    # Migrate back employee data from user_id join
    op.execute("""
        UPDATE travel_settlements ts
        SET employee_id = e.user_id::text,
            employee_name = e.name,
            employee_code = e.user_code,
            employee_department = d.name,
            employee_rank = e.rank
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.department_id
        WHERE ts.user_id = e.user_id
    """)

    # 14. (already handled in 15)

    # 13. Drop settlement_receipts
    op.drop_index('ix_settlement_receipts_settlement_id', table_name='settlement_receipts')
    op.drop_table('settlement_receipts')

    # 12. (already dropped)

    # 11. Drop settlement_categories
    op.drop_index('ix_settlement_categories_settlement_id', table_name='settlement_categories')
    op.drop_table('settlement_categories')

    # 10. (already dropped)

    # 9. Revert travel_settlements alterations
    op.execute("ALTER TABLE travel_settlements ALTER COLUMN departure_date TYPE varchar USING departure_date::varchar")
    op.execute("ALTER TABLE travel_settlements ALTER COLUMN arrival_date TYPE varchar USING arrival_date::varchar")
    op.alter_column('travel_settlements', 'currency', type_=sa.String(), existing_nullable=True)
    op.alter_column('travel_settlements', 'purpose', type_=sa.String(), existing_nullable=True)
    op.drop_column('travel_settlements', 'total_rejected_amount')
    op.drop_column('travel_settlements', 'total_approved_amount')
    op.drop_column('travel_settlements', 'total_claimed_amount')
    op.drop_index('ix_travel_settlements_user_id', table_name='travel_settlements')
    op.drop_constraint('fk_travel_settlements_user_id', 'travel_settlements', type_='foreignkey')
    op.drop_column('travel_settlements', 'user_id')

    # 8. (already reverted)

    # 7. Revert policy_sections alterations
    op.drop_index('ix_policy_sections_policy_id', table_name='policy_sections')
    op.drop_column('policy_sections', 'section_order')
    op.drop_column('policy_sections', 'section_title')

    # 6. Restore reimbursable_category on policies
    op.add_column('policies', sa.Column('reimbursable_category', postgresql.JSONB(), nullable=True, server_default='[]'))

    # Migrate back from policy_reimbursable_categories
    op.execute("""
        UPDATE policies p
        SET reimbursable_category = COALESCE(sub.cats, '[]'::jsonb)
        FROM (
            SELECT policy_id, jsonb_agg(category) AS cats
            FROM policy_reimbursable_categories
            GROUP BY policy_id
        ) sub
        WHERE p.policy_id = sub.policy_id
    """)

    # 5. Drop policy_reimbursable_categories
    op.drop_index('ix_policy_reimbursable_categories_policy_id', table_name='policy_reimbursable_categories')
    op.drop_table('policy_reimbursable_categories')

    # 4. (already dropped)

    # 3. Revert policies alterations
    op.drop_index('ix_policies_alias', table_name='policies')
    op.drop_constraint('fk_policies_created_by', 'policies', type_='foreignkey')
    op.drop_column('policies', 'created_by')
    op.drop_column('policies', 'expiry_date')
    op.alter_column('policies', 'status', nullable=True)

    # 2. Revert employees alterations
    op.drop_index('ix_employees_user_code', table_name='employees')
    op.alter_column('employees', 'privilege_level', nullable=True)
    op.drop_column('employees', 'created_at')
    op.drop_column('employees', 'is_active')
    op.drop_constraint('fk_employees_department_id', 'employees', type_='foreignkey')
    op.drop_column('employees', 'department_id')

    # 1. Drop departments
    op.drop_table('departments')
