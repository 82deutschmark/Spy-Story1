import os
import logging
from flask import Flask
from dotenv import load_dotenv
from database import db
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def create_app(test_config=None):
    """Application factory function to create and configure the Flask app"""
    # Load environment variables
    load_dotenv()

    # Create and configure the app
    app = Flask(__name__)
    app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

    # Initialize database
    db.init_app(app)

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

    # Create database tables
    with app.app_context():
        db.create_all()

    return app

# This allows the app to be run directly with 'python app.py'
if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)