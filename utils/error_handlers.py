
import logging
from flask import jsonify
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """Register error handlers for the Flask application"""
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle all unhandled exceptions"""
        logger.error(f"Unhandled exception: {str(e)}", exc_info=True)
        
        # If it's an HTTP exception, use its error code
        if isinstance(e, HTTPException):
            response = {
                'success': False,
                'error': str(e),
                'status_code': e.code
            }
            return jsonify(response), e.code
        
        # For all other exceptions, return a 500 error
        response = {
            'success': False,
            'error': 'An unexpected error occurred',
            'status_code': 500
        }
        return jsonify(response), 500
    
    @app.errorhandler(404)
    def not_found(e):
        """Handle 404 errors"""
        response = {
            'success': False,
            'error': 'Resource not found',
            'status_code': 404
        }
        return jsonify(response), 404
    
    @app.errorhandler(400)
    def bad_request(e):
        """Handle 400 errors"""
        response = {
            'success': False,
            'error': str(e) if str(e) else 'Bad request',
            'status_code': 400
        }
        return jsonify(response), 400
