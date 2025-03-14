import os
import logging
from flask import Flask
from database import db
from flask_cors import CORS
from config import get_config

# Configure logging
config = get_config()
logging.basicConfig(level=getattr(logging, config.LOG_LEVEL))
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)

    # Load configuration
    app_config = get_config()
    app.config.from_object(app_config)
    app.secret_key = app_config.SESSION_SECRET
    app.config['SQLALCHEMY_DATABASE_URI'] = app_config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

    # Initialize database
    db.init_app(app)

    # Initialize CORS
    CORS(app, resources={
        r"/api/unity/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Add request logger middleware
    from middleware.request_logger import RequestLoggerMiddleware
    middleware = RequestLoggerMiddleware(app)

    # Register error handlers
    from utils.error_handlers import register_error_handlers
    register_error_handlers(app)

    # Register blueprints
    with app.app_context():
        # Import blueprint objects
        from routes.main_routes import main_bp
        from api.unity_routes import unity_api
        from api.game_api import game_api

        # Register blueprints
        app.register_blueprint(main_bp)
        app.register_blueprint(unity_api, url_prefix='/api/unity')
        app.register_blueprint(game_api, url_prefix='/api/game')

        # Create database tables
        db.create_all()

    # Ensure JS modules are served with correct MIME type
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    import mimetypes
    mimetypes.add_type('application/javascript', '.js')

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000)