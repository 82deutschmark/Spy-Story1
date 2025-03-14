
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

def sync_role_values():
    """
    Synchronize values between role and character_role fields
    if both columns exist in the database
    """
    with app.app_context():
        # Check if both columns exist
        inspector = db.inspect(db.engine)
        columns = inspector.get_columns('image_analysis')
        column_names = [col['name'] for col in columns]
        
        has_role = 'role' in column_names
        has_character_role = 'character_role' in column_names
        
        if has_role and has_character_role:
            logger.info("Both role and character_role columns exist, synchronizing values")
            
            with db.engine.connect() as conn:
                # Update character_role with values from role where character_role is NULL
                conn.execute(db.text(
                    "UPDATE image_analysis SET character_role = role "
                    "WHERE role IS NOT NULL AND character_role IS NULL"
                ))
                
                # Update role with values from character_role where role is NULL
                conn.execute(db.text(
                    "UPDATE image_analysis SET role = character_role "
                    "WHERE character_role IS NOT NULL AND role IS NULL"
                ))
                
                # Count how many rows were potentially affected
                result = conn.execute(db.text(
                    "SELECT COUNT(*) FROM image_analysis "
                    "WHERE role != character_role AND role IS NOT NULL AND character_role IS NOT NULL"
                ))
                mismatched_count = result.scalar()
                
                if mismatched_count > 0:
                    logger.warning(f"Found {mismatched_count} records where role and character_role have different values")
                    # Sync mismatched values by preferring character_role
                    conn.execute(db.text(
                        "UPDATE image_analysis SET role = character_role "
                        "WHERE role != character_role AND character_role IS NOT NULL"
                    ))
                
                conn.commit()
                logger.info("Role synchronization completed successfully")
        
        elif has_role:
            logger.info("Only role column exists, no synchronization needed")
        elif has_character_role:
            logger.info("Only character_role column exists, no synchronization needed")
        else:
            logger.warning("Neither role nor character_role column exists, please check your model definitions")

if __name__ == "__main__":
    sync_role_values()
