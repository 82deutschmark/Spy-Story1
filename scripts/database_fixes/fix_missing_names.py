
import os
import json
import logging
from app import app, db
from models import ImageAnalysis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_missing_character_names():
    """
    Update existing character records to ensure character_name is properly populated from analysis_result
    This function checks all possible locations where the name might be stored in the analysis_result
    """
    with app.app_context():
        # Get all character records
        characters = ImageAnalysis.query.filter_by(image_type='character').all()
        
        updated_count = 0
        
        for character in characters:
            current_name = character.character_name
            
            if current_name is None or current_name == '':
                # If we need to extract a name - check all possible locations
                name = extract_character_name_from_analysis(character.analysis_result)
                
                if name:
                    logger.info(f"Updating character name for record {character.id} from '{current_name}' to '{name}'")
                    character.character_name = name
                    updated_count += 1
            
        # Save changes if any were made
        if updated_count > 0:
            db.session.commit()
            logger.info(f"Updated {updated_count} records with missing character names")
        else:
            logger.info(f"No records needed updating")

def extract_character_name_from_analysis(analysis):
    """
    Extract the character name from the analysis result, checking all possible locations
    This is a robust function that handles different API response structures
    """
    if not analysis:
        return None
        
    # Handle string JSON
    if isinstance(analysis, str):
        try:
            analysis = json.loads(analysis)
        except:
            logger.warning("Could not parse string analysis_result")
            return None
            
    if not isinstance(analysis, dict):
        return None
        
    # Check all possible locations for the name (ordered by priority)
    name = None
    
    # Option 1: Check if name is in a nested character object
    if 'character' in analysis and isinstance(analysis['character'], dict):
        name = analysis['character'].get('name')
        if name:
            logger.info(f"Found name '{name}' in character object")
            return name
            
    # Option 2: Check if there's a character_name field at top level
    if 'character_name' in analysis:
        name = analysis.get('character_name')
        if name:
            logger.info(f"Found name '{name}' as character_name at top level")
            return name
            
    # Option 3: Check if there's a name field at top level
    if 'name' in analysis:
        name = analysis.get('name')
        if name:
            logger.info(f"Found name '{name}' as name at top level")
            return name
    
    # Option 4: Try to extract name from the first plot line (as last resort)
    if 'plot_lines' in analysis and isinstance(analysis['plot_lines'], list) and len(analysis['plot_lines']) > 0:
        first_plot = analysis['plot_lines'][0]
        # Look for the first capitalized word that might be a name
        words = first_plot.split()
        for word in words:
            if word[0].isupper() and len(word) > 2 and word.lower() not in ['the', 'and', 'but', 'with']:
                potential_name = word.rstrip('.,;:!?')
                logger.info(f"Extracted potential name '{potential_name}' from plot line")
                return potential_name
                
    return None

def main():
    """Main function to run the fix"""
    fix_missing_character_names()

if __name__ == "__main__":
    main()
