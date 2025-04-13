"""
Apply Database Changes
=====================

This script connects to the database and adds the agent_codename column
to the user_progress table if it doesn't already exist.
"""

import os
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import required modules
try:
    from database import db
    from models import UserProgress
    from main import create_app
    from sqlalchemy import text
    logger.info("Successfully imported required modules")
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    sys.exit(1)

def add_agent_codename_column():
    """
    Add the agent_codename column to the user_progress table if it doesn't exist.
    """
    # Create an app context
    app = create_app()
    
    with app.app_context():
        # Check if the column already exists in the database
        try:
            # Try to execute a query that selects the agent_codename column
            # If it doesn't exist, this will raise an exception
            result = db.session.execute(text("SELECT agent_codename FROM user_progress LIMIT 1"))
            logger.info("Column agent_codename already exists in the database")
            return True
        except Exception as e:
            if "column \"agent_codename\" does not exist" in str(e).lower():
                logger.info("Column agent_codename does not exist, adding it now")
                
                # Read the SQL script
                script_path = os.path.join(os.path.dirname(__file__), 'add_agent_codename_column.sql')
                with open(script_path, 'r') as f:
                    sql_script = f.read()
                
                try:
                    # Execute the SQL script
                    db.session.execute(text(sql_script))
                    db.session.commit()
                    logger.info("Successfully added agent_codename column to user_progress table")
                    return True
                except Exception as add_error:
                    logger.error(f"Failed to add agent_codename column: {add_error}")
                    db.session.rollback()
                    return False
            else:
                logger.error(f"Error checking for agent_codename column: {e}")
                return False

if __name__ == "__main__":
    logger.info("Starting database update process")
    result = add_agent_codename_column()
    
    if result:
        logger.info("Database update completed successfully")
    else:
        logger.error("Database update failed")
        sys.exit(1)
