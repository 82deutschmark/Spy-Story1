
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
import traceback
from datetime import datetime

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler(f"character_json_fix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"),
                        logging.StreamHandler()
                    ])
logger = logging.getLogger(__name__)

def validate_json(text):
    """
    Validate JSON string and attempt to fix it if invalid.
    Returns tuple (is_valid, original_text, fixed_data)
    """
    if text is None:
        return True, None, None
    
    # If it's already a dict or list, it's valid
    if isinstance(text, (dict, list)):
        return True, text, text
    
    # If it's a string, try to parse it
    if isinstance(text, str):
        try:
            # Try to load the JSON
            parsed = json.loads(text)
            return True, text, parsed
        except json.JSONDecodeError as e:
            logger.warning(f"JSON validation error: {str(e)}")
            # Try to fix common JSON errors
            fixed_text = text
            
            # Replace single quotes with double quotes
            if "'" in fixed_text and '"' not in fixed_text:
                fixed_text = fixed_text.replace("'", '"')
            
            # Add missing quotes around keys
            # This is a simplified fix and might not work for all cases
            if "{" in fixed_text:
                for key_match in ["{", ",", ": "]:
                    fixed_text = fixed_text.replace(f"{key_match} ", key_match)
            
            try:
                fixed_data = json.loads(fixed_text)
                return False, text, fixed_data
            except json.JSONDecodeError:
                # If still invalid, try a more aggressive fix by extracting what looks like JSON
                logger.warning(f"Advanced JSON fixing attempt for: {text[:50]}...")
                try:
                    # For lists that might be missing brackets
                    if ',' in text and '[' not in text and '{' not in text:
                        items = text.split(',')
                        items = [item.strip() for item in items]
                        items = [f'"{item}"' if not (item.startswith('"') and item.endswith('"')) else item for item in items]
                        fixed_text = '[' + ','.join(items) + ']'
                        fixed_data = json.loads(fixed_text)
                        return False, text, fixed_data
                except:
                    pass
                
                logger.error(f"Could not fix JSON: {text[:100]}...")
                return False, text, None
    
    # If it's not a string, dict, or list, convert to string representation
    try:
        return False, text, str(text)
    except:
        return False, text, None

def fix_character_json_data():
    """
    Main function to examine and fix JSON data in characters table.
    """
    # Import app here to avoid circular imports
    from app import app
    
    # Use app context to access database properly
    with app.app_context():
        # Import database models inside app context
        from models.character_data import Character
        from database import db
        
        logger.info("Database connection established")
        
        try:
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
                
                # Check backstory column
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
                
                # Check character_traits column if it exists
                if hasattr(character, 'character_traits') and character.character_traits is not None:
                    is_valid, original, fixed = validate_json(character.character_traits)
                    if not is_valid and fixed is not None:
                        logger.info(f"Fixing character_traits for character ID {character.id} ({character.character_name})")
                        logger.debug(f"Original: {original}")
                        logger.debug(f"Fixed: {fixed}")
                        character.character_traits = fixed
                        character_changed = True
                
                # Save changes if needed
                if character_changed:
                    try:
                        db.session.commit()
                        fixed_count += 1
                    except Exception as e:
                        db.session.rollback()
                        logger.error(f"Error saving changes for character ID {character.id}: {str(e)}")
            
            logger.info(f"Fixed {fixed_count} characters out of {len(characters)}")
            return fixed_count, plot_lines_fixes, backstory_fixes
        except Exception as e:
            logger.error(f"Database query error: {str(e)}")
            logger.error(traceback.format_exc())
            raise

if __name__ == "__main__":
    try:
        logger.info("Starting character JSON data fix script")
        fixed_count, plot_lines_fixes, backstory_fixes = fix_character_json_data()
        logger.info(f"Script completed successfully. Fixed {fixed_count} characters " +
                    f"({plot_lines_fixes} plot_lines, {backstory_fixes} backstories)")
    except Exception as e:
        logger.error(f"Script failed with error: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)
