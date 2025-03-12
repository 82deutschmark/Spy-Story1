
import logging
from flask import Blueprint, jsonify, request
from services.game_engine import GameEngine
from models import UserProgress, Mission
from database import db

logger = logging.getLogger(__name__)

# Create Blueprint
game_api = Blueprint('game_api', __name__, url_prefix='/api/game')

@game_api.route('/state/<user_id>', methods=['GET'])
def get_game_state(user_id):
    """Get the current game state for a user"""
    try:
        game_state = GameEngine.get_game_state(user_id)
        return jsonify({
            "status": "success",
            "data": game_state.to_dict()
        })
    except Exception as e:
        logger.error(f"Error getting game state: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@game_api.route('/story/start', methods=['POST'])
def start_story():
    """Start a new story"""
    try:
        data = request.json
        user_id = data.get('user_id')
        conflict = data.get('conflict')
        setting = data.get('setting')
        narrative_style = data.get('narrative_style')
        mood = data.get('mood')
        character_id = data.get('character_id')
        custom_conflict = data.get('custom_conflict')
        custom_setting = data.get('custom_setting') 
        custom_narrative = data.get('custom_narrative')
        custom_mood = data.get('custom_mood')
        
        # Validate required parameters
        if not all([user_id, conflict, setting, narrative_style, mood]):
            return jsonify({
                "status": "error",
                "message": "Missing required parameters"
            }), 400
        
        # Start new story
        story_data, game_state = GameEngine.start_new_story(
            user_id=user_id,
            conflict=conflict,
            setting=setting,
            narrative_style=narrative_style,
            mood=mood,
            character_id=character_id,
            custom_conflict=custom_conflict,
            custom_setting=custom_setting,
            custom_narrative=custom_narrative,
            custom_mood=custom_mood
        )
        
        return jsonify({
            "status": "success",
            "story": story_data,
            "game_state": game_state.to_dict()
        })
    except Exception as e:
        logger.error(f"Error starting story: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@game_api.route('/story/choice', methods=['POST'])
def make_choice():
    """Make a story choice"""
    try:
        data = request.json
        user_id = data.get('user_id')
        choice_id = data.get('choice_id')
        custom_choice_text = data.get('custom_choice_text')
        
        # Validate required parameters
        if not all([user_id, choice_id]):
            return jsonify({
                "status": "error",
                "message": "Missing required parameters"
            }), 400
        
        # Process choice
        story_data, game_state = GameEngine.make_choice(
            user_id=user_id,
            choice_id=choice_id,
            custom_choice_text=custom_choice_text
        )
        
        return jsonify({
            "status": "success",
            "story_continuation": story_data,
            "game_state": game_state.to_dict()
        })
    except ValueError as e:
        logger.error(f"Error with choice: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 400
    except Exception as e:
        logger.error(f"Error processing choice: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@game_api.route('/missions/<user_id>', methods=['GET'])
def get_missions(user_id):
    """Get all missions for a user"""
    try:
        # Get user progress
        user_progress = UserProgress.query.filter_by(user_id=user_id).first()
        if not user_progress:
            return jsonify({
                "status": "error",
                "message": "User not found"
            }), 404
        
        # Get active missions
        active_missions = Mission.query.filter(
            Mission.id.in_(user_progress.active_missions) if user_progress.active_missions else [],
            Mission.user_id == user_id
        ).all()
        
        # Get completed missions
        completed_missions = Mission.query.filter(
            Mission.id.in_(user_progress.completed_missions) if user_progress.completed_missions else [],
            Mission.user_id == user_id
        ).all()
        
        # Get failed missions
        failed_missions = Mission.query.filter(
            Mission.id.in_(user_progress.failed_missions) if user_progress.failed_missions else [],
            Mission.user_id == user_id
        ).all()
        
        return jsonify({
            "status": "success",
            "active_missions": [
                {
                    "id": mission.id,
                    "title": mission.title,
                    "description": mission.description,
                    "objective": mission.objective,
                    "progress": mission.progress,
                    "reward_currency": mission.reward_currency,
                    "reward_amount": mission.reward_amount,
                    "difficulty": mission.difficulty
                } for mission in active_missions
            ],
            "completed_missions": [
                {
                    "id": mission.id,
                    "title": mission.title,
                    "description": mission.description,
                    "objective": mission.objective,
                    "status": mission.status,
                    "reward_currency": mission.reward_currency,
                    "reward_amount": mission.reward_amount,
                    "difficulty": mission.difficulty
                } for mission in completed_missions
            ],
            "failed_missions": [
                {
                    "id": mission.id,
                    "title": mission.title,
                    "description": mission.description,
                    "objective": mission.objective,
                    "status": mission.status,
                    "reward_currency": mission.reward_currency,
                    "reward_amount": mission.reward_amount,
                    "difficulty": mission.difficulty
                } for mission in failed_missions
            ]
        })
    except Exception as e:
        logger.error(f"Error getting missions: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@game_api.route('/mission/update', methods=['POST'])
def update_mission():
    """Update a mission's status"""
    try:
        data = request.json
        user_id = data.get('user_id')
        mission_id = data.get('mission_id')
        status = data.get('status')  # 'complete' or 'fail'
        reason = data.get('reason')
        
        # Validate required parameters
        if not all([user_id, mission_id, status]):
            return jsonify({
                "status": "error",
                "message": "Missing required parameters"
            }), 400
        
        # Update mission status
        game_state = GameEngine.update_mission_status(
            user_id=user_id,
            mission_id=mission_id,
            status=status,
            reason=reason
        )
        
        return jsonify({
            "status": "success",
            "game_state": game_state.to_dict()
        })
    except Exception as e:
        logger.error(f"Error updating mission: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
import logging
from flask import Blueprint, request, jsonify, session
from services.game_engine import GameEngine, GameState
from models import UserProgress

# Configure logging
logger = logging.getLogger(__name__)

# Create GameAPI Blueprint
game_api = Blueprint('game_api', __name__, url_prefix='/api/game')

@game_api.route('/state', methods=['GET'])
def get_game_state():
    """Get current game state for the user"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session not found'}), 401
    
    try:
        game_state = GameEngine.get_game_state(user_id)
        return jsonify({
            'success': True,
            'state': game_state.to_dict()
        })
    except Exception as e:
        logger.error(f"Error getting game state: {str(e)}")
        return jsonify({'error': str(e)}), 500

@game_api.route('/start-story', methods=['POST'])
def start_new_story():
    """Start a new story for the user"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session not found'}), 401
    
    try:
        data = request.json
        story_data, game_state = GameEngine.start_new_story(
            user_id=user_id,
            conflict=data.get('conflict', 'Mysterious adventure'),
            setting=data.get('setting', 'Enchanted world'),
            narrative_style=data.get('narrative_style', 'Engaging modern style'),
            mood=data.get('mood', 'Exciting and adventurous'),
            character_id=data.get('character_id'),
            custom_conflict=data.get('custom_conflict'),
            custom_setting=data.get('custom_setting'),
            custom_narrative=data.get('custom_narrative'),
            custom_mood=data.get('custom_mood')
        )
        
        return jsonify({
            'success': True,
            'story': story_data,
            'state': game_state.to_dict()
        })
    except Exception as e:
        logger.error(f"Error starting new story: {str(e)}")
        return jsonify({'error': str(e)}), 500

@game_api.route('/make-choice', methods=['POST'])
def make_story_choice():
    """Make a choice in the current story"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session not found'}), 401
    
    try:
        data = request.json
        choice_id = data.get('choice_id')
        custom_choice_text = data.get('custom_choice')
        
        if not choice_id and not custom_choice_text:
            return jsonify({'error': 'Must provide choice_id or custom_choice'}), 400
        
        story_data, game_state = GameEngine.make_choice(
            user_id=user_id,
            choice_id=choice_id,
            custom_choice_text=custom_choice_text
        )
        
        return jsonify({
            'success': True,
            'story': story_data,
            'state': game_state.to_dict()
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error making story choice: {str(e)}")
        return jsonify({'error': str(e)}), 500

@game_api.route('/missions/<int:mission_id>/update-status', methods=['POST'])
def update_mission_status():
    """Update a mission's status"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User session not found'}), 401
    
    try:
        data = request.json
        mission_id = data.get('mission_id')
        status = data.get('status')
        reason = data.get('reason')
        
        if not mission_id or not status:
            return jsonify({'error': 'Missing mission_id or status'}), 400
            
        if status not in ['complete', 'fail']:
            return jsonify({'error': 'Invalid status value'}), 400
            
        game_state = GameEngine.update_mission_status(
            user_id=user_id,
            mission_id=mission_id,
            status=status,
            reason=reason
        )
        
        return jsonify({
            'success': True,
            'state': game_state.to_dict()
        })
    except Exception as e:
        logger.error(f"Error updating mission status: {str(e)}")
        return jsonify({'error': str(e)}), 500
