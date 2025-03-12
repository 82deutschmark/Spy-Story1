
from flask import Blueprint

# Import all route modules
from .main_routes import main_bp
from .debug_routes import debug_bp 
from .api_routes import api_bp

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    app.register_blueprint(main_bp)
    app.register_blueprint(debug_bp, url_prefix='/debug')
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Log registered blueprints
    from logging import getLogger
    logger = getLogger(__name__)
    logger.info("Registered blueprints: main, debug, api")
