
import json
import logging
from flask import Flask
from database import db
from models import ImageAnalysis
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a minimal Flask app for database context
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL", "sqlite:///database.db")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def clean_character_data():
    """Clean up character entries in the database for duplicates and overlaps."""
    with app.app_context():
        # Get all character records
        characters = ImageAnalysis.query.filter_by(image_type='character').all()
        
        logger.info(f"Found {len(characters)} character records")
        updated_count = 0
        
        for character in characters:
            try:
                # Prepare a structure to store cleaned data
                cleaned_data = {}
                
                # First parse the analysis_result if it exists
                if character.analysis_result:
                    analysis = character.analysis_result
                    if isinstance(analysis, str):
                        try:
                            analysis = json.loads(analysis)
                        except json.JSONDecodeError:
                            logger.error(f"Could not parse analysis_result for character {character.id}")
                            continue
                    
                    # Extract name from analysis_result in all possible places
                    name = None
                    if 'name' in analysis:
                        name = analysis.get('name')
                    elif 'character_name' in analysis:
                        name = analysis.get('character_name')
                    elif 'character' in analysis and isinstance(analysis['character'], dict):
                        name = analysis['character'].get('name')
                    
                    # Store canonical name (prefer existing field, then analysis_result)
                    cleaned_data['name'] = character.character_name or name or "Unnamed Character"
                    
                    # Extract relevant fields from analysis_result
                    if 'backstory' in analysis:
                        cleaned_data['backstory'] = analysis.get('backstory')
                    
                    if 'style' in analysis:
                        cleaned_data['style'] = analysis.get('style')
                    
                    if 'code_name' in analysis:
                        cleaned_data['code_name'] = analysis.get('code_name')
                    
                    # Extract character traits
                    traits = []
                    if 'character_traits' in analysis and isinstance(analysis['character_traits'], list):
                        traits = analysis['character_traits']
                    elif 'traits' in analysis and isinstance(analysis['traits'], list):
                        traits = analysis['traits']
                    elif 'character' in analysis and 'character_traits' in analysis['character']:
                        traits = analysis['character']['character_traits']
                    
                    # Make sure traits are unique
                    cleaned_data['character_traits'] = list(set(traits))
                    
                    # Extract role
                    role = None
                    if 'role' in analysis:
                        role = analysis.get('role')
                    elif 'character_role' in analysis:
                        role = analysis.get('character_role')
                    elif 'character' in analysis and 'role' in analysis['character']:
                        role = analysis['character']['role']
                    
                    cleaned_data['role'] = role or character.character_role or character.role or 'neutral'
                    
                    # Extract plot lines
                    plot_lines = []
                    if 'plot_lines' in analysis and isinstance(analysis['plot_lines'], list):
                        plot_lines = analysis['plot_lines']
                    elif 'potential_plot_lines' in analysis and isinstance(analysis['potential_plot_lines'], list):
                        plot_lines = analysis['potential_plot_lines']
                    elif 'character' in analysis and 'plot_lines' in analysis['character']:
                        plot_lines = analysis['character']['plot_lines']
                    
                    cleaned_data['plot_lines'] = plot_lines
                else:
                    # Use existing fields if analysis_result is empty
                    cleaned_data['name'] = character.character_name or "Unnamed Character"
                    cleaned_data['character_traits'] = character.character_traits or []
                    cleaned_data['role'] = character.character_role or character.role or 'neutral'
                    cleaned_data['plot_lines'] = character.plot_lines or []
                
                # Update model fields with cleaned data
                character.character_name = cleaned_data['name']
                character.name = cleaned_data['name']  # Ensure both fields match
                
                if 'backstory' in cleaned_data:
                    character.backstory = cleaned_data['backstory']
                
                character.character_traits = cleaned_data['character_traits']
                character.role = cleaned_data['role']
                character.character_role = cleaned_data['role']  # Ensure both fields match
                character.plot_lines = cleaned_data['plot_lines']
                
                # Create a clean analysis_result structure
                clean_analysis = {
                    'name': cleaned_data['name'],
                    'character_traits': cleaned_data['character_traits'],
                    'role': cleaned_data['role']
                }
                
                if 'backstory' in cleaned_data:
                    clean_analysis['backstory'] = cleaned_data['backstory']
                
                if 'style' in cleaned_data:
                    clean_analysis['style'] = cleaned_data['style']
                
                if 'plot_lines' in cleaned_data:
                    clean_analysis['plot_lines'] = cleaned_data['plot_lines']
                
                if 'code_name' in cleaned_data:
                    clean_analysis['code_name'] = cleaned_data['code_name']
                
                # Update the analysis_result with the clean structure
                character.analysis_result = clean_analysis
                
                logger.info(f"Cleaned character {character.id}: {cleaned_data['name']}")
                updated_count += 1
                
            except Exception as e:
                logger.error(f"Error cleaning character {character.id}: {str(e)}")
        
        # Save all changes
        if updated_count > 0:
            db.session.commit()
            logger.info(f"Successfully updated {updated_count} character records.")
        else:
            logger.info("No character records needed updating.")

if __name__ == "__main__":
    clean_character_data()
