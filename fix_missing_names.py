
from app import app, db
from models import ImageAnalysis
import logging
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_missing_character_names():
    """
    Update existing character records to ensure character_name is properly populated from analysis_result
    This will handle both empty names and JSON stored as strings
    """
    with app.app_context():
        # Get all character records with missing or empty character_name
        characters = ImageAnalysis.query.filter_by(image_type='character').all()
        
        count = 0
        for character in characters:
            try:
                # Handle case where analysis_result is a string (JSON string)
                analysis = character.analysis_result
                if isinstance(analysis, str):
                    try:
                        analysis = json.loads(analysis)
                    except:
                        logger.warning(f"Could not parse string analysis_result for record {character.id}")
                        continue
                
                # Check if analysis contains name
                if analysis and isinstance(analysis, dict) and 'name' in analysis:
                    name = analysis.get('name', '')
                    
                    # Only update if name exists and is different from current value
                    if name and (not character.character_name or character.character_name != name):
                        logger.info(f"Updating character name for record {character.id} from '{character.character_name}' to '{name}'")
                        character.character_name = name
                        count += 1
                else:
                    logger.warning(f"Record {character.id} has no 'name' field in analysis_result")
            except Exception as e:
                logger.error(f"Error processing record {character.id}: {str(e)}")
                continue
            
        # Save changes if any were made
        if count > 0:
            db.session.commit()
            logger.info(f"Updated {count} records with missing character names")
        else:
            logger.info("No records needed updating")

if __name__ == "__main__":
    fix_missing_character_names()
