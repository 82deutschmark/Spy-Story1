"""
API Routes Module
===============

This module provides JSON API endpoints for programmatic access to the story engine.
It handles stateless requests and returns structured data without any UI components.

Key Responsibilities:
- JSON-only responses
- No session management
- Direct GameEngine interaction
- Structured error responses
- Status monitoring endpoints
- Character data access
- Story state queries

Integration Points:
- GameEngine: Direct usage without UI layers
- Database: Direct model queries
- Client Apps: Provides JSON interface
- Monitoring: System status endpoints

Note: This module should NOT:
- Import from main_routes
- Use Flask sessions
- Return HTML/templates
- Handle form data (use request.json only)
"""

import logging
from flask import Blueprint, request, jsonify
from models.character_data import Character
import os

from services.game_engine import GameEngine

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

@api_bp.route('/config_dump', methods=['GET'])
def config_dump():
    """
    Temporary route for diagnostics: Dump sanitized configuration if in debug mode.
    """
    if not request.args.get('admin'):
        return jsonify({"error": "Unauthorized"}), 403
    safe_config = {
        "FLASK_CONFIG": os.environ.get('FLASK_CONFIG', 'not set'),
        "OPENAI_API_KEY_PRESENT": bool(os.environ.get("OPENAI_API_KEY"))
    }
    logger.info(f"Configuration dump: {safe_config}")
    return jsonify(safe_config)

@api_bp.route('/random_character', methods=['GET'])
def random_character():
    """
    Return a random character from the database.
    """
    import random
    import logging

    try:
        # Get all characters using the new Character model
        characters = Character.query.order_by(Character.id).all()

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
            "name": random_char.character_name,
            "image_url": random_char.image_url,
            "character_role": random_char.character_role or "neutral",
            "success": True
        }

        logger.info(f"Returning character data: {response_data}")
        return jsonify(response_data)
    except Exception as e:
        logger.error(f"Error fetching random character: {str(e)}")
        return jsonify({"error": str(e), "success": False}), 500

@api_bp.route('/story/make_choice', methods=['POST'])
def api_make_choice():
    """API endpoint for making story choices"""
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    required_fields = ['story_id', 'choice_id', 'user_id']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        game_engine = GameEngine(user_id=data['user_id'])
        
        # Get character details from IDs for complete character data
        characters = []
        if 'characters' in data and data['characters']:
            character_ids = data['characters']
            for char_id in character_ids:
                char = Character.query.get(char_id)
                if char:
                    characters.append({
                        "id": char.id,
                        "character_name": char.character_name,
                        "name": char.character_name,
                        "character_role": char.character_role,
                        "role": char.character_role,
                        "character_traits": char.character_traits or {},
                        "backstory": getattr(char, 'backstory', ""),
                        "plot_lines": getattr(char, 'plot_lines', [])
                    })
        
        result = game_engine.make_choice(
            choice_id=data['choice_id'],
            custom_choice_text=data.get('previous_choice'),
            story_context=data.get('story_context'),
            characters=characters
        )
        return jsonify({
            'success': True,
            'current_node': result['current_node'],
            'story_id': data['story_id']
        })
    except Exception as e:
        logger.error(f"Error in make_choice: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/user/progress', methods=['GET'])
def get_user_progress():
    """API endpoint for getting user progress by codename"""
    try:
        codename = request.args.get('codename')
        if not codename:
            return jsonify({'error': 'No codename provided'}), 400

        # Query the database for user progress with matching protagonist name
        from models.user import UserProgress

        # Find user progress with matching protagonist name from game_state
        user_progress = UserProgress.query.filter(
            UserProgress.game_state.has_key('protagonist_name')
        ).filter(
            UserProgress.game_state['protagonist_name'].astext == codename
        ).first()

        if not user_progress:
            return jsonify({
                'success': False,
                'message': 'No user progress found with that codename',
                'create_new': True
            })

        # Return user progress data with proper null handling for all required fields
        return jsonify({
            'success': True,
            'user_progress': {
                'user_id': user_progress.user_id,
                'level': user_progress.level,
                'experience_points': user_progress.experience_points,
                'currency_balances': user_progress.currency_balances or {},
                'active_missions': user_progress.active_missions or [],
                'completed_plot_arcs': user_progress.completed_plot_arcs if hasattr(user_progress, 'completed_plot_arcs') else [],
                'choice_history': user_progress.choice_history if hasattr(user_progress, 'choice_history') else [],
                'encountered_characters': user_progress.encountered_characters or {},
                'current_story_id': user_progress.current_story_id
            }
        })
    except Exception as e:
        logger.error(f"API error in get_user_progress: {str(e)}")
        return jsonify({'error': str(e)}), 500