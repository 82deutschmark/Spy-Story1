"""
character_utils.py - Character Data Extraction Utilities
====================================================

This module provides utility functions for extracting and processing character data
from various data structures used in the game. These functions help maintain
consistent character information handling across the application.
"""

from typing import Dict, List, Any, Optional

def extract_character_traits(character_info: Dict[str, Any]) -> List[str]:
    """Extract character traits from character info dictionary.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        List of character traits
    """
    if not character_info:
        return []
        
    traits = character_info.get('traits', [])
    if isinstance(traits, str):
        return [traits]
    return traits if isinstance(traits, list) else []

def extract_plot_lines(character_info: Dict[str, Any]) -> List[str]:
    """Extract plot lines associated with a character.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        List of plot lines
    """
    if not character_info:
        return []
        
    plot_lines = character_info.get('plot_lines', [])
    if isinstance(plot_lines, str):
        return [plot_lines]
    return plot_lines if isinstance(plot_lines, list) else []

def extract_character_style(character_info: Dict[str, Any]) -> str:
    """Extract character's visual style description.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        Character's visual style description
    """
    if not character_info:
        return ""
        
    return str(character_info.get('style', ''))

def extract_character_name(character_info: Dict[str, Any]) -> str:
    """Extract character's name.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        Character's name
    """
    if not character_info:
        return ""
        
    return str(character_info.get('name', ''))

def extract_character_role(character_info: Dict[str, Any]) -> str:
    """Extract character's role or occupation.
    
    Args:
        character_info: Dictionary containing character data
        
    Returns:
        Character's role
    """
    if not character_info:
        return ""
        
    return str(character_info.get('role', '')) 