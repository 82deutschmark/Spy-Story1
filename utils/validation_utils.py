
import re
from typing import Dict, Any, List, Optional, Tuple

def validate_string_length(
    value: Optional[str], 
    min_length: int = 1, 
    max_length: int = 255, 
    field_name: str = "field"
) -> Tuple[bool, Optional[str]]:
    """
    Validate string length is within acceptable range
    
    Args:
        value: The string to validate
        min_length: Minimum acceptable length
        max_length: Maximum acceptable length
        field_name: Name of the field for error messages
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if value is None:
        return False, f"{field_name} cannot be None"
        
    if len(value) < min_length:
        return False, f"{field_name} must be at least {min_length} characters"
        
    if len(value) > max_length:
        return False, f"{field_name} cannot exceed {max_length} characters"
        
    return True, None

def validate_currency_amount(amount: Any, field_name: str = "amount") -> Tuple[bool, Optional[str], Optional[int]]:
    """
    Validate and convert currency amount
    
    Args:
        amount: The amount to validate (string or number)
        field_name: Name of the field for error messages
        
    Returns:
        Tuple of (is_valid, error_message, converted_amount)
    """
    try:
        # Convert string to int if needed
        amount_int = int(amount) if not isinstance(amount, int) else amount
        
        if amount_int <= 0:
            return False, f"{field_name} must be greater than zero", None
            
        return True, None, amount_int
    except (ValueError, TypeError):
        return False, f"{field_name} must be a valid number", None

def validate_story_parameters(data: Dict[str, Any]) -> Tuple[bool, Optional[Dict[str, str]]]:
    """
    Validate story generation parameters
    
    Args:
        data: Dictionary of story parameters
        
    Returns:
        Tuple of (is_valid, error_dict)
    """
    errors = {}
    
    # Validate required parameters
    required_fields = ['conflict', 'setting', 'narrative_style', 'mood']
    for field in required_fields:
        if field not in data or not data[field]:
            errors[field] = f"{field} is required"
            
    # Validate string lengths for all text fields
    string_fields = [
        ('conflict', 3, 100), 
        ('setting', 3, 100),
        ('narrative_style', 3, 100),
        ('mood', 3, 100),
        ('custom_conflict', 0, 150),
        ('custom_setting', 0, 150),
        ('custom_narrative', 0, 150),
        ('custom_mood', 0, 150),
        ('custom_choice', 0, 500),
        ('protagonist_name', 0, 50),
        ('protagonist_gender', 0, 20)
    ]
    
    for field, min_len, max_len in string_fields:
        if field in data and data[field]:
            is_valid, error = validate_string_length(
                data[field], 
                min_length=min_len, 
                max_length=max_len,
                field_name=field.replace('_', ' ').title()
            )
            if not is_valid:
                errors[field] = error
                
    return len(errors) == 0, errors if errors else None
