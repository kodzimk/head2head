"""Remove comment replies functionality

Revision ID: remove_comment_replies
Revises: 
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'remove_comment_replies'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # First, delete all reply comments (comments with parent_id)
    op.execute("DELETE FROM debate_comments WHERE parent_id IS NOT NULL")
    
    # Then, drop the parent_id column and its foreign key constraint
    op.drop_constraint('debate_comments_parent_id_fkey', 'debate_comments', type_='foreignkey')
    op.drop_column('debate_comments', 'parent_id')

def downgrade():
    # Add back the parent_id column
    op.add_column('debate_comments',
        sa.Column('parent_id', sa.String(), nullable=True)
    )
    
    # Add back the foreign key constraint
    op.create_foreign_key(
        'debate_comments_parent_id_fkey',
        'debate_comments', 'debate_comments',
        ['parent_id'], ['id']
    ) 