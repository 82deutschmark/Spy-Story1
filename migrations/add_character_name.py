
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from sqlalchemy import Column, String
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def upgrade():
    """Add character_name column to ImageAnalysis table"""
    with app.app_context():
        try:
            # Check if column exists
            connection = db.engine.connect()
            inspector = db.inspect(db.engine)
            columns = inspector.get_columns('image_analysis')
            column_names = [col['name'] for col in columns]
            
            if 'character_name' not in column_names:
                # Add character_name column 
                connection.execute(db.text("ALTER TABLE image_analysis ADD COLUMN character_name VARCHAR(255)"))
                logger.info("Added character_name column to image_analysis table")
                
                # Update records to fill in character_name from analysis_result
                connection.execute(
                    db.text("UPDATE image_analysis SET character_name = analysis_result->>'name' "
                    "WHERE image_type = 'character' AND analysis_result->>'name' IS NOT NULL")
                )
                connection.commit()
                logger.info("Updated records with character_name data")
            else:
                logger.info("character_name column already exists")
                
        except Exception as e:
            logger.error(f"Error in migration: {str(e)}")
            raise

if __name__ == "__main__":
    upgrade()
