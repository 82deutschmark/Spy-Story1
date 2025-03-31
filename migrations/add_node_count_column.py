"""
Migration script to add node_count column to UserProgress table

This migration:
1. Adds a dedicated node_count column to the user_progress table
2. Migrates existing node count data from extra_data JSONB field
3. Sets up appropriate indexes for performance
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
import json

# revision identifiers used by Alembic
revision = 'add_node_count_column'
down_revision = None  # Set this to the previous migration
branch_labels = None
depends_on = None

def upgrade():
    # Add the node_count column to user_progress table
    op.add_column('user_progress', 
                  sa.Column('node_count', sa.Integer, 
                            server_default='0', 
                            nullable=False))
    
    # Create an index for performance
    op.create_index(op.f('ix_user_progress_node_count'), 
                    'user_progress', ['node_count'], unique=False)
    
    # Migrate existing data from extra_data JSONB
    # This requires a more complex implementation with raw SQL
    connection = op.get_bind()
    
    # First, get all user_progress records that have node_count in extra_data
    result = connection.execute(
        """
        SELECT id, extra_data 
        FROM user_progress 
        WHERE extra_data ? 'node_count'
        """
    )
    
    # Update each record to move node_count from extra_data to the new column
    for row in result:
        try:
            # Parse the JSONB data
            extra_data = row[1]
            
            # Extract node_count if it exists
            if isinstance(extra_data, dict) and 'node_count' in extra_data:
                node_count = int(extra_data['node_count'])
                
                # Update the record with the extracted node_count
                connection.execute(
                    f"""
                    UPDATE user_progress 
                    SET node_count = {node_count} 
                    WHERE id = {row[0]}
                    """
                )
                
                # Remove node_count from extra_data
                connection.execute(
                    f"""
                    UPDATE user_progress 
                    SET extra_data = extra_data - 'node_count' 
                    WHERE id = {row[0]}
                    """
                )
        except (TypeError, ValueError, KeyError) as e:
            print(f"Error migrating node_count for user_progress {row[0]}: {e}")

def downgrade():
    # Before removing the column, we need to preserve the data in extra_data
    connection = op.get_bind()
    
    # Get all user_progress records with non-zero node_count
    result = connection.execute(
        """
        SELECT id, node_count, extra_data 
        FROM user_progress 
        WHERE node_count > 0
        """
    )
    
    # Move node_count back to extra_data for each record
    for row in result:
        try:
            # Parse the JSONB data
            user_id = row[0]
            node_count = row[1]
            extra_data = row[2] or {}
            
            # Add node_count to extra_data
            connection.execute(
                f"""
                UPDATE user_progress 
                SET extra_data = extra_data || '{{"node_count": {node_count}}}' 
                WHERE id = {user_id}
                """
            )
        except Exception as e:
            print(f"Error reverting node_count for user_progress {row[0]}: {e}")
    
    # Remove the node_count column
    op.drop_index(op.f('ix_user_progress_node_count'), table_name='user_progress')
    op.drop_column('user_progress', 'node_count') 