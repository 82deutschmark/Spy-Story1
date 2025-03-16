from flask import Flask, session
from config import get_config
from database import db, init_db
from routes import register_blueprints
import logging
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    config = get_config()
    app.config.from_object(config)
    
    # Set the secret key from environment variable
    app.secret_key = os.environ.get('SESSION_SECRET', 'dev-secret-key')
    
    # Configure logging
    logging.basicConfig(level=app.config['LOG_LEVEL'])
    
    # Initialize database
    init_db(app)
    
    # Register routes
    register_blueprints(app)
    
    # Add FLASK_CONFIG to JavaScript
    @app.context_processor
    def inject_flask_config():
        return {
            'FLASK_CONFIG': {
                'staticUrl': '/static/',
                'apiBaseUrl': '/api',
                'env': os.environ.get('FLASK_ENV', 'development'),
                'debug': app.config['DEBUG']
            }
        }
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)

# Dummy database.py file
# database.py
import os
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()