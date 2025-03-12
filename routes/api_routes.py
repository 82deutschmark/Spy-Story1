
import logging
from flask import Blueprint, request, jsonify

# Configure logging
logger = logging.getLogger(__name__)

# Create Blueprint
api_bp = Blueprint('api', __name__)

@api_bp.route('/status', methods=['GET'])
def status():
    """Basic API endpoint to check if the API is working"""
    return jsonify({
        'status': 'success',
        'message': 'API is operational'
    })

@api_bp.route('/random_character', methods=['GET'])
def random_character():
    """
    Return a random character from the database.
    """
    from models import ImageAnalysis
    import random
    import logging
    
    try:
        # Get all characters
        characters = ImageAnalysis.query.filter_by(image_type='character').all()
        
        # Log character count and first few IDs for debugging
        logger.info(f"Found {len(characters)} characters for random selection")
        if characters:
            logger.info(f"First few character IDs: {[c.id for c in characters[:3]]}")
        else:
            logger.info("No characters found in database")
            return jsonify({"error": "No characters found in database"}), 404
            
        # Select a random character
        random_char = random.choice(characters)
        
        # Log the selected character
        logger.info(f"Selected random character: id={random_char.id}, name={random_char.character_name}")
        
        # Return character data
        response_data = {
            "id": random_char.id,
            "name": random_char.character_name or "Unknown Character",
            "image_url": random_char.image_url,
            "character_role": random_char.character_role or "neutral",
            "success": True
        }
        
        logger.info(f"Returning character data: {response_data}")
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error fetching random character: {str(e)}")
        return jsonify({"error": str(e), "success": False}), 500
