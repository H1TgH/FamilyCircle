"""Update request model

Revision ID: 5e539f082155
Revises: 33dbb2d7a5a0
Create Date: 2026-01-10 10:23:50.428448

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e539f082155'
down_revision: Union[str, Sequence[str], None] = '33dbb2d7a5a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('requests', sa.Column('tasks', sa.JSON(), nullable=False, server_default='[]'))
    
    op.alter_column('requests', 'task_name', new_column_name='checklist_name')
    
    op.drop_column('requests', 'check_list')
    op.drop_column('requests', 'frequency')
    op.drop_column('requests', 'scheduled_date')
    op.drop_column('requests', 'scheduled_time')
    op.drop_column('requests', 'description')


def downgrade() -> None:
    op.add_column('requests', sa.Column('check_list', sa.ARRAY(sa.String()), nullable=True))
    op.add_column('requests', sa.Column('frequency', sa.VARCHAR(), nullable=True))
    op.add_column('requests', sa.Column('scheduled_date', sa.Date(), nullable=True))
    op.add_column('requests', sa.Column('scheduled_time', sa.Time(), nullable=True))
    op.add_column('requests', sa.Column('description', sa.String(), nullable=True))
    
    op.alter_column('requests', 'checklist_name', new_column_name='task_name')
    
    op.drop_column('requests', 'tasks')
