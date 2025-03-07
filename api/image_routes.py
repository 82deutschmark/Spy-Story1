
from flask import Blueprint, jsonify, request
from models import ImageAnalysis
from app import db

image_bp = Blueprint('images', __name__, url_prefix='/api/images')

@image_bp.route('/characters', methods=['GET'])
def get_characters():
    """Get all character images"""
    characters = ImageAnalysis.query.filter_by(image_type='character').all()
    
    character_data = []
    for char in characters:
        # Extract basic character data
        name = char.character_name
        if not name and char.analysis_result and 'name' in char.analysis_result:
            name = char.analysis_result['name']
            
        character_data.append({
            'id': char.id,
            'name': name,
            'image_url': char.image_url,
            'character_role': char.character_role,
            'character_traits': char.character_traits,
            'plot_lines': char.plot_lines
        })
    
    return jsonify({
        'success': True,
        'characters': character_data
    })

@image_bp.route('/scenes', methods=['GET'])
def get_scenes():
    """Get all scene images"""
    scenes = ImageAnalysis.query.filter_by(image_type='scene').all()
    
    scene_data = []
    for scene in scenes:
        # Extract basic scene data
        setting = scene.setting
        if not setting and scene.analysis_result and 'setting' in scene.analysis_result:
            setting = scene.analysis_result['setting']
            
        scene_data.append({
            'id': scene.id,
            'image_url': scene.image_url,
            'scene_type': scene.scene_type,
            'setting': setting,
            'setting_description': scene.setting_description,
            'dramatic_moments': scene.dramatic_moments
        })
    
    return jsonify({
        'success': True,
        'scenes': scene_data
    })

@image_bp.route('/character/<int:character_id>', methods=['GET'])
def get_character(character_id):
    """Get details for a specific character"""
    character = ImageAnalysis.query.filter_by(id=character_id, image_type='character').first()
    
    if not character:
        return jsonify({
            'success': False,
            'error': f'Character with ID {character_id} not found'
        })
    
    # Extract character name from analysis or stored value
    name = character.character_name
    if not name and character.analysis_result and 'name' in character.analysis_result:
        name = character.analysis_result['name']
    
    return jsonify({
        'success': True,
        'character': {
            'id': character.id,
            'name': name,
            'image_url': character.image_url,
            'character_role': character.character_role,
            'character_traits': character.character_traits,
            'plot_lines': character.plot_lines,
            'full_analysis': character.analysis_result
        }
    })

@image_bp.route('/scene/<int:scene_id>', methods=['GET'])
def get_scene(scene_id):
    """Get details for a specific scene"""
    scene = ImageAnalysis.query.filter_by(id=scene_id, image_type='scene').first()
    
    if not scene:
        return jsonify({
            'success': False,
            'error': f'Scene with ID {scene_id} not found'
        })
    
    # Extract scene setting from analysis or stored value
    setting = scene.setting
    if not setting and scene.analysis_result and 'setting' in scene.analysis_result:
        setting = scene.analysis_result['setting']
    
    return jsonify({
        'success': True,
        'scene': {
            'id': scene.id,
            'image_url': scene.image_url,
            'scene_type': scene.scene_type,
            'setting': setting,
            'setting_description': scene.setting_description,
            'dramatic_moments': scene.dramatic_moments,
            'full_analysis': scene.analysis_result
        }
    })
