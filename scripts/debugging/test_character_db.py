
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from flask import Flask
from database import db
from models.character_data import Character
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Create a minimal Flask app for testing
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def test_character_queries():
    """Test database queries to ensure they're using the characters table"""
    with app.app_context():
        logger.info("Testing character table queries...")
        
        # Test 1: Check if the Character model is correctly accessing the 'characters' table
        try:
            # Get table name from model
            table_name = Character.__tablename__
            logger.info(f"Character model is using table: {table_name}")
            assert table_name == 'characters', "Table name should be 'characters'"
        except Exception as e:
            logger.error(f"Table name check failed: {str(e)}")
            
        # Test 2: Attempt a simple query to verify table access
        try:
            character_count = Character.query.count()
            logger.info(f"Successfully queried Character table. Total records: {character_count}")
            
            if character_count > 0:
                # Test 3: Retrieve first character to verify schema
                first_character = Character.query.first()
                logger.info(f"Sample character retrieved: {first_character.character_name}")
                logger.info(f"Character attributes: id={first_character.id}, role={first_character.character_role}")
        except Exception as e:
            logger.error(f"Character query failed: {str(e)}")
            
        # Test 4: Check routes to see if they're properly using the Character model
        from routes.main_routes import main_bp
        # Flask blueprints use .route decorator, not .routes attribute
        logger.info(f"Checking routes in {main_bp.name} blueprint")
        
        # Test 5: Look for specific code patterns in main_routes.py that use Character model
        import inspect
        import routes.main_routes as main_routes
        
        for name, func in inspect.getmembers(main_routes, inspect.isfunction):
            source = inspect.getsource(func)
            if 'Character' in source:
                logger.info(f"Found Character model usage in function: {name}")
                # Extract relevant lines
                for line in source.split('\n'):
                    if 'Character' in line and not line.strip().startswith('#'):
                        logger.info(f"  Query: {line.strip()}")

if __name__ == "__main__":
    test_character_queries()
    logger.info("Character database tests completed.")
