
import os
import json
import logging
from app import app, db
from models import ImageAnalysis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_image_types():
    """
    Update existing records to ensure they're properly classified as character or scene
    based on their analysis_result content
    """
    with app.app_context():
        # Get all image records
        images = ImageAnalysis.query.all()
        
        updated_count = 0
        
        for image in images:
            analysis = image.analysis_result
            if not analysis:
                logger.warning(f"Skipping record {image.id} - no analysis_result")
                continue
                
            # Determine correct image type based on content
            is_character = False
            
            # Check for nested character object
            if 'character' in analysis and isinstance(analysis['character'], dict):
                is_character = True
                reason = "nested 'character' object"
            # Or check for character-specific fields at the top level
            elif any(key in analysis for key in ['character_name', 'character_traits', 'plot_lines']):
                is_character = True
                reason = "character-specific fields"
            # Or check for character-specific role field
            elif 'role' in analysis and analysis['role'] in ['hero', 'villain', 'neutral']:
                is_character = True
                reason = "role field"
            
            correct_type = 'character' if is_character else 'scene'
            
            # Update record if necessary
            if image.image_type != correct_type:
                logger.info(f"Changing record {image.id} from '{image.image_type}' to '{correct_type}' (detected from {reason})")
                image.image_type = correct_type
                updated_count += 1
                
                # If changing to character type, ensure character fields are populated
                if correct_type == 'character':
                    # Extract character name
                    character_name = None
                    if 'character' in analysis and isinstance(analysis['character'], dict) and 'name' in analysis['character']:
                        character_name = analysis['character'].get('name')
                    elif 'character_name' in analysis:
                        character_name = analysis.get('character_name')
                    elif 'name' in analysis:
                        character_name = analysis.get('name')
                    
                    if character_name and not image.character_name:
                        image.character_name = character_name
                        logger.info(f"Setting character_name to '{character_name}' for record {image.id}")
                    
                    # Extract character traits
                    character_traits = None
                    if 'character' in analysis and isinstance(analysis['character'], dict) and 'character_traits' in analysis['character']:
                        character_traits = analysis['character'].get('character_traits')
                    elif 'character_traits' in analysis:
                        character_traits = analysis.get('character_traits')
                    
                    if character_traits and not image.character_traits:
                        image.character_traits = character_traits
                        logger.info(f"Setting character_traits for record {image.id}")
                    
                    # Extract character role
                    character_role = None
                    if 'character' in analysis and isinstance(analysis['character'], dict) and 'role' in analysis['character']:
                        character_role = analysis['character'].get('role')
                    elif 'role' in analysis:
                        character_role = analysis.get('role')
                    
                    if character_role and not image.character_role:
                        image.character_role = character_role
                        logger.info(f"Setting character_role to '{character_role}' for record {image.id}")
                    
                    # Extract plot lines
                    plot_lines = None
                    if 'character' in analysis and isinstance(analysis['character'], dict) and 'plot_lines' in analysis['character']:
                        plot_lines = analysis['character'].get('plot_lines')
                    elif 'plot_lines' in analysis:
                        plot_lines = analysis.get('plot_lines')
                    
                    if plot_lines and not image.plot_lines:
                        image.plot_lines = plot_lines
                        logger.info(f"Setting plot_lines for record {image.id}")
            
        # Save changes if any were made
        if updated_count > 0:
            db.session.commit()
            logger.info(f"Updated {updated_count} records with corrected image types")
        else:
            logger.info(f"No records needed updating")

if __name__ == "__main__":
    fix_image_types()
