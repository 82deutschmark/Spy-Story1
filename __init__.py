
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def create_app(test_config=None):
    """Application factory for Flask app"""
    load_dotenv()
    
    # Create and configure the app
    app = Flask(__name__)
    app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    
    # CORS configuration
    CORS(app, resources={
        r"/api/unity/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Initialize extensions
    from database import db
    db.init_app(app)
    
    # Register blueprints
    from routes import main_bp
    from api.unity_routes import unity_api
    
    app.register_blueprint(main_bp)
    app.register_blueprint(unity_api, url_prefix='/api/unity')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app
