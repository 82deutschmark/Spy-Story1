import logging
from flask import jsonify
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """Register error handlers for the Flask application"""
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle all unhandled exceptions"""
        # Get detailed error info
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Unhandled exception: {str(e)}\nTraceback:\n{error_details}")
        
        # If it's an HTTP exception, use its error code
        if isinstance(e, HTTPException):
            response = {
                'success': False,
                'error': str(e),
                'status_code': e.code,
                'details': str(e)
            }
            return jsonify(response), e.code
        
        # For all other exceptions, return a 500 error with more detail
        response = {
            'success': False,
            'error': str(e),
            'status_code': 500,
            'details': error_details if app.debug else 'An unexpected error occurred'
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

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({"error": "405 Method Not Allowed: The method is not allowed for the requested URL.", "success": False}), 405

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({"error": "500 Internal Server Error", "success": False}), 500
