
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app
from database import db
from models.character_data import Character
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_database_columns():
    """Fix all missing columns in the database to match the model definitions"""
    with app.app_context():
        # Check for missing columns in the image_analysis table
        engine = db.engine
        inspector = db.inspect(engine)
        
        # Get current columns in the image_analysis table
        columns = inspector.get_columns('image_analysis')
        existing_columns = [col['name'] for col in columns]
        
        logger.info(f"Found {len(existing_columns)} columns in image_analysis table")
        logger.info(f"Existing columns: {existing_columns}")
        
        # Define all columns that should exist in the model based on models/images.py
        expected_columns = {
            'id': 'INTEGER',
            'image_url': 'VARCHAR(1024)', 
            'image_width': 'INTEGER',
            'image_height': 'INTEGER',
            'image_format': 'VARCHAR(16)',
            'image_size_bytes': 'INTEGER',
            'image_type': 'VARCHAR(32)',
            'analysis_result': 'JSONB',
            'character_name': 'VARCHAR(255)', 
            'character_traits': 'JSONB',
            'character_role': 'VARCHAR(32)',
            'role': 'VARCHAR(32)',  # The problematic column from the error message
            'plot_lines': 'JSONB',
            'potential_plot_lines': 'JSONB',
            'backstory': 'JSONB',
            'description': 'TEXT',
            'scene_type': 'VARCHAR(64)',
            'setting': 'VARCHAR(255)',
            'setting_description': 'TEXT',
            'story_fit': 'VARCHAR(255)',
            'dramatic_moments': 'JSONB',
            'created_at': 'TIMESTAMP'
        }
        
        # Find which columns are missing
        missing_columns = [col for col in expected_columns if col not in existing_columns]
        logger.info(f"Found {len(missing_columns)} missing columns: {missing_columns}")
        
        # Add missing columns
        with engine.connect() as conn:
            for col_name in missing_columns:
                col_type = expected_columns[col_name]
                logger.info(f"Adding column {col_name} with type {col_type}")
                try:
                    conn.execute(db.text(f"ALTER TABLE image_analysis ADD COLUMN {col_name} {col_type}"))
                    logger.info(f"Successfully added column {col_name}")
                except Exception as e:
                    logger.error(f"Error adding column {col_name}: {str(e)}")
            
            # Commit the changes
            conn.commit()
            
        # Check for other missing columns in related tables
        check_table_columns('story_generation')
        check_table_columns('story_node')
        check_table_columns('story_choice')
        check_table_columns('user_progress')
        
        logger.info("Database column fixes completed")

def check_table_columns(table_name):
    """Check for missing columns in other tables"""
    inspector = db.inspect(db.engine)
    
    # Check if table exists first
    if not inspector.has_table(table_name):
        logger.warning(f"Table {table_name} does not exist in the database")
        return
        
    # Get existing columns
    columns = inspector.get_columns(table_name)
    logger.info(f"Table {table_name} has {len(columns)} columns")

if __name__ == "__main__":
    fix_database_columns()
