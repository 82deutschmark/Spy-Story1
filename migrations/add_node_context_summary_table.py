"""
Migration script to add node_context_summary table

This migration creates a new table for storing pre-computed narrative summaries
at various detail levels for story nodes to optimize context retrieval for OpenAI.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers used by Alembic
revision = 'add_node_context_summary_table'
down_revision = 'add_node_count_column'  # Set this to point to the previous migration
branch_labels = None
depends_on = None

def upgrade():
    # Create node_context_summary table
    op.create_table(
        'node_context_summary',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('node_id', sa.Integer, sa.ForeignKey('story_node.id', ondelete='CASCADE'), nullable=False),
        sa.Column('summary_text', sa.Text, nullable=False),
        sa.Column('summary_type', sa.String(50), nullable=False),
        sa.Column('token_count', sa.Integer, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.current_timestamp())
    )
    
    # Create indexes for efficient retrieval
    op.create_index('ix_node_context_summary_node_id_type', 'node_context_summary', ['node_id', 'summary_type'])
    op.create_index('ix_node_context_summary_created_at', 'node_context_summary', ['created_at'])

def downgrade():
    # Drop indexes
    op.drop_index('ix_node_context_summary_node_id_type', table_name='node_context_summary')
    op.drop_index('ix_node_context_summary_created_at', table_name='node_context_summary')
    
    # Drop table
    op.drop_table('node_context_summary') 