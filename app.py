import os
import logging
from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_bootstrap import Bootstrap
from flask_cors import CORS

from database import db
from config import get_config
from middleware.request_logger import RequestLoggerMiddleware
from utils.error_handlers import register_error_handlers
from admin_config import init_admin
from api.unity_routes import unity_api
from api.game_api import game_api

# Configure logging
logger = logging.getLogger(__name__)

def create_app(config_name=None):
    """Create and configure the Flask application"""
    app = Flask(__name__)

    # Load configuration
    app_config = get_config()
    app.config.from_object(app_config)
    app.secret_key = app_config.SESSION_SECRET

    # Initialize database
    db.init_app(app)

    # Initialize Bootstrap
    bootstrap = Bootstrap(app)

    # Apply ProxyFix middleware for proper handling of reverse proxies
    app.wsgi_app = ProxyFix(app.wsgi_app)

    # Add request logger middleware
    RequestLoggerMiddleware(app)

    # CORS configuration
    CORS(app, resources={
        r"/api/unity/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Register error handlers
    register_error_handlers(app)

    # Register blueprints
    with app.app_context():
        # Import and register blueprints
        from routes.main_routes import main_bp
        from routes.debug_routes import debug_bp
        from routes.api_routes import api_bp

        app.register_blueprint(main_bp)
        app.register_blueprint(debug_bp)
        app.register_blueprint(api_bp)
        app.register_blueprint(unity_api)
        app.register_blueprint(game_api)

        # Create database tables
        db.create_all()

        # Initialize Flask-Admin
        init_admin(app)

        # Ensure JS modules are served with correct MIME type
        import mimetypes
        mimetypes.add_type('application/javascript', '.js')

    # Set up MIME types for ES modules
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

    return app

# Create an app instance for WSGI servers
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)