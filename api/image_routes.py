
from flask import Blueprint, jsonify
from models import ImageAnalysis
from database import db
import random

image_api = Blueprint('image_api', __name__, url_prefix='/api')

@image_api.route('/random-background')
def random_background():
    """Return a random image suitable for a background"""
    # Get a random scene image
    scene_images = ImageAnalysis.query.filter_by(image_type='scene').all()
    
    if not scene_images:
        return jsonify({
            'error': 'No scene images found',
            'image_url': None
        }), 404
    
    random_image = random.choice(scene_images)
    
    return jsonify({
        'image_url': random_image.image_url,
        'id': random_image.id,
        'attribution': getattr(random_image, 'attribution', None)
    })

@image_api.route('/random-character')
def random_character():
    """Return a random character image"""
    character_images = ImageAnalysis.query.filter_by(image_type='character').all()
    
    if not character_images:
        return jsonify({
            'error': 'No character images found',
            'image_url': None
        }), 404
    
    random_character = random.choice(character_images)
    character_data = {
        'image_url': random_character.image_url,
        'id': random_character.id,
        'name': random_character.character_name,
    }
    
    # Add analysis data if available
    if random_character.analysis_result:
        analysis = random_character.analysis_result
        if isinstance(analysis, dict):
            character_data.update({
                'traits': analysis.get('character_traits', []),
                'style': analysis.get('style', '')
            })
    
    return jsonify(character_data)
