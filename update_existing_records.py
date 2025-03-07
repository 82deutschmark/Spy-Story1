
from app import app, db
from models import ImageAnalysis
from flask import Flask
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_existing_records():
    """Update existing records to ensure name and plot_lines are properly stored"""
    with app.app_context():
        # Get all character records
        characters = ImageAnalysis.query.filter_by(image_type='character').all()
        count = 0
        
        for character in characters:
            if character.analysis_result:
                # Extract name and plot_lines from analysis_result
                name = character.analysis_result.get('name', '')
                plot_lines = character.analysis_result.get('plot_lines', [])
                
                # Update the record if needed
                if name and not character.character_name:
                    character.character_name = name
                    count += 1
                    logger.info(f"Updating character name for record {character.id} to {name}")
                
                if plot_lines and (not character.plot_lines or len(character.plot_lines) == 0):
                    character.plot_lines = plot_lines
                    count += 1
                    logger.info(f"Updating plot_lines for record {character.id}")
            
        # Save changes if any were made
        if count > 0:
            db.session.commit()
            logger.info(f"Updated {count} records with name or plot_lines data")
        else:
            logger.info("No records needed updating")

if __name__ == "__main__":
    update_existing_records()
