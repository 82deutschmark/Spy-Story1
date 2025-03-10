
import os
import json
import logging
from app import app
from models import ImageAnalysis
from database import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_image_analysis():
    """
    Check image analysis records for issues that might prevent saving new analyses
    """
    with app.app_context():
        # Get the most recent image record to check for issues
        recent_images = ImageAnalysis.query.order_by(ImageAnalysis.created_at.desc()).limit(5).all()
        
        for img in recent_images:
            logger.info(f"Checking image {img.id}")
            
            # Log key fields to help with debugging
            logger.info(f"Image URL: {img.image_url[:50]}...")
            logger.info(f"Image type: {img.image_type}")
            logger.info(f"Character name: {img.character_name}")
            logger.info(f"Character role: {img.character_role}")
            
            # Check for invalid character roles
            if img.image_type == 'character' and img.character_role:
                valid_roles = ['undetermined', 'villain', 'neutral', 'mission-giver']
                if img.character_role not in valid_roles:
                    logger.warning(f"Invalid character role found: '{img.character_role}'")
                    
                    # Fix the role
                    if img.character_role.lower() == 'antagonist' or img.character_role.lower() == 'villain':
                        img.character_role = 'villain'
                    elif img.character_role.lower() == 'protagonist' or img.character_role.lower() == 'hero':
                        img.character_role = 'neutral'
                    elif img.character_role.lower() == 'mission giver':
                        img.character_role = 'mission-giver'
                    else:
                        img.character_role = 'undetermined'
                    
                    logger.info(f"Fixed to: {img.character_role}")
                    db.session.commit()
            
            # Check analysis_result structure
            if img.analysis_result:
                try:
                    # Log any type issues that might cause problems
                    if 'type' in img.analysis_result:
                        logger.info(f"Analysis type: {img.analysis_result['type']}")
                    
                    if 'character' in img.analysis_result and isinstance(img.analysis_result['character'], dict):
                        if 'role' in img.analysis_result['character']:
                            logger.info(f"Character role in analysis: {img.analysis_result['character']['role']}")
                    
                    if 'role' in img.analysis_result:
                        logger.info(f"Role in analysis: {img.analysis_result['role']}")
                except Exception as e:
                    logger.error(f"Error checking analysis structure: {str(e)}")

if __name__ == "__main__":
    check_image_analysis()
