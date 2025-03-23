
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Initialize SQLAlchemy with no settings
db = SQLAlchemy()

def init_db(app):
    """Initialize database with app context"""
    try:
        db.init_app(app)
        Migrate(app, db)
        
        # Create all tables
        with app.app_context():
            db.create_all()
            
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
        raise
