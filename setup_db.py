import os
import logging
from dotenv import load_dotenv
from main import create_app
from database import db

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_database():
    """Initialize the database by creating all tables"""
    try:
        app = create_app()
        with app.app_context():
            db.create_all()
            logger.info("Database tables created successfully")
            return True
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        return False

if __name__ == "__main__":
    # Check if database URL is configured
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        logger.warning("DATABASE_URL environment variable not set.")
        logger.info("Please set up a PostgreSQL database in the Replit Database tab.")
    else:
        logger.info(f"Using database URL: {database_url}")
        success = initialize_database()
        if success:
            logger.info("Database setup complete.")
        else:
            logger.error("Database setup failed.")
