from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import logging
import time
import codecs
from sqlalchemy.exc import OperationalError, SQLAlchemyError

# Configure logging
logger = logging.getLogger(__name__)

# Initialize SQLAlchemy with no settings
db = SQLAlchemy()

def init_db(app):
    """Initialize database with robust error handling and retry mechanism"""
    db.init_app(app)

    # Register database connection error handler
    @db.event.listens_for(db.engine, "connect")
    def connect(dbapi_connection, connection_record):
        """Ensure proper UTF-8 encoding for database connections"""
        # Ensure proper UTF-8 handling for SQLite
        if db.engine.dialect.name == 'sqlite':
            # Add pragmas for better SQLite behavior
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA encoding='UTF-8'")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.execute("PRAGMA temp_store=MEMORY")
            cursor.execute("PRAGMA mmap_size=30000000000")
            cursor.close()

    # Initialize database with retry
    max_retries = 3
    retry_delay = 2
    current_attempt = 0

    while current_attempt < max_retries:
        try:
            with app.app_context():
                db.create_all()
            logger.info("Database initialization successful")
            return
        except OperationalError as e:
            current_attempt += 1
            logger.warning(f"Database connection error (attempt {current_attempt}/{max_retries}): {str(e)}")
            if current_attempt < max_retries:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error("Failed to initialize database after maximum retries")
                raise
        except SQLAlchemyError as e:
            logger.error(f"Database initialization error: {str(e)}")
            raise