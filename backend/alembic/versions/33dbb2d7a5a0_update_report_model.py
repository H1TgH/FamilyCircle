"""Update report model

Revision ID: 33dbb2d7a5a0
Revises: a1b2c3d4e5f6
Create Date: 2026-01-09 16:52:58.708957

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '33dbb2d7a5a0'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None



def upgrade():
    op.alter_column('reports', 'volunteer_id',
        existing_type=postgresql.UUID(),
        nullable=True,
        new_column_name='author_id')
    
    op.alter_column('reports', 'request_id',
        existing_type=postgresql.UUID(),
        nullable=True)


def downgrade():
    op.alter_column('reports', 'author_id',
        existing_type=postgresql.UUID(),
        nullable=True,
        new_column_name='volunteer_id')
    
    op.alter_column('reports', 'request_id',
        existing_type=postgresql.UUID(),
        nullable=False)
