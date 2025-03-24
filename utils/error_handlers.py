import logging
import json
import traceback
from flask import jsonify, request
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)

def validate_json_structure(data):
    """
    Validate JSON data structure and handle encoding issues
    
    Args:
        data: The data to validate
        
    Returns:
        Tuple of (is_valid, error_message, sanitized_data)
    """
    if data is None:
        return False, "JSON data is None", None
        
    # Check if it's already a dict/list (parsed)
    if isinstance(data, (dict, list)):
        try:
            # Test round-trip serialization
            json_str = json.dumps(data, ensure_ascii=False)
            parsed_data = json.loads(json_str)
            return True, None, parsed_data
        except (TypeError, ValueError) as e:
            return False, f"JSON serialization error: {str(e)}", None
    
    # If it's a string, try to parse it
    if isinstance(data, str):
        try:
            parsed_data = json.loads(data)
            return True, None, parsed_data
        except json.JSONDecodeError as e:
            return False, f"JSON parsing error: {str(e)}", None
            
    return False, f"Invalid data type: {type(data)}", None

def register_error_handlers(app):
    """Register error handlers for the Flask application"""
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        """Handle all unhandled exceptions"""
        error_details = traceback.format_exc()
        
        # Log the complete error
        logger.error(f"Unhandled exception: {str(e)}\nTraceback:\n{error_details}")
        
        # Check if this was a JSON-related error
        is_json_error = False
        if hasattr(e, '__cause__') and e.__cause__ is not None:
            if isinstance(e.__cause__, (json.JSONDecodeError, UnicodeError)):
                is_json_error = True
                logger.error(f"JSON encoding/decoding error detected: {str(e.__cause__)}")
                
                # Log request data if available
                if request and request.data:
                    try:
                        logger.error(f"Request data (first 1000 bytes): {request.data[:1000]}")
                    except:
                        pass
        
        # Create appropriate response
        response = {
            'success': False,
            'error': str(e),
            'status_code': 500,
            'error_type': 'json_error' if is_json_error else 'general_error',
            'details': error_details if app.debug else 'An internal error occurred'
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
