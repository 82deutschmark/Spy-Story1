
from app import app, db
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def upgrade():
    """Add character_name column to ImageAnalysis table"""
    with app.app_context():
        try:
            # Add character_name column if it doesn't exist
            op.add_column('image_analysis', sa.Column('character_name', sa.String(255)))
            logger.info("Added character_name column to image_analysis table")
            
            # Update records to fill in character_name from analysis_result
            connection = op.get_bind()
            result = connection.execute(
                "UPDATE image_analysis SET character_name = analysis_result->>'name' "
                "WHERE image_type = 'character' AND analysis_result->>'name' IS NOT NULL"
            )
            logger.info(f"Updated {result.rowcount} records with character_name data")
            
            # Check for records with missing plot_lines and update them
            result = connection.execute(
                "UPDATE image_analysis SET plot_lines = analysis_result->'plot_lines' "
                "WHERE image_type = 'character' AND (plot_lines IS NULL OR plot_lines = '[]'::jsonb) "
                "AND analysis_result->'plot_lines' IS NOT NULL"
            )
            logger.info(f"Updated {result.rowcount} records with plot_lines data")
            
        except Exception as e:
            logger.error(f"Error in migration: {str(e)}")
            raise

def downgrade():
    """Remove character_name column from ImageAnalysis table"""
    with app.app_context():
        op.drop_column('image_analysis', 'character_name')
        logger.info("Removed character_name column from image_analysis table")

if __name__ == "__main__":
    upgrade()
