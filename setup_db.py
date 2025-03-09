
import os
from app import app, db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def initialize_database():
    """Initialize the database by creating all tables"""
    try:
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
