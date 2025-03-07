
from app import app, db
from models import ImageAnalysis
import logging
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def debug_character_names():
    """Display the current state of character names in the database"""
    with app.app_context():
        # Get all character records
        characters = ImageAnalysis.query.filter_by(image_type='character').all()
        
        logger.info(f"Found {len(characters)} character records")
        
        for i, character in enumerate(characters):
            logger.info(f"\n--- Character {i+1} ---")
            logger.info(f"ID: {character.id}")
            logger.info(f"character_name field: '{character.character_name}'")
            
            # Check analysis_result
            if character.analysis_result:
                if isinstance(character.analysis_result, str):
                    logger.info("analysis_result is a string (needs to be parsed)")
                    try:
                        analysis = json.loads(character.analysis_result)
                        # Look in nested character object
                        if 'character' in analysis and isinstance(analysis['character'], dict):
                            name_in_char = analysis['character'].get('name', 'NOT FOUND')
                            logger.info(f"Name in character.name: '{name_in_char}'")
                        # Fall back to top level
                        logger.info(f"Name at top level: '{analysis.get('name', 'NOT FOUND')}'")
                    except Exception as e:
                        logger.info(f"Could not parse analysis_result JSON string: {str(e)}")
                elif isinstance(character.analysis_result, dict):
                    # Look in nested character object
                    if 'character' in character.analysis_result and isinstance(character.analysis_result['character'], dict):
                        name_in_char = character.analysis_result['character'].get('name', 'NOT FOUND')
                        logger.info(f"Name in character.name: '{name_in_char}'")
                    # Fall back to top level
                    logger.info(f"Name at top level: '{character.analysis_result.get('name', 'NOT FOUND')}'")
                else:
                    logger.info(f"analysis_result is type: {type(character.analysis_result)}")
            else:
                logger.info("analysis_result is None or empty")

if __name__ == "__main__":
    debug_character_names()
