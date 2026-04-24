"""init all tables

Revision ID: 0001
Revises:
Create Date: 2026-04-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table('users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('username', sa.String(50), unique=True, nullable=False),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('phone', sa.String(20)),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_admin', sa.Boolean, default=False),
        sa.Column('avatar_url', sa.String(500)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table('refresh_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(255), unique=True, nullable=False),
        sa.Column('device_info', sa.String(200)),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('revoked_at', sa.DateTime(timezone=True)),
    )
    op.create_index('idx_refresh_tokens_user', 'refresh_tokens', ['user_id'])

    # case_categories
    op.create_table('case_categories',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('icon', sa.String(10)),
        sa.Column('color', sa.String(20)),
        sa.Column('group_name', sa.String(50)),
        sa.Column('description', sa.Text),
        sa.Column('sort_order', sa.SmallInteger, default=0),
    )

    # cases
    op.create_table('cases',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('category_id', sa.String(50), sa.ForeignKey('case_categories.id')),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('subtitle', sa.String(300)),
        sa.Column('difficulty', sa.String(20)),
        sa.Column('success_rate', sa.SmallInteger),
        sa.Column('description', sa.Text),
        sa.Column('source', sa.String(100)),
        sa.Column('court_reference', sa.String(300)),
        sa.Column('verdict_year', sa.SmallInteger),
        sa.Column('is_published', sa.Boolean, default=True),
        sa.Column('is_featured', sa.Boolean, default=False),
        sa.Column('view_count', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_cases_category', 'cases', ['category_id'])
    op.create_index('idx_cases_published', 'cases', ['is_published'])

    for tbl, cols in [
        ('case_keywords',         [('keyword', sa.String(100))]),
        ('case_landlord_scripts', [('script', sa.Text)]),
        ('case_legal_bases',      [('law', sa.String(100)), ('content', sa.Text)]),
        ('case_action_steps',     [('step_num', sa.SmallInteger), ('title', sa.String(100)), ('detail', sa.Text)]),
        ('case_templates',        [('title', sa.String(100)), ('content', sa.Text)]),
        ('case_complaint_channels', [('name', sa.String(100)), ('type', sa.String(20))]),
        ('case_outcome_examples', [('example', sa.Text)]),
        ('case_evidence_needed',  [('evidence', sa.Text)]),
    ]:
        op.create_table(tbl,
            sa.Column('id', sa.Integer, primary_key=True, autoincrement=True),
            sa.Column('case_id', sa.String(50), sa.ForeignKey('cases.id', ondelete='CASCADE')),
            *[sa.Column(name, typ) for name, typ in cols],
        )

    # chat_sessions / chat_messages
    op.create_table('chat_sessions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200)),
        sa.Column('category', sa.String(50)),
        sa.Column('is_archived', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_chat_sessions_user', 'chat_sessions', ['user_id'])
    op.create_table('chat_messages',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('session_id', sa.String(36), sa.ForeignKey('chat_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('tokens_used', sa.Integer),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_chat_messages_session', 'chat_messages', ['session_id'])

    # progress_trackers / progress_events
    op.create_table('progress_trackers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('category_id', sa.String(50), sa.ForeignKey('case_categories.id')),
        sa.Column('deposit_amount', sa.Numeric(12, 2)),
        sa.Column('rent_end_date', sa.Date),
        sa.Column('landlord_name', sa.String(100)),
        sa.Column('city', sa.String(50)),
        sa.Column('current_stage', sa.String(30), default='notice'),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('recovered_amount', sa.Numeric(12, 2)),
        sa.Column('chat_session_id', sa.String(36), sa.ForeignKey('chat_sessions.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table('progress_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('tracker_id', sa.String(36), sa.ForeignKey('progress_trackers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('stage', sa.String(30), nullable=False),
        sa.Column('event_type', sa.String(50)),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('event_date', sa.Date, nullable=False),
        sa.Column('is_milestone', sa.Boolean, default=False),
        sa.Column('attachment_url', sa.String(500)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_progress_events_tracker', 'progress_events', ['tracker_id'])

    # case_submissions
    op.create_table('case_submissions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('category_id', sa.String(50), sa.ForeignKey('case_categories.id')),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('city', sa.String(50)),
        sa.Column('deposit_amount', sa.Numeric(12, 2)),
        sa.Column('rent_months', sa.SmallInteger),
        sa.Column('outcome', sa.String(50)),
        sa.Column('recovered_amount', sa.Numeric(12, 2)),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('reviewed_by', sa.String(36), sa.ForeignKey('users.id')),
        sa.Column('review_note', sa.Text),
        sa.Column('reviewed_at', sa.DateTime(timezone=True)),
        sa.Column('published_case_id', sa.String(50), sa.ForeignKey('cases.id')),
        sa.Column('is_anonymous', sa.Boolean, default=False),
        sa.Column('contact_email', sa.String(255)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_submissions_status', 'case_submissions', ['status'])

    # blacklist_entries
    op.create_table('blacklist_entries',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('reporter_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('entity_type', sa.String(20), nullable=False),
        sa.Column('entity_name', sa.String(100), nullable=False),
        sa.Column('phone', sa.String(20)),
        sa.Column('id_card_last4', sa.String(4)),
        sa.Column('agency_name', sa.String(100)),
        sa.Column('city', sa.String(50)),
        sa.Column('district', sa.String(50)),
        sa.Column('address_hint', sa.String(200)),
        sa.Column('dispute_type', sa.String(50)),
        sa.Column('amount', sa.Numeric(12, 2)),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('report_count', sa.Integer, default=1),
        sa.Column('verified_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_blacklist_city', 'blacklist_entries', ['city', 'status'])
    op.create_index('idx_blacklist_name', 'blacklist_entries', ['entity_name'])

    # cities + city_policies + city_contacts + city_verdicts
    op.create_table('cities',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('province', sa.String(50)),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('sort_order', sa.SmallInteger, default=0),
    )
    for tbl, cols in [
        ('city_policies', [('city_id', sa.String(50), 'cities.id'), ('policy_type', sa.String(50), None), ('title', sa.String(200), None), ('content', sa.Text, None), ('effective_date', sa.Date, None), ('source_url', sa.String(500), None), ('updated_at', sa.DateTime(timezone=True), None)]),
        ('city_contacts', [('city_id', sa.String(50), 'cities.id'), ('department', sa.String(100), None), ('contact_type', sa.String(20), None), ('value', sa.String(300), None), ('note', sa.String(200), None), ('updated_at', sa.DateTime(timezone=True), None)]),
        ('city_verdicts', [('city_id', sa.String(50), 'cities.id'), ('case_reference', sa.String(200), None), ('court', sa.String(100), None), ('year', sa.SmallInteger, None), ('summary', sa.Text, None), ('outcome', sa.String(50), None), ('source_url', sa.String(500), None), ('created_at', sa.DateTime(timezone=True), None)]),
    ]:
        cols_defs = [sa.Column('id', sa.String(36), primary_key=True)]
        for col_name, col_type, fk in cols:
            if fk:
                cols_defs.append(sa.Column(col_name, col_type, sa.ForeignKey(fk)))
            else:
                cols_defs.append(sa.Column(col_name, col_type))
        op.create_table(tbl, *cols_defs)

    # generated_documents
    op.create_table('generated_documents',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('doc_type', sa.String(30), nullable=False),
        sa.Column('form_data', sa.JSON, nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('file_url', sa.String(500)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # deposit_calculations
    op.create_table('deposit_calculations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('deposit_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('rent_monthly', sa.Numeric(12, 2)),
        sa.Column('rent_months', sa.SmallInteger),
        sa.Column('city', sa.String(50)),
        sa.Column('deduction_items', sa.JSON),
        sa.Column('recoverable_amount', sa.Numeric(12, 2)),
        sa.Column('calculation_detail', sa.JSON),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    for tbl in [
        'deposit_calculations', 'generated_documents',
        'city_verdicts', 'city_contacts', 'city_policies', 'cities',
        'blacklist_entries', 'case_submissions',
        'progress_events', 'progress_trackers',
        'chat_messages', 'chat_sessions',
        'case_evidence_needed', 'case_outcome_examples',
        'case_complaint_channels', 'case_templates',
        'case_action_steps', 'case_legal_bases',
        'case_landlord_scripts', 'case_keywords',
        'cases', 'case_categories',
        'refresh_tokens', 'users',
    ]:
        op.drop_table(tbl)
