"""
Flask application factory for the Spy Story game.
"""

from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    """Create and configure the Flask application."""
    # Load environment variables
    load_dotenv()
    
    # Create Flask app
    app = Flask(__name__)
    
    # Configure the app
    app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # CORS configuration
    CORS(app, resources={
        r"/api/unity/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Register blueprints
    from routes import main_bp
    from api.unity_routes import unity_api
    
    app.register_blueprint(main_bp)
    app.register_blueprint(unity_api, url_prefix='/api/unity')
    
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