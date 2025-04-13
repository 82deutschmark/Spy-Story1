"""
Migration Script - Populate Agent Codename
========================================

This script populates the newly added agent_codename column in UserProgress
with values from the game_state JSON field for backward compatibility.

Usage:
    Run this script after adding the agent_codename column to UserProgress
    and before using the new column in production.

    $ python migrations/populate_agent_codename.py
"""

import os
import sys
import logging

# Add the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models import UserProgress
from database import db
from flask import Flask
from main import create_app

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def populate_agent_codename():
    """
    Populate the agent_codename column in UserProgress with values from game_state.
    """
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        # Find all user progress records without an agent_codename
        users = UserProgress.query.filter(UserProgress.agent_codename.is_(None)).all()
        logger.info(f"Found {len(users)} user records without agent_codename")
        
        updated_count = 0
        
        for user in users:
            if user.game_state and 'protagonist_name' in user.game_state:
                # Extract protagonist_name from game_state
                agent_codename = user.game_state.get('protagonist_name')
                if agent_codename:
                    user.agent_codename = agent_codename
                    updated_count += 1
                    logger.info(f"Updated user {user.id} with agent_codename: {agent_codename}")
        
        # Commit all changes
        if updated_count > 0:
            db.session.commit()
            logger.info(f"Successfully updated {updated_count} user records")
        else:
            logger.info("No user records needed updating")

if __name__ == "__main__":
    populate_agent_codename()
    logger.info("Migration completed")
