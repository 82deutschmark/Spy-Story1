
#!/usr/bin/env python
"""
Character JSON Field Validator and Fixer

This script:
1. Reads all character records from the database
2. Validates all potential JSON fields (character_traits, plot_lines, backstory)
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
    Check if a value is valid JSON and return a normalized version if possible.
    
    Args:
        text: Value to validate as JSON (could be string, dict, list, etc.)
        
    Returns:
        tuple: (is_valid, original_text, fixed_text)
    """
    if text is None:
        return True, text, text
    
    if isinstance(text, (dict, list)):
        return True, text, text
    
    # Import the utility functions from json_utils
    try:
        from utils.json_utils import safe_json_loads, normalize_strings_in_dict
        
        # Try using the project's existing JSON utilities first
        if isinstance(text, str):
            success, error_msg, parsed_data = safe_json_loads(text)
            if success:
                return True, text, parsed_data
    except ImportError:
        logger.warning("Could not import json_utils, falling back to local implementation")
    
    # Fallback to local implementation if json_utils is not available
    # If it's a string, try to parse it
    if isinstance(text, str):
        try:
            # Try parsing directly
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
                    
                    # Fix single quotes to double quotes
                    fixed_text = fixed_text.replace("'", '"')
                    
                    # Fix double double quotes
                    fixed_text = fixed_text.replace('""', '"')
                    
                    # Try parsing again
                    parsed = json.loads(fixed_text)
                    return False, text, parsed
                    
                # Case 2: Handle single quotes instead of double quotes
                if "'" in text:
                    fixed_text = text.replace("'", '"')
                    try:
                        parsed = json.loads(fixed_text)
                        return False, text, parsed
                    except:
                        pass
                
                # Case 3: Handle escaped quotes
                fixed_text = text.replace('\\"', '"').replace("\\'", "'")
                try:
                    parsed = json.loads(fixed_text)
                    return False, text, parsed
                except:
                    pass
                    
                return False, text, None
            except Exception as e:
                logger.warning(f"Could not automatically fix JSON: {str(e)}")
                return False, text, None
    
    # If we got here, it's not a string or dict/list
    return False, text, None

def fix_character_json_data():
    """
    Main function to examine and fix JSON data in characters table.
    """
    # Import the create_app function from main.py
    from main import create_app
    
    # Create the Flask app instance
    app = create_app()
    
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
            character_traits_fixes = 0
            plot_lines_fixes = 0
            backstory_fixes = 0
            
            for character in characters:
                character_changed = False
                logger.info(f"Examining character ID {character.id} ({character.character_name})")
                
                # Check character_traits column
                if hasattr(character, 'character_traits') and character.character_traits is not None:
                    is_valid, original, fixed = validate_json(character.character_traits)
                    if not is_valid and fixed is not None:
                        logger.info(f"Fixing character_traits for character ID {character.id} ({character.character_name})")
                        logger.debug(f"Original: {original}")
                        logger.debug(f"Fixed: {fixed}")
                        character.character_traits = fixed
                        character_changed = True
                        character_traits_fixes += 1
                
                # Check plot_lines column
                if hasattr(character, 'plot_lines') and character.plot_lines is not None:
                    is_valid, original, fixed = validate_json(character.plot_lines)
                    if not is_valid and fixed is not None:
                        logger.info(f"Fixing plot_lines for character ID {character.id} ({character.character_name})")
                        logger.debug(f"Original: {original}")
                        logger.debug(f"Fixed: {fixed}")
                        character.plot_lines = fixed
                        character_changed = True
                        plot_lines_fixes += 1
                
                # Check backstory column for JSON structure and fix if needed
                if hasattr(character, 'backstory') and character.backstory is not None:
                    # Only try to fix if it looks like it might be intended as JSON
                    if (character.backstory.strip().startswith('{') and 
                        character.backstory.strip().endswith('}')) or (
                        character.backstory.strip().startswith('[') and 
                        character.backstory.strip().endswith(']')):
                        
                        try:
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
                
                # Check any other JSON fields from the Character model
                # For example, if there's a 'description' field that might contain JSON
                if hasattr(character, 'description') and character.description is not None:
                    # Only try to fix if it looks like it might be intended as JSON
                    if (character.description and 
                        (character.description.strip().startswith('{') and 
                         character.description.strip().endswith('}')) or (
                         character.description.strip().startswith('[') and 
                         character.description.strip().endswith(']'))):
                        
                        try:
                            is_valid, original, fixed = validate_json(character.description)
                            if not is_valid and fixed is not None:
                                logger.info(f"Fixing description for character ID {character.id}")
                                logger.debug(f"Original: {original}")
                                logger.debug(f"Fixed: {json.dumps(fixed)}")
                                # Store as JSON string since description is a Text column
                                character.description = json.dumps(fixed)
                                character_changed = True
                        except Exception as e:
                            logger.error(f"Error processing description for character ID {character.id}: {str(e)}")
                
                # Save changes if needed
                if character_changed:
                    try:
                        # Make sure we have permission to modify the character
                        if not hasattr(character, '_sa_instance_state') or not character._sa_instance_state.persistent:
                            logger.error(f"Character ID {character.id} is not in a persistent state, cannot update")
                            continue
                            
                        # Explicitly mark as modified to ensure the ORM picks up changes
                        db.session.add(character)
                        db.session.flush()  # Check for immediate errors
                        
                        # Now commit the transaction
                        db.session.commit()
                        fixed_count += 1
                        logger.info(f"Successfully saved changes for character ID {character.id}")
                    except Exception as e:
                        db.session.rollback()
                        logger.error(f"Error saving changes for character ID {character.id}: {str(e)}")
                        logger.error(traceback.format_exc())
            
            logger.info(f"Fixed {fixed_count} characters out of {len(characters)}")
            logger.info(f"Fixed {character_traits_fixes} character_traits entries")
            logger.info(f"Fixed {plot_lines_fixes} plot_lines entries")
            logger.info(f"Fixed {backstory_fixes} backstory entries")
            
            # Ensure all changes are committed
            try:
                db.session.commit()
                logger.info("Final commit successful")
            except Exception as e:
                logger.error(f"Error on final commit: {str(e)}")
                db.session.rollback()
            
            return fixed_count, character_traits_fixes, plot_lines_fixes, backstory_fixes
        except Exception as e:
            logger.error(f"Database query error: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Try to recover database session
            try:
                db.session.rollback()
                logger.info("Session rolled back successfully")
            except:
                logger.error("Could not rollback session, database may be in inconsistent state")
            
            raise

if __name__ == "__main__":
    try:
        logger.info("Starting character JSON data fix script")
        result = fix_character_json_data()
        
        if result:
            fixed_count, character_traits_fixes, plot_lines_fixes, backstory_fixes = result
            logger.info(f"Script completed successfully. Fixed {fixed_count} characters " +
                        f"({character_traits_fixes} character_traits, {plot_lines_fixes} plot_lines, {backstory_fixes} backstories)")
        else:
            logger.info("Script completed with no fixes needed")
    except Exception as e:
        logger.error(f"Script failed with error: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)
