"""
Add agent_codename to UserProgress
Revision ID: add_agent_codename
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'add_agent_codename'
down_revision = None  # Set this to the previous migration ID if you know it
branch_labels = None
depends_on = None

def upgrade():
    # Add the agent_codename column to user_progress table
    op.add_column('user_progress', sa.Column('agent_codename', sa.String(255), nullable=True))
    
    # Create an index on the new column for faster lookups
    op.create_index(op.f('ix_user_progress_agent_codename'), 'user_progress', ['agent_codename'], unique=False)
    
    # Populate the new column with data from game_state (done in separate script)
    
def downgrade():
    # Remove the index first
    op.drop_index(op.f('ix_user_progress_agent_codename'), table_name='user_progress')
    
    # Remove the column
    op.drop_column('user_progress', 'agent_codename')
