
#!/usr/bin/env python
"""
fix_character_json.py - Fix invalid JSON in character data
==========================================================

This script examines and repairs invalid JSON in the 'plot_lines' and 'backstory' 
columns of the characters table. It validates and normalizes JSON data to ensure 
proper format for database storage.
"""

import sys
import os
import json
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"character_json_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("character_json_fix")

# Add project root to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import app factory function
from app import create_app
from models.character_data import Character
from utils.json_utils import handle_jsonb_fields

def validate_json(text):
    """
    Check if a string is valid JSON and return a normalized version if possible.
    
    Args:
        text: String to validate as JSON
        
    Returns:
        tuple: (is_valid, original_text, fixed_text)
    """
    if not text:
        return True, text, text
    
    # Check if already valid JSON
    try:
        if isinstance(text, (dict, list)):
            # Already parsed JSON object, just stringify
            return True, text, text
        
        # Attempt to parse string as JSON
        parsed = json.loads(text)
        return True, text, parsed
    except (json.JSONDecodeError, TypeError):
        # Not valid JSON, attempt to fix common issues
        try:
            # Case 1: Missing quotes around keys
            fixed_text = text
            if '{' in text and '}' in text:
                import re
                # Add quotes around keys that are missing them
                fixed_text = re.sub(r'([{,])\s*([a-zA-Z0-9_]+)\s*:', r'\1"\2":', fixed_text)
                # Try parsing again
                parsed = json.loads(fixed_text)
                return False, text, parsed
            return False, text, None
        except:
            # Couldn't fix automatically
            logger.warning(f"Could not automatically fix JSON: {text[:100]}...")
            return False, text, None

def fix_character_json_data():
    """
    Main function to examine and fix JSON data in characters table.
    """
    # Create and configure the app
    app = create_app()
    
    # Using app context to access database
    with app.app_context():
        from database import db
        
        characters = Character.query.all()
        logger.info(f"Found {len(characters)} characters to examine")
        
        fixed_count = 0
        plot_lines_fixes = 0
        backstory_fixes = 0
        
        for character in characters:
            character_changed = False
            
            # Check plot_lines column
            if character.plot_lines is not None:
                is_valid, original, fixed = validate_json(character.plot_lines)
                if not is_valid and fixed is not None:
                    logger.info(f"Fixing plot_lines for character ID {character.id} ({character.character_name})")
                    logger.debug(f"Original: {original}")
                    logger.debug(f"Fixed: {fixed}")
                    character.plot_lines = fixed
                    character_changed = True
                    plot_lines_fixes += 1
            
            # Check backstory column (even though it's not JSONB, we'll check if it contains invalid JSON)
            if character.backstory is not None:
                try:
                    # Only try to fix if it looks like it might be intended as JSON
                    if (character.backstory.strip().startswith('{') and 
                        character.backstory.strip().endswith('}')) or (
                        character.backstory.strip().startswith('[') and 
                        character.backstory.strip().endswith(']')):
                        
                        is_valid, original, fixed = validate_json(character.backstory)
                        if not is_valid and fixed is not None:
                            logger.info(f"Fixing backstory for character ID {character.id} ({character.character_name})")
                            logger.debug(f"Original: {original}")
                            logger.debug(f"Fixed: {json.dumps(fixed)}")
                            # Store as JSON string since backstory is a Text column
                            character.backstory = json.dumps(fixed)
                            character_changed = True
                            backstory_fixes += 1
                except Exception as e:
                    logger.error(f"Error processing backstory for character ID {character.id}: {str(e)}")
            
            # Save changes if needed
            if character_changed:
                try:
                    db.session.commit()
                    fixed_count += 1
                except Exception as e:
                    db.session.rollback()
                    logger.error(f"Failed to save character ID {character.id}: {str(e)}")
        
        logger.info(f"Fixed {fixed_count} characters total")
        logger.info(f"Fixed {plot_lines_fixes} plot_lines entries")
        logger.info(f"Fixed {backstory_fixes} backstory entries")
        
        return fixed_count, plot_lines_fixes, backstory_fixes

if __name__ == "__main__":
    try:
        logger.info("Starting character JSON data fix script")
        fixed_count, plot_lines_fixes, backstory_fixes = fix_character_json_data()
        logger.info(f"Script completed successfully. Fixed {fixed_count} characters " +
                    f"({plot_lines_fixes} plot_lines, {backstory_fixes} backstories)")
    except Exception as e:
        logger.error(f"Script failed with error: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        sys.exit(1)
