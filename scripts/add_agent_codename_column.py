"""
Add Agent Codename Column Script
================================

This script directly modifies the database to add the agent_codename column
to the UserProgress table and populates it with data from the existing game_state.

Usage:
    python scripts/add_agent_codename_column.py
"""

import os
import sys
import logging

# Add the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

def main():
    """Main function to add the agent_codename column and populate it"""
    # Import dependencies inside the function to ensure proper path resolution
    from main import create_app
    from sqlalchemy import Column, String, text
    from sqlalchemy.exc import SQLAlchemyError
    from models.user import UserProgress
    from database import db
    
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        try:
            # Check if column already exists
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('user_progress')]
            
            if 'agent_codename' not in columns:
                logger.info("Adding agent_codename column to user_progress table")
                
                # Add the column using raw SQL for maximum compatibility
                db.session.execute(text(
                    "ALTER TABLE user_progress ADD COLUMN agent_codename VARCHAR(255)"
                ))
                
                # Create index for faster lookups
                db.session.execute(text(
                    "CREATE INDEX ix_user_progress_agent_codename ON user_progress (agent_codename)"
                ))
                
                # Commit the schema changes
                db.session.commit()
                logger.info("Column agent_codename added successfully")
            else:
                logger.info("Column agent_codename already exists")
            
            # Populate the column from game_state data
            migrate_count = 0
            users = UserProgress.query.filter(UserProgress.agent_codename.is_(None)).all()
            logger.info(f"Found {len(users)} user records without agent_codename")
            
            for user in users:
                try:
                    if user.game_state and 'protagonist_name' in user.game_state:
                        user.agent_codename = user.game_state.get('protagonist_name')
                        migrate_count += 1
                except Exception as e:
                    logger.error(f"Error processing user {user.id}: {str(e)}")
            
            if migrate_count > 0:
                db.session.commit()
                logger.info(f"Successfully populated {migrate_count} agent_codename values")
            
            logger.info("Database migration completed successfully")
            
        except SQLAlchemyError as e:
            logger.error(f"Database error: {str(e)}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"Error during migration: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    main()
