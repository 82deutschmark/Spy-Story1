import logging
from flask import Blueprint, request, jsonify
from models.character_data import Character

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
    """API endpoint for making a story choice"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Forward to the main route handler
        from routes.main_routes import make_choice as make_choice_handler
        result = make_choice_handler(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"API error in make_choice: {str(e)}")
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