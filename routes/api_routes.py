
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
        
        if not characters:
            return jsonify({"error": "No characters found in database"}), 404
            
        # Select a random character
        random_char = random.choice(characters)
        
        # Return character data
        return jsonify({
            "id": random_char.id,
            "name": random_char.character_name or "Unknown Character",
            "image_url": random_char.image_url,
            "character_role": random_char.character_role or "neutral",
            "success": True
        })
    except Exception as e:
        logging.error(f"Error fetching random character: {str(e)}")
        return jsonify({"error": str(e), "success": False}), 500
