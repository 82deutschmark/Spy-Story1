
import os
import sys
import logging
from database import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_missing_mission_columns():
    """Add missing mission-related columns to UserProgress table"""
    from app import app
    
    with app.app_context():
        try:
            connection = db.engine.connect()
            
            # Add mission tracking columns
            connection.execute(db.text("""
                ALTER TABLE user_progress 
                ADD COLUMN IF NOT EXISTS active_missions JSONB DEFAULT '[]',
                ADD COLUMN IF NOT EXISTS completed_missions JSONB DEFAULT '[]',
                ADD COLUMN IF NOT EXISTS failed_missions JSONB DEFAULT '[]'
            """))
            
            connection.commit()
            logger.info("Successfully added mission columns to user_progress table")
            return True
            
        except Exception as e:
            logger.error(f"Error adding mission columns: {str(e)}")
            return False

if __name__ == "__main__":
    success = add_missing_mission_columns()
    
    if success:
        print("Mission columns added successfully!")
    else:
        print("Failed to add mission columns.")
        sys.exit(1)
