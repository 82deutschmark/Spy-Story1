
#!/usr/bin/env python
"""
Character JSON Field Validator and Fixer

This script:
1. Reads all character records from the database
2. Validates the JSONB fields (character_traits, plot_lines)
3. Attempts to fix any invalid JSON data
4. Saves the corrected data back to the database
"""

import sys
import os
import json
import logging
from datetime import datetime

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from models.base import db
from models.character_data import Character
from utils.json_utils import safe_json_loads, normalize_strings_in_dict, ensure_valid_json_response

# Setup logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler(f"character_json_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                        logging.StreamHandler()
                    ])
logger = logging.getLogger(__name__)

# Create a small Flask app to work with the database
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'  # Update with your actual DB URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def validate_json_field(field_data, field_name):
    """Validate a JSON field and attempt to fix it if invalid."""
    if field_data is None:
        return True, None, field_data
    
    # If it's already a dict or list, it's valid
    if isinstance(field_data, (dict, list)):
        return True, None, field_data
    
    # If it's a string, try to parse it
    if isinstance(field_data, str):
        success, error, parsed_data = safe_json_loads(field_data)
        if success:
            return True, None, parsed_data
        else:
            return False, error, field_data
    
    # Any other type is invalid for JSONB
    return False, f"Invalid type for JSONB field: {type(field_data)}", field_data

def fix_character_traits(traits_data):
    """Fix character_traits field to ensure valid JSON structure."""
    # If traits is None, provide an empty list
    if traits_data is None:
        return []
    
    # If traits is already a list, ensure all items are strings
    if isinstance(traits_data, list):
        return [str(item) if not isinstance(item, str) else item for item in traits_data]
    
    # If traits is a string, try to parse it as JSON
    if isinstance(traits_data, str):
        try:
            parsed = json.loads(traits_data)
            if isinstance(parsed, list):
                return parsed
            elif isinstance(parsed, dict):
                # Convert dict to a formatted structure if needed
                return parsed
            else:
                # If it's some other parsed type, convert to list
                return [str(parsed)]
        except json.JSONDecodeError:
            # If it's not valid JSON, treat as a single trait
            return [traits_data]
    
    # If traits is a dict, return as is
    if isinstance(traits_data, dict):
        return traits_data
    
    # Any other type, convert to string and wrap in list
    return [str(traits_data)]

def fix_plot_lines(plot_lines_data):
    """Fix plot_lines field to ensure valid JSON structure."""
    # If plot_lines is None, provide an empty list
    if plot_lines_data is None:
        return []
    
    # If plot_lines is already a list, ensure all items are strings
    if isinstance(plot_lines_data, list):
        return [str(item) if not isinstance(item, str) else item for item in plot_lines_data]
    
    # If plot_lines is a string, try to parse it as JSON
    if isinstance(plot_lines_data, str):
        try:
            parsed = json.loads(plot_lines_data)
            if isinstance(parsed, list):
                return parsed
            else:
                # If it's some other parsed type, convert to list
                return [str(parsed)]
        except json.JSONDecodeError:
            # If it's not valid JSON, treat as a single plot line
            return [plot_lines_data]
    
    # Any other type, convert to string and wrap in list
    return [str(plot_lines_data)]

def validate_and_fix_character(character):
    """Validate and fix JSONB fields for a character."""
    changes = {}
    
    # Validate and fix character_traits
    traits_valid, traits_error, traits_data = validate_json_field(character.character_traits, 'character_traits')
    if not traits_valid:
        logger.warning(f"Character {character.id} has invalid character_traits: {traits_error}")
        fixed_traits = fix_character_traits(character.character_traits)
        changes['character_traits'] = fixed_traits
    
    # Validate and fix plot_lines
    plot_lines_valid, plot_lines_error, plot_lines_data = validate_json_field(character.plot_lines, 'plot_lines')
    if not plot_lines_valid:
        logger.warning(f"Character {character.id} has invalid plot_lines: {plot_lines_error}")
        fixed_plot_lines = fix_plot_lines(character.plot_lines)
        changes['plot_lines'] = fixed_plot_lines
    
    return changes

def fix_all_characters():
    """Fix JSONB fields for all characters in the database."""
    with app.app_context():
        characters = Character.query.all()
        logger.info(f"Found {len(characters)} characters in the database")
        
        fixed_count = 0
        error_count = 0
        
        for character in characters:
            try:
                changes = validate_and_fix_character(character)
                
                if changes:
                    # Apply changes to the character
                    for field, value in changes.items():
                        setattr(character, field, value)
                    
                    # Save changes to database
                    db.session.commit()
                    fixed_count += 1
                    logger.info(f"Fixed character {character.id} ({character.character_name}): {list(changes.keys())}")
            except Exception as e:
                error_count += 1
                logger.error(f"Error fixing character {character.id}: {str(e)}")
                db.session.rollback()
        
        logger.info(f"Character fix complete. Fixed: {fixed_count}, Errors: {error_count}")

def main():
    """Main function to run the script."""
    logger.info("Starting character JSON field validation and fixing...")
    fix_all_characters()
    logger.info("Character JSON field validation and fixing complete.")

if __name__ == "__main__":
    main()
