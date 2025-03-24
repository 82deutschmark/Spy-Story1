"""
Main application entry point for the Spy Story game.
"""

import os
import sys
import logging
from flask import Flask, json, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool
import traceback

# Configure basic logging to display INFO messages on the console
logging.basicConfig(level=logging.INFO)

# Optionally, set the specific logger for httpx to DEBUG for more detail
logging.getLogger("httpx").setLevel(logging.DEBUG)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add the project root directory to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.append(project_root)

# Load environment variables
load_dotenv()

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Configure the app
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

    # Database configuration with connection pooling
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    if database_url.startswith('postgresql'):
        # Add connection pooling settings for PostgreSQL
        engine = create_engine(
            database_url,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=1800,  # Recycle connections after 30 minutes
            pool_pre_ping=True,  # Enable connection health checks
            connect_args={
                'connect_timeout': 10,
                'keepalives': 1,
                'keepalives_idle': 30,
                'keepalives_interval': 10,
                'keepalives_count': 5
            }
        )
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
            'poolclass': QueuePool,
            'pool_size': 5,
            'max_overflow': 10,
            'pool_timeout': 30,
            'pool_recycle': 1800,
            'pool_pre_ping': True
        }

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    from database import db, init_db
    from flask_migrate import Migrate

    db.init_app(app)
    migrate = Migrate(app, db)

    # Enable CORS
    CORS(app)

    # Configure Flask JSON encoder for better Unicode handling
    from flask.json.provider import DefaultJSONProvider
    
    class ImprovedJSONProvider(DefaultJSONProvider):
        """Custom JSON provider with better handling of special characters"""
        def dumps(self, obj, **kwargs):
            try:
                return super().dumps(obj, **kwargs)
            except TypeError:
                # Convert objects that can't be serialized to strings
                if isinstance(obj, dict):
                    obj = {k: str(v) if not isinstance(v, (dict, list, str, int, float, bool, type(None))) else v 
                          for k, v in obj.items()}
                return super().dumps(obj, **kwargs)
    
    # Apply the improved JSON provider
    app.json_provider_class = ImprovedJSONProvider
    app.json = ImprovedJSONProvider(app)

    # Configure JSON error handling
    @app.before_request
    def handle_json_error():
        """Set up improved JSON request handling"""
        # Will be handled by error handlers if JSON is invalid
        pass


    # Register blueprints
    logger.info("Registering blueprints")
    from routes.main_routes import main_bp

    app.register_blueprint(main_bp)

    #Error Handling (Example - Needs expansion for a complete solution)
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad Request'}), 400

    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({'error': 'Internal Server Error'}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0')