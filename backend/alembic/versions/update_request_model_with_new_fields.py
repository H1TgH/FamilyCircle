"""Update request model with new fields

Revision ID: a1b2c3d4e5f6
Revises: 05a7d9bb201f
Create Date: 2025-01-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '856096a85ffe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE frequency_enum AS ENUM ('once', 'every_few_hours', 'daily', 'weekly', 'monthly')")
    op.execute("CREATE TYPE duration_unit_enum AS ENUM ('hours', 'days', 'months')")
    
    op.add_column('requests', sa.Column('task_name', sa.String(), nullable=True))
    op.add_column('requests', sa.Column('frequency', postgresql.ENUM('once', 'every_few_hours', 'daily', 'weekly', 'monthly', name='frequency_enum', create_type=False), nullable=True))
    op.add_column('requests', sa.Column('scheduled_date', sa.Date(), nullable=True))
    op.add_column('requests', sa.Column('scheduled_time_new', sa.Time(), nullable=True))
    op.add_column('requests', sa.Column('duration_value', sa.Integer(), nullable=True))
    op.add_column('requests', sa.Column('duration_unit', postgresql.ENUM('hours', 'days', 'months', name='duration_unit_enum', create_type=False), nullable=True))
    op.add_column('requests', sa.Column('is_shopping_checklist', sa.Boolean(), nullable=False, server_default='false'))
    
    op.execute("UPDATE requests SET task_name = category WHERE task_name IS NULL")
    op.execute("UPDATE requests SET scheduled_date = scheduled_time::date WHERE scheduled_time IS NOT NULL")
    op.execute("UPDATE requests SET scheduled_time_new = scheduled_time::time WHERE scheduled_time IS NOT NULL")
    
    op.drop_column('requests', 'scheduled_time')
    op.alter_column('requests', 'scheduled_time_new', new_column_name='scheduled_time')
    op.alter_column('requests', 'task_name', nullable=False)
    
    op.drop_column('requests', 'category')
    op.drop_column('requests', 'address')


def downgrade() -> None:
    op.add_column('requests', sa.Column('category', sa.String(), nullable=True))
    op.add_column('requests', sa.Column('address', sa.String(), nullable=True))
    op.add_column('requests', sa.Column('scheduled_time_old', sa.DateTime(timezone=True), nullable=True))
    
    op.execute("UPDATE requests SET category = task_name WHERE category IS NULL")
    op.execute("UPDATE requests SET scheduled_time_old = (scheduled_date + scheduled_time)::timestamp WHERE scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL")
    
    op.drop_column('requests', 'scheduled_time')
    op.alter_column('requests', 'scheduled_time_old', new_column_name='scheduled_time')
    
    op.drop_column('requests', 'is_shopping_checklist')
    op.drop_column('requests', 'duration_unit')
    op.drop_column('requests', 'duration_value')
    op.drop_column('requests', 'scheduled_date')
    op.drop_column('requests', 'frequency')
    op.drop_column('requests', 'task_name')
    
    op.execute('DROP TYPE duration_unit_enum')
    op.execute('DROP TYPE frequency_enum')
