"""Add is_has_avatar field in elder model

Revision ID: 856096a85ffe
Revises: 05a7d9bb201f
Create Date: 2026-01-08 12:58:47.018591

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '856096a85ffe'
down_revision: Union[str, Sequence[str], None] = '05a7d9bb201f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('elders', 
        sa.Column('is_has_avatar', sa.Boolean(), nullable=False, server_default='false')
    )

    op.drop_column('elders', 'avatar_url')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('elders',
        sa.Column('avatar_url', sa.String(), nullable=True)
    )

    op.drop_column('elders', 'is_has_avatar')