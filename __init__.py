from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from dotenv import load_dotenv
import os
import sys
import logging

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Import database after app is created to avoid circular imports
from .database import db
from .api.unity_routes import unity_api

def create_app():
    # Load environment variables
    load_dotenv()
    
    # Create Flask app
    app = Flask(__name__)
    app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    
    # Initialize database and migrations
    db.init_app(app)
    migrate = Migrate(app, db)
    
    # CORS configuration
    CORS(app, resources={
        r"/api/unity/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Register blueprints
    from .routes import main_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(unity_api, url_prefix='/api/unity')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app
