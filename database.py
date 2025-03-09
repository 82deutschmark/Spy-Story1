from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# For use with connection pooling if needed
def get_pooled_database_url():
    database_url = os.environ.get("DATABASE_URL")
    if database_url and '.us-east-2' in database_url:
        return database_url.replace('.us-east-2', '-pooler.us-east-2')
    return database_url

def init_db(app):
    """Initialize database with proper error handling"""
    try:
        logger.info("Initializing database...")
        db.init_app(app)
        with app.app_context():
            # Import models here to avoid circular imports
            from models import Currency, StoryGeneration, ImageAnalysis, StoryNode, StoryChoice, UserProgress, Transaction, Achievement, AIInstruction
            logger.info("Creating database tables...")
            db.create_all()
            logger.info("Database initialization completed successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise