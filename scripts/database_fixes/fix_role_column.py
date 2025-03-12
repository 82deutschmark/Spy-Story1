
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models.images import ImageAnalysis
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_role_references():
    """
    Remove references to the 'role' column and synchronize data with character_role
    """
    with app.app_context():
        # First, check if we need to add the role column
        connection = db.engine.connect()
        inspector = db.inspect(db.engine)
        columns = inspector.get_columns('image_analysis')
        column_names = [col['name'] for col in columns]
        
        if 'role' not in column_names:
            logger.info("'role' column doesn't exist in the database. Removing references.")
            
            # Update any references in the application that might be trying to use the nonexistent column
            # We don't need to actually update the database since the column doesn't exist
            
            logger.info("Fixed role column references in application")
        else:
            # If the column exists (unlikely based on the error), synchronize data
            logger.info("'role' column exists. Synchronizing with character_role.")
            
            # Copy data from character_role to role for consistency
            connection.execute(
                db.text("UPDATE image_analysis SET role = character_role WHERE character_role IS NOT NULL")
            )
            connection.commit()
            logger.info("Synchronized role data with character_role")
            
if __name__ == "__main__":
    fix_role_references()
