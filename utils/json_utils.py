"""
json_utils.py - JSON Handling Utilities
=====================================

This module provides standardized functions for JSON handling, validation,
and error correction across the application.

Key Features:
------------
- JSON structure validation
- Error handling and correction
- Unicode normalization
- Safe serialization/deserialization

Usage Guidelines:
---------------
1. Use validate_json() for incoming data
2. Use safe_json_loads() for parsing external JSON
3. Use safe_json_dumps() for generating JSON responses
4. Handle encoding issues with normalize_strings_in_dict()
"""

import json
import logging
from typing import Dict, Any, Tuple, Optional, Union

logger = logging.getLogger(__name__)

def safe_json_loads(json_str: str) -> Tuple[bool, Optional[str], Any]:
    """
    Safely parse JSON string with error handling
    
    Args:
        json_str: The JSON string to parse
        
    Returns:
        Tuple of (success, error_message, parsed_data)
    """
    if not json_str:
        return False, "Empty JSON string", None
        
    try:
        data = json.loads(json_str)
        return True, None, data
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        
        # Try to fix common JSON errors and retry
        try:
            # Replace problematic escape characters
            fixed_json = json_str.replace("\\\\", "\\").replace("\\'", "'").replace('\\"', '"')
            # Remove control characters
            fixed_json = ''.join(ch for ch in fixed_json if ord(ch) >= 32 or ch in '\n\r\t')
            
            data = json.loads(fixed_json)
            logger.info("Successfully parsed JSON after fixing escape characters")
            return True, None, data
        except json.JSONDecodeError as e2:
            return False, f"JSON parsing failed: {str(e2)}", None

def safe_json_dumps(data: Any) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Safely convert Python object to JSON string
    
    Args:
        data: The data to convert to JSON
        
    Returns:
        Tuple of (success, error_message, json_string)
    """
    try:
        # Use ensure_ascii=False to preserve unicode characters
        json_str = json.dumps(data, ensure_ascii=False)
        return True, None, json_str
    except (TypeError, ValueError) as e:
        logger.error(f"JSON serialization error: {str(e)}")
        
        # Try to salvage the data by normalizing strings
        try:
            normalized_data = normalize_strings_in_dict(data)
            json_str = json.dumps(normalized_data, ensure_ascii=False)
            return True, None, json_str
        except Exception as e2:
            return False, f"JSON serialization failed: {str(e2)}", None

def normalize_strings_in_dict(data: Any) -> Any:
    """
    Recursively normalize and sanitize strings in a dictionary or list
    
    Args:
        data: The data structure to normalize
        
    Returns:
        Normalized data structure
    """
    if isinstance(data, dict):
        return {k: normalize_strings_in_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [normalize_strings_in_dict(item) for item in data]
    elif isinstance(data, str):
        try:
            # Normalize unicode and replace problematic characters
            return data.encode('utf-8', errors='replace').decode('utf-8')
        except Exception:
            return str(data)
    elif hasattr(data, '__dict__') and not isinstance(data, (int, float, bool, type(None))):
        # Handle model objects by converting to dict
        try:
            # Filter out SQLAlchemy internal attributes
            obj_dict = {k: v for k, v in data.__dict__.items() 
                     if not k.startswith('_') and k != 'metadata'}
            return normalize_strings_in_dict(obj_dict)
        except Exception:
            return str(data)
    else:
        return data

def validate_json_structure(data: Any, required_fields: Optional[Dict[str, type]] = None) -> Tuple[bool, Optional[Dict[str, str]]]:
    """
    Validate JSON structure against required fields and types
    
    Args:
        data: The data to validate
        required_fields: Dictionary mapping field names to expected types
        
    Returns:
        Tuple of (is_valid, error_dict)
    """
    if not isinstance(data, dict):
        return False, {"_general": f"Expected dictionary, got {type(data).__name__}"}
        
    if not required_fields:
        return True, None
        
    errors = {}
    
    # Check required fields and types
    for field, expected_type in required_fields.items():
        if field not in data:
            errors[field] = f"Missing required field: {field}"
        elif not isinstance(data[field], expected_type):
            errors[field] = f"Expected {expected_type.__name__}, got {type(data[field]).__name__}"
            
    return len(errors) == 0, errors if errors else None

def handle_jsonb_fields(data: Any) -> Any:
    """
    Specially handle JSONB fields from database models.
    
    Args:
        data: The data structure that may contain JSONB fields
        
    Returns:
        Sanitized data structure with proper JSON handling
    """
    if data is None:
        return None
        
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            # Handle potentially problematic JSONB fields
            if isinstance(value, dict) and hasattr(value, '_sa_instance_state'):
                # This is likely an SQLAlchemy model instance
                continue
                
            # Process the value recursively
            result[key] = handle_jsonb_fields(value)
        return result
    elif isinstance(data, list):
        return [handle_jsonb_fields(item) for item in data]
    elif hasattr(data, '__dict__') and not isinstance(data, (str, int, float, bool)):
        # Handle model objects by converting to dict
        try:
            # Filter out SQLAlchemy internal attributes
            obj_dict = {k: v for k, v in data.__dict__.items() 
                       if not k.startswith('_') and k != 'metadata'}
            return handle_jsonb_fields(obj_dict)
        except Exception:
            # Fall back to string representation
            return str(data)
    else:
        # Return primitive types as is
        return data

def ensure_valid_json_response(data: Any) -> Dict[str, Any]:
    """
    Ensure data is valid for JSON response, with fallbacks
    
    Args:
        data: The data to validate
        
    Returns:
        Sanitized data that can be safely serialized
    """
    # Check if data can be serialized
    try:
        json.dumps(data)
        return data
    except (TypeError, ValueError) as e:
        logger.error(f"Invalid JSON response data: {str(e)}")
        
        # Try to normalize and sanitize the data
        try:
            normalized_data = normalize_strings_in_dict(data)
            return normalized_data
        except Exception as e2:
            logger.error(f"Failed to normalize JSON data: {str(e2)}")
            
            # Last resort: convert to string representation
            return {"error": "JSON serialization failed", "original_data": str(data)}
