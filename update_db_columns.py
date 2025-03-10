
import os
import logging
from app import app
from database import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_missing_columns():
    """Add missing columns to user_progress table"""
    with app.app_context():
        try:
            connection = db.engine.connect()
            
            # Add missing columns to user_progress table
            connection.execute(db.text("""
                ALTER TABLE user_progress 
                ADD COLUMN IF NOT EXISTS current_story_id INTEGER REFERENCES story_generation(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
                ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS active_plot_arcs JSONB DEFAULT '[]',
                ADD COLUMN IF NOT EXISTS completed_plot_arcs JSONB DEFAULT '[]',
                ADD COLUMN IF NOT EXISTS encountered_characters JSONB DEFAULT '{}'
            """))
            
            # Create index for better performance
            connection.execute(db.text("""
                CREATE INDEX IF NOT EXISTS idx_user_progress_current_story_id ON user_progress(current_story_id);
            """))
            
            connection.commit()
            logger.info("Successfully added missing columns to user_progress table")
            
        except Exception as e:
            logger.error(f"Error adding columns: {str(e)}")
            raise

if __name__ == "__main__":
    add_missing_columns()
