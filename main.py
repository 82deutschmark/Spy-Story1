
import os
import logging
from flask import Flask
from flask_bootstrap import Bootstrap4
from werkzeug.middleware.proxy_fix import ProxyFix
from database import db
from flask_cors import CORS
from config import get_config
from admin_config import init_admin

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
    
    # Add ProxyFix middleware
    app.wsgi_app = ProxyFix(app.wsgi_app)

    # Initialize database
    db.init_app(app)

    # Initialize Bootstrap
    bootstrap = Bootstrap4(app)

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
    app.wsgi_app = RequestLoggerMiddleware(app.wsgi_app)

    # Register error handlers
    from utils.error_handlers import register_error_handlers
    register_error_handlers(app)

    # Register blueprints
    with app.app_context():
        from routes import register_blueprints
        register_blueprints(app)
        
        # Import these after db is initialized to avoid circular imports
        from api.unity_routes import unity_api
        from api.game_api import game_api
        app.register_blueprint(unity_api)
        app.register_blueprint(game_api)

        # Create database tables
        db.create_all()

        # Initialize Flask-Admin
        init_admin(app)

    return app

if __name__ == "__main__":
    app = create_app()

    # Ensure JS modules are served with correct MIME type
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

    # Register custom MIME types for ES modules
    import mimetypes
    mimetypes.add_type('application/javascript', '.js')

    app.run(host="0.0.0.0", port=5000, debug=True)
