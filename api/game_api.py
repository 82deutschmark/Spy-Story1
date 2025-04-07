import logging
from flask import Blueprint, jsonify, request, session
from services.game_engine import GameEngine
from models import UserProgress, Mission
from database import db

logger = logging.getLogger(__name__)

# Create Blueprint
game_api = Blueprint('game_api', __name__)

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
        # Validate incoming JSON
        try:
            data = request.get_json(force=True)
            if data is None:
                logger.error("Invalid JSON received: None")
                return jsonify({
                    "status": "error",
                    "message": "Invalid JSON data received"
                }), 400
        except Exception as e:
            logger.error(f"Error parsing JSON: {str(e)}")
            return jsonify({
                "status": "error",
                "message": f"Invalid JSON format: {str(e)}"
            }), 400
        
        # Extract fields with validation
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
        
        # Ensure text fields are properly encoded strings
        for field_name, field_value in [
            ('conflict', conflict),
            ('setting', setting),
            ('narrative_style', narrative_style),
            ('mood', mood),
            ('custom_conflict', custom_conflict),
            ('custom_setting', custom_setting),
            ('custom_narrative', custom_narrative),
            ('custom_mood', custom_mood)
        ]:
            if field_value is not None and not isinstance(field_value, str):
                logger.warning(f"Field {field_name} has unexpected type: {type(field_value)}")
                # Convert to string
                data[field_name] = str(field_value)
        
        # Update variable values after potential conversion
        conflict = data.get('conflict')
        setting = data.get('setting')
        narrative_style = data.get('narrative_style')
        mood = data.get('mood')
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

@game_api.route('/missions/active', methods=['GET'])
def get_active_missions():
    """Get all active missions for current user"""
    try:
        # Get user ID from session
        user_id = session.get('user_id', 'default_user')
        
        # Fetch active missions 
        active_missions = [
            {
                "id": 1,
                "title": "Infiltrate Enemy Base",
                "description": "Gather intelligence from a secure facility",
                "status": "active",
                "progress": 0.5,
                "rewards": {
                    "currency": "intel_points",
                    "amount": 500
                }
            },
            {
                "id": 2,
                "title": "Decode Encrypted Message",
                "description": "Break the enemy's communication cipher",
                "status": "active", 
                "progress": 0.2,
                "rewards": {
                    "currency": "intel_points", 
                    "amount": 300
                }
            }
        ]
        
        return jsonify({
            "status": "success",
            "missions": active_missions
        })
    except Exception as e:
        logger.error(f"Error fetching active missions: {str(e)}")
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
