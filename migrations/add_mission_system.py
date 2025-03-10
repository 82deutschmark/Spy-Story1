
import os
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db
from models import UserProgress, Mission

def add_mission_columns():
    """Add mission-related columns to UserProgress table"""
    try:
        logger.info("Adding mission columns to UserProgress table...")
        
        # Check if any UserProgress records exist
        from app import app
        with app.app_context():
            records = UserProgress.query.all()
            count = 0
            
            for record in records:
                # Add mission tracking fields if they don't exist
                if not hasattr(record, 'active_missions') or record.active_missions is None:
                    record.active_missions = []
                    count += 1
                    
                if not hasattr(record, 'completed_missions') or record.completed_missions is None:
                    record.completed_missions = []
                    count += 1
                    
                if not hasattr(record, 'failed_missions') or record.failed_missions is None:
                    record.failed_missions = []
                    count += 1
            
            if count > 0:
                db.session.commit()
                logger.info(f"Added mission tracking columns to {len(records)} UserProgress records")
            else:
                logger.info("No UserProgress records needed updating")
                
            # Create the Mission table
            db.create_all()
            logger.info("Mission table created successfully")
            
        return True
    except Exception as e:
        logger.error(f"Error adding mission columns: {str(e)}")
        return False

if __name__ == '__main__':
    logger.info("Starting mission system migration...")
    
    try:
        # Import the app and set up database context
        from app import app
        
        success = add_mission_columns()
        
        if success:
            logger.info("Mission system migration completed successfully")
        else:
            logger.error("Mission system migration failed")
    except Exception as e:
        logger.error(f"Migration error: {str(e)}")
        sys.exit(1)
