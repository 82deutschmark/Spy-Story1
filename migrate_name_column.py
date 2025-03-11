
import os
import logging
from flask import Flask
from database import db
from dotenv import load_dotenv
from sqlalchemy import text

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def create_app():
    """Create a Flask app instance for migration"""
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    
    # Initialize database
    db.init_app(app)
    
    return app

def migrate_name_column():
    """Add the 'name' column to image_analysis table if it doesn't exist"""
    app = create_app()
    
    with app.app_context():
        # Check if the column exists
        try:
            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='image_analysis' AND column_name='name'"))
            column_exists = result.fetchone() is not None
            
            if not column_exists:
                logger.info("Adding 'name' column to image_analysis table...")
                db.session.execute(text("ALTER TABLE image_analysis ADD COLUMN name VARCHAR(255)"))
                db.session.commit()
                logger.info("Successfully added 'name' column")
                
                # Copy character_name values to name for backward compatibility
                db.session.execute(text("UPDATE image_analysis SET name = character_name WHERE character_name IS NOT NULL"))
                db.session.commit()
                logger.info("Copied existing character_name values to name column")
            else:
                logger.info("'name' column already exists in image_analysis table")
                
        except Exception as e:
            logger.error(f"Error during migration: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    migrate_name_column()
