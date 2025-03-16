"""
main.py - Primary Application Entry Point
=======================================

!!! IMPORTANT - READ BEFORE MODIFYING !!!
This is the core application initialization file that sets up all Flask
components, middleware, and database connections.

Key Features:
------------
- Flask application creation and configuration
- Database initialization
- Blueprint registration
- Middleware setup
- Static file configuration
- Error handling

Dependencies:
-----------
- Flask: Web framework
- SQLAlchemy: Database ORM
- Bootstrap: UI framework
- CORS: Cross-origin handling
- ProxyFix: Proxy middleware
- Custom middleware and utilities

Configuration:
------------
- Environment variables (loaded via config.py)
- Database settings
- Static file settings
- CORS policies
- Logging configuration

Initialization Order:
------------------
1. Load environment configuration
2. Create Flask application
3. Initialize database
4. Setup Bootstrap
5. Configure CORS
6. Add middleware
7. Register error handlers
8. Register blueprints
9. Create database tables

Usage Guidelines:
---------------
1. NEVER modify initialization order
2. ALWAYS maintain proper error handling
3. Keep middleware chain consistent
4. Preserve blueprint registration order
5. Maintain database connection settings

Integration Points:
----------------
- Database models
- Route blueprints
- Error handlers
- Static file serving
- API endpoints
"""

import os
import logging
from flask import Flask
from database import db
from flask_cors import CORS
from config import get_config
from flask_bootstrap import Bootstrap
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
config = get_config()
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app():
    """Create and configure the Flask application"""
    logger.info("Creating Flask application")
    app = Flask(__name__, 
                static_url_path='/static',
                static_folder='static')

    # Load configuration
    app_config = get_config()
    app.config.from_object(app_config)
    app.secret_key = app_config.SESSION_SECRET
    app.config['SQLALCHEMY_DATABASE_URI'] = app_config.SQLALCHEMY_DATABASE_URI
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    logger.info(f"Loaded configuration: {app_config.__class__.__name__}")
    
    # Configure static files
    app.config['STATIC_FOLDER'] = 'static'
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching during development
    
    # Initialize Bootstrap
    Bootstrap(app)
    logger.info("Initialized Bootstrap")

    # Initialize database
    db.init_app(app)
    logger.info("Initialized database")

    # Initialize CORS
    CORS(app, resources={
        r"/api/unity/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    logger.info("Initialized CORS")

    # Add request logger middleware first
    from middleware.request_logger import RequestLoggerMiddleware
    # We need to register the before_request and after_request hooks directly with Flask
    # instead of trying to wrap the WSGI app
    middleware = RequestLoggerMiddleware(app)
    logger.info("Added request logger middleware")

    # Apply ProxyFix middleware
    app.wsgi_app = ProxyFix(app.wsgi_app)
    logger.info("Applied ProxyFix middleware")

    # Register error handlers
    from utils.error_handlers import register_error_handlers
    register_error_handlers(app)
    logger.info("Registered error handlers")

    # Register blueprints
    with app.app_context():
        logger.info("Registering blueprints")
        # Import blueprint objects
        from routes.main_routes import main_bp
        from routes.api_routes import api_bp
        from api.unity_routes import unity_api
        from api.game_api import game_api

        # Register blueprints
        app.register_blueprint(main_bp)
        app.register_blueprint(api_bp, url_prefix='/api')
        app.register_blueprint(unity_api, url_prefix='/api/unity')
        app.register_blueprint(game_api, url_prefix='/api/game')
        logger.info("Registered all blueprints")

        # Create database tables
        db.create_all()
        logger.info("Created database tables")

    # Ensure JS modules are served with correct MIME type
    import mimetypes
    mimetypes.add_type('application/javascript', '.js')
    logger.info("Added JavaScript MIME type")

    logger.info("Flask application creation complete")
    return app

if __name__ == "__main__":
    app = create_app()
    logger.info("Starting Flask development server")
    app.run(host="0.0.0.0", port=5000, debug=True)