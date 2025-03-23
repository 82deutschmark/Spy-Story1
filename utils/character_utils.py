"""
character_utils.py - Character Data Extraction Utilities
====================================================

This module provides utility functions for extracting and processing character data
from various data structures used in the game. These functions help maintain
consistent character information handling across the application.
"""

from typing import Dict, List, Any, Optional, Union

def extract_character_traits(character_info: Dict[str, Any]) -> Union[List[str], Dict[str, Any]]:
    """Extract character traits from character info dictionary.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        Either a list of trait strings or a dictionary of trait categories
    """
    if not character_info:
        return []
        
    # Try to get traits from various possible locations
    traits = character_info.get('traits', None)
    if traits is None:
        traits = character_info.get('character_traits', [])
    
    # If traits is a string, convert to list
    if isinstance(traits, str):
        return [traits]
    
    # If traits is a list, return as is
    if isinstance(traits, list):
        return traits
    
    # If traits is a dict, ensure it has the expected structure
    if isinstance(traits, dict):
        formatted_traits = {
            "personality": {},
            "background": "",
            "description": "",
            "skills": {},
            "relationships": {}
        }
        
        # Copy existing categories
        for category in formatted_traits.keys():
            if category in traits:
                formatted_traits[category] = traits[category]
        
        return formatted_traits
    
    # Default to empty list if traits is None or invalid type
    return []

def extract_plot_lines(character_info: Dict[str, Any]) -> List[str]:
    """Extract plot lines from character info dictionary.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        List of plot line strings
    """
    if not character_info:
        return []
        
    plot_lines = character_info.get('plot_lines', [])
    if isinstance(plot_lines, str):
        return [plot_lines]
    return plot_lines if isinstance(plot_lines, list) else []

def extract_character_style(character_info: Dict[str, Any]) -> str:
    """Extract character style from character info dictionary.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        Character style string
    """
    if not character_info:
        return ""
        
    style = character_info.get('style', "")
    return str(style) if style else ""

def extract_character_name(character_info: Dict[str, Any]) -> str:
    """Extract character name from character info dictionary.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        Character name string
    """
    if not character_info:
        return "Unknown"
        
    name = character_info.get('name', None)
    if name is None:
        name = character_info.get('character_name', "Unknown")
    return str(name)

def extract_character_role(character_info: Dict[str, Any]) -> str:
    """Extract character role from character info dictionary.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        Character role string
    """
    if not character_info:
        return "neutral"
        
    role = character_info.get('role', None)
    if role is None:
        role = character_info.get('character_role', "neutral")
        
    # Validate role
    valid_roles = ['villain', 'neutral', 'mission-giver', 'undetermined']
    role = str(role).lower()
    return role if role in valid_roles else "neutral" 