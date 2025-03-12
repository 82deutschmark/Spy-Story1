
import os
import logging
from app import app
from database import db
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_personality_traits_column():
    """Add the personality_traits column to the image_analysis table if it doesn't exist"""
    try:
        with app.app_context():
            # Check if the column exists
            inspector = db.inspect(db.engine)
            columns = [col['name'] for col in inspector.get_columns('image_analysis')]
            
            if 'personality_traits' not in columns:
                logger.info("Adding 'personality_traits' column to image_analysis table...")
                # Use JSONB type like other similar columns
                db.session.execute(text("ALTER TABLE image_analysis ADD COLUMN personality_traits JSONB"))
                db.session.commit()
                logger.info("Successfully added 'personality_traits' column")
            else:
                logger.info("'personality_traits' column already exists in image_analysis table")
                
    except Exception as e:
        logger.error(f"Error during column addition: {str(e)}")
        # Make sure to rollback any failed transaction
        db.session.rollback()
        raise

if __name__ == "__main__":
    add_personality_traits_column()
