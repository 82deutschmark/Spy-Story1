
import os
import json
import logging
from app import app, db
from models import ImageAnalysis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define valid roles
VALID_ROLES = ['undetermined', 'villain', 'neutral', 'mission-giver']

def standardize_character_roles():
    """
    Update existing character records to ensure character_role values are standardized
    and remove any mentions of "antagonist" or "protagonist"
    """
    with app.app_context():
        # Get all character records
        characters = ImageAnalysis.query.filter_by(image_type='character').all()
        
        updated_count = 0
        
        for character in characters:
            current_role = character.character_role
            
            # Standardize role values
            if current_role is None or current_role == '':
                new_role = 'undetermined'
                updated = True
            elif current_role.lower() == 'antagonist' or current_role.lower() == 'villain':
                new_role = 'villain'
                updated = True
            elif current_role.lower() == 'protagonist' or current_role.lower() == 'hero':
                new_role = 'neutral'
                updated = True
            elif current_role.lower() == 'mission giver':
                new_role = 'mission-giver'
                updated = True
            elif current_role.lower() not in VALID_ROLES:
                new_role = 'undetermined'
                updated = True
            else:
                new_role = current_role.lower()
                updated = current_role != new_role
            
            # Update the role if needed
            if updated:
                logger.info(f"Updating character {character.id} '{character.character_name}' role from '{current_role}' to '{new_role}'")
                character.character_role = new_role
                updated_count += 1
                
                # Also update the role in the analysis_result if applicable
                if character.analysis_result:
                    update_role_in_analysis(character, new_role)
        
        # Save changes if any were made
        if updated_count > 0:
            db.session.commit()
            logger.info(f"Updated {updated_count} records with standardized character roles")
        else:
            logger.info(f"No records needed role standardization")

def update_role_in_analysis(character, new_role):
    """Update role in all relevant places in the analysis_result JSON"""
    try:
        analysis = character.analysis_result
        
        # Update top-level role if present
        if 'role' in analysis:
            analysis['role'] = new_role
        
        # Update role in nested character object if present
        if 'character' in analysis and isinstance(analysis['character'], dict):
            if 'role' in analysis['character']:
                analysis['character']['role'] = new_role
        
        character.analysis_result = analysis
        
    except Exception as e:
        logger.error(f"Error updating role in analysis_result for character {character.id}: {str(e)}")

if __name__ == "__main__":
    standardize_character_roles()
