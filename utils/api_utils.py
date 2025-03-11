
import logging
from flask import jsonify
from typing import Dict, Any, List, Optional, Tuple, Union

# Configure logging
logger = logging.getLogger(__name__)

def api_success_response(
    message: str = "Operation successful", 
    data: Optional[Dict[str, Any]] = None,
    status_code: int = 200
) -> Tuple[Dict[str, Any], int]:
    """
    Create a standardized success response for API endpoints.
    
    Args:
        message: Success message
        data: Optional data to include in the response
        status_code: HTTP status code
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    response = {
        'success': True,
        'message': message
    }
    
    if data:
        response.update(data)
        
    return jsonify(response), status_code

def api_error_response(
    error: Union[str, Exception],
    status_code: int = 500,
    error_type: str = "server_error",
    log_error: bool = True
) -> Tuple[Dict[str, Any], int]:
    """
    Create a standardized error response for API endpoints.
    
    Args:
        error: Error message or exception
        status_code: HTTP status code
        error_type: Type of error for categorization
        log_error: Whether to log the error
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    error_message = str(error)
    
    if log_error:
        logger.error(f"API error ({error_type}): {error_message}")
    
    return jsonify({
        'success': False,
        'error': error_message,
        'error_type': error_type
    }), status_code

def paginate_query_results(
    query_results: List[Any],
    page: int,
    per_page: int,
    total: int
) -> Dict[str, Any]:
    """
    Format paginated query results in a standard format.
    
    Args:
        query_results: List of query results
        page: Current page number
        per_page: Items per page
        total: Total number of items
        
    Returns:
        Dictionary with results and pagination info
    """
    total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0
    
    return {
        'results': query_results,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': total_pages,
            'has_next': page < total_pages,
            'has_prev': page > 1
        }
    }

def validate_action(
    action_type: str,
    resource_id: Optional[int] = None,
    confirmation: Optional[str] = None,
    required_confirmation: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Validate potentially dangerous actions like deletions.
    
    Args:
        action_type: Type of action (delete, delete_all, etc.)
        resource_id: ID of the resource being modified
        confirmation: Confirmation string provided by the user
        required_confirmation: Required confirmation string
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    dangerous_actions = ["delete_all", "purge", "reset"]
    
    if action_type in dangerous_actions:
        if not confirmation:
            return False, "Confirmation required for this action"
            
        if required_confirmation and confirmation != required_confirmation:
            return False, f"Invalid confirmation. Please type '{required_confirmation}' to confirm"
    
    if action_type == "delete" and not resource_id:
        return False, "Resource ID is required for deletion"
        
    return True, None
