
import logging
from typing import Dict, Any, List, Optional, Tuple, Union

# Configure logging
logger = logging.getLogger(__name__)

# Default constants for image analysis
DEFAULT_CHARACTER_NAME = "Unnamed Character"
DEFAULT_SCENE_SETTING = "Mysterious Location"
DEFAULT_CHARACTER_ROLE = "undetermined"

def classify_image_type(analysis: Dict[str, Any]) -> str:
    """
    Determine if an image is a character or scene based on its analysis data.
    
    Args:
        analysis: Image analysis data from OpenAI
        
    Returns:
        'character' or 'scene'
    """
    # Check explicit type field (new format)
    if 'type' in analysis and isinstance(analysis['type'], str):
        if analysis['type'].upper() == 'CHARACTER':
            logger.debug("Detected character from 'type' field")
            return 'character'
        elif analysis['type'].upper() == 'SCENE':
            logger.debug("Detected scene from 'type' field")
            return 'scene'
            
    # Check for explicit image_type field
    if 'image_type' in analysis and isinstance(analysis['image_type'], str):
        logger.debug(f"Using explicit image_type: {analysis['image_type']}")
        return analysis['image_type'].lower()
            
    # Check for character indicators
    if any([
        # Check for nested character object
        'character' in analysis and isinstance(analysis['character'], dict),
        # Check for character-specific fields
        any(key in analysis for key in ['character_name', 'character_traits', 'plot_lines', 'personality_traits']),
        # Check for character-specific role field
        'role' in analysis and analysis['role'] in ['hero', 'villain', 'neutral', 'mission-giver', 'antagonist', 'protagonist']
    ]):
        logger.debug("Detected character from characteristic fields")
        return 'character'
        
    # Default to scene if no character indicators found
    logger.debug("No character indicators found, defaulting to scene")
    return 'scene'

def extract_character_name(analysis: Dict[str, Any]) -> str:
    """
    Extract character name from analysis data with consistent rules.
    
    Args:
        analysis: Image analysis data
        
    Returns:
        Character name or default value
    """
    # Try to find name in nested character object
    if 'character' in analysis and isinstance(analysis['character'], dict):
        if 'name' in analysis['character']:
            return analysis['character'].get('name')

    # Try direct character_name field
    if 'character_name' in analysis:
        return analysis.get('character_name')
        
    # Try name field
    if 'name' in analysis:
        return analysis.get('name')
        
    # Return default if no name found
    logger.warning("Could not find a character name in the analysis. Using default name.")
    return DEFAULT_CHARACTER_NAME

def extract_character_traits(analysis: Dict[str, Any]) -> List[str]:
    """
    Extract character traits from analysis data with consistent rules.
    
    Args:
        analysis: Image analysis data
        
    Returns:
        List of character traits
    """
    # Check personality_traits (new format) first
    if 'personality_traits' in analysis and isinstance(analysis['personality_traits'], list):
        return analysis.get('personality_traits')
        
    # Check character_traits at top level
    if 'character_traits' in analysis and isinstance(analysis['character_traits'], list):
        return analysis.get('character_traits')
        
    # Check nested character object
    if 'character' in analysis and isinstance(analysis['character'], dict):
        if 'character_traits' in analysis['character'] and isinstance(analysis['character']['character_traits'], list):
            return analysis['character'].get('character_traits')
        if 'personality_traits' in analysis['character'] and isinstance(analysis['character']['personality_traits'], list):
            return analysis['character'].get('personality_traits')
    
    # Return empty list if nothing found
    return []

def extract_character_role(analysis: Dict[str, Any]) -> str:
    """
    Extract and standardize character role from analysis data.
    
    Args:
        analysis: Image analysis data
        
    Returns:
        Standardized character role
    """
    role = None
    
    # Check nested character object first
    if 'character' in analysis and isinstance(analysis['character'], dict) and 'role' in analysis['character']:
        role = analysis['character'].get('role')
    # Then check top level
    elif 'role' in analysis:
        role = analysis.get('role')
    
    # Standardize role values
    valid_roles = ['undetermined', 'villain', 'neutral', 'mission-giver']
    
    if not role or role == '':
        return 'undetermined'
        
    role_lower = role.lower()
    
    # Map similar roles to standard values
    if role_lower in ['antagonist', 'villain']:
        return 'villain'
    elif role_lower in ['protagonist', 'hero']:
        return 'neutral'
    elif role_lower == 'mission giver':
        return 'mission-giver'
    elif role_lower in valid_roles:
        return role_lower
        
    # Default for unrecognized roles
    return 'undetermined'

def extract_plot_lines(analysis: Dict[str, Any]) -> List[str]:
    """
    Extract plot lines from analysis data with consistent rules.
    
    Args:
        analysis: Image analysis data
        
    Returns:
        List of plot lines
    """
    # Check potential_plot_lines (new format) first
    if 'potential_plot_lines' in analysis and isinstance(analysis['potential_plot_lines'], list):
        return analysis.get('potential_plot_lines')
        
    # Check plot_lines at top level
    if 'plot_lines' in analysis and isinstance(analysis['plot_lines'], list):
        return analysis.get('plot_lines')
        
    # Check nested character object
    if 'character' in analysis and isinstance(analysis['character'], dict):
        if 'plot_lines' in analysis['character'] and isinstance(analysis['character']['plot_lines'], list):
            return analysis['character'].get('plot_lines')
        if 'potential_plot_lines' in analysis['character'] and isinstance(analysis['character']['potential_plot_lines'], list):
            return analysis['character'].get('potential_plot_lines')
    
    # Return empty list if nothing found
    return []

def update_image_from_analysis(image_model, analysis: Dict[str, Any], preserve_relations: bool = True) -> None:
    """
    Update image model fields from analysis data in a consistent way.
    
    Args:
        image_model: SQLAlchemy image model instance
        analysis: Image analysis data
        preserve_relations: Whether to preserve story relations
    """
    # Classify the image type
    image_type = classify_image_type(analysis)
    image_model.image_type = image_type
    
    # Update analysis_result field
    image_model.analysis_result = analysis
    
    # Update common fields
    if 'description' in analysis:
        image_model.description = analysis['description']
    
    # Update type-specific fields
    if image_type == 'character':
        # Update character name
        character_name = extract_character_name(analysis)
        image_model.character_name = character_name
        image_model.name = character_name  # For compatibility
        
        # Update character traits
        character_traits = extract_character_traits(analysis)
        image_model.character_traits = character_traits
        image_model.personality_traits = character_traits  # For compatibility
        
        # Update character role
        character_role = extract_character_role(analysis)
        image_model.character_role = character_role
        image_model.role = character_role  # For compatibility
        
        # Update plot lines
        plot_lines = extract_plot_lines(analysis)
        image_model.plot_lines = plot_lines
        image_model.potential_plot_lines = plot_lines  # For compatibility
        
        # Update backstory if present
        if 'backstory' in analysis and isinstance(analysis['backstory'], (list, str)):
            image_model.backstory = analysis['backstory']
            
    else:  # Scene image
        # Update scene name/setting
        if 'setting' in analysis:
            image_model.setting = analysis['setting']
            image_model.name = analysis['setting']  # For compatibility
            
        # Update scene type
        if 'scene_type' in analysis:
            image_model.scene_type = analysis['scene_type']
            
        # Update scene description
        if 'description' in analysis:
            image_model.setting_description = analysis['description']
            
        # Update dramatic moments
        if 'dramatic_moments' in analysis and isinstance(analysis['dramatic_moments'], list):
            image_model.dramatic_moments = analysis['dramatic_moments']
            
        # Update story fit
        if 'story_fit' in analysis:
            image_model.story_fit = analysis['story_fit']
