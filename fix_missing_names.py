
from app import app, db
from models import ImageAnalysis
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_missing_character_names():
    """Update existing character records to ensure character_name is properly populated from analysis_result"""
    with app.app_context():
        # Get all character records with missing character_name
        characters = ImageAnalysis.query.filter_by(image_type='character').filter(
            (ImageAnalysis.character_name == None) | 
            (ImageAnalysis.character_name == '')
        ).all()
        
        count = 0
        for character in characters:
            if character.analysis_result and 'name' in character.analysis_result:
                name = character.analysis_result.get('name', '')
                if name:
                    character.character_name = name
                    count += 1
                    logger.info(f"Updating character name for record {character.id} to {name}")
            
        # Save changes if any were made
        if count > 0:
            db.session.commit()
            logger.info(f"Updated {count} records with missing character names")
        else:
            logger.info("No records needed updating")

if __name__ == "__main__":
    fix_missing_character_names()
