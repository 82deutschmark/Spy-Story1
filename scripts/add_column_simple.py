"""
Simple script to add agent_codename column to user_progress table
"""
import os
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from sqlalchemy import text
    from main import create_app
    from database import db
    
    # Create app context
    app = create_app()
    
    with app.app_context():
        try:
            # Try checking if the column exists
            db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'agent_codename'"))
            db.session.commit()
            
            # Add the column if it doesn't exist
            db.session.execute(text("ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS agent_codename VARCHAR(255)"))
            db.session.commit()
            logger.info("Added agent_codename column to user_progress table")
            
            # Create index
            db.session.execute(text("CREATE INDEX IF NOT EXISTS ix_user_progress_agent_codename ON user_progress (agent_codename)"))
            db.session.commit()
            logger.info("Created index on agent_codename column")
            
            # Populate from existing data
            db.session.execute(text("UPDATE user_progress SET agent_codename = game_state->>'protagonist_name' WHERE agent_codename IS NULL AND game_state->>'protagonist_name' IS NOT NULL"))
            db.session.commit()
            logger.info("Populated agent_codename column from existing data")
            
            logger.info("Database update completed successfully")
        except Exception as e:
            logger.error(f"Error updating database: {e}")
            db.session.rollback()
            sys.exit(1)
except Exception as e:
    logger.error(f"Error importing modules: {e}")
    sys.exit(1)
