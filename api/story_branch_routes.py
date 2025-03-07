
from flask import Blueprint, jsonify, request
from services.story_branching import StoryBranchingService
from models import StoryNode, StoryChoice, ImageAnalysis, UserProgress
from app import db

story_branch_bp = Blueprint('story_branch', __name__, url_prefix='/api/story')

@story_branch_bp.route('/node/<int:node_id>/choices', methods=['GET'])
def get_node_choices(node_id):
    """Get available choices for a story node, potentially modified by character traits"""
    user_id = request.args.get('user_id', 'anonymous')
    
    choices = StoryBranchingService.get_next_node_options(node_id, user_id)
    return jsonify({
        'success': True,
        'choices': choices
    })

@story_branch_bp.route('/suggest', methods=['POST'])
def suggest_story_paths():
    """Suggest story paths based on selected characters"""
    data = request.json
    character_ids = data.get('character_ids', [])
    
    if not character_ids:
        return jsonify({
            'success': False,
            'error': 'No characters selected'
        })
    
    suggestions = StoryBranchingService.suggest_story_paths_for_characters(character_ids)
    
    return jsonify({
        'success': True,
        'suggestions': suggestions
    })

@story_branch_bp.route('/achievement/unlock', methods=['POST'])
def unlock_achievement():
    """Unlock an achievement for a user based on character combination"""
    data = request.json
    user_id = data.get('user_id', 'anonymous')
    character_ids = data.get('character_ids', [])
    achievement_name = data.get('achievement_name')
    achievement_description = data.get('achievement_description')
    
    if not all([character_ids, achievement_name, achievement_description]):
        return jsonify({
            'success': False,
            'error': 'Missing required fields'
        })
    
    achievement = StoryBranchingService.unlock_achievement_for_character_combo(
        user_id, 
        character_ids, 
        achievement_name, 
        achievement_description
    )
    
    if achievement:
        return jsonify({
            'success': True,
            'achievement': {
                'id': achievement.id,
                'name': achievement.name,
                'description': achievement.description,
                'points': achievement.points
            }
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to unlock achievement'
        })

@story_branch_bp.route('/node/create/scene-based', methods=['POST'])
def create_scene_node():
    """Create a new story node based on a scene image"""
    data = request.json
    scene_id = data.get('scene_id')
    previous_node_id = data.get('previous_node_id')
    narrative_text = data.get('narrative_text')
    
    if not scene_id:
        return jsonify({
            'success': False,
            'error': 'Scene ID is required'
        })
    
    try:
        node = StoryBranchingService.generate_scene_based_node(
            scene_id,
            previous_node_id,
            narrative_text
        )
        
        return jsonify({
            'success': True,
            'node': {
                'id': node.id,
                'narrative_text': node.narrative_text,
                'image_id': node.image_id
            }
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@story_branch_bp.route('/choice/create/character-driven', methods=['POST'])
def create_character_choice():
    """Create a new choice driven by a character's traits"""
    data = request.json
    node_id = data.get('node_id')
    character_id = data.get('character_id')
    choice_text = data.get('choice_text')
    next_node_id = data.get('next_node_id')
    required_traits = data.get('required_traits', [])
    tags = data.get('tags', [])
    
    if not all([node_id, character_id, choice_text]):
        return jsonify({
            'success': False,
            'error': 'Missing required fields'
        })
    
    try:
        choice = StoryBranchingService.create_character_driven_choice(
            node_id,
            character_id,
            choice_text,
            next_node_id,
            required_traits,
            tags
        )
        
        return jsonify({
            'success': True,
            'choice': {
                'id': choice.id,
                'choice_text': choice.choice_text,
                'node_id': choice.node_id,
                'next_node_id': choice.next_node_id
            }
        })
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })
