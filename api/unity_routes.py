from flask import Blueprint, jsonify, request, current_app
from models import StoryNode, StoryChoice, UserProgress, ImageAnalysis, Achievement # Added Achievement import
from database import db
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import functools
from flask import current_app, make_response
import time

unity_api = Blueprint('unity_api', __name__)

# Cache configuration
CACHE_TIMEOUT = 300  # 5 minutes cache timeout

def rate_limit(requests_per_minute=60):
    """Decorator to implement rate limiting for API endpoints"""
    def decorator(f):
        # Store last request timestamps per IP
        requests = {}

        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            # Get client IP
            ip = request.remote_addr
            now = time.time()

            # Initialize request history for this IP
            if ip not in requests:
                requests[ip] = []

            # Clean old requests
            requests[ip] = [req_time for req_time in requests[ip] 
                          if now - req_time < 60.0]

            # Check rate limit
            if len(requests[ip]) >= requests_per_minute:
                response = APIResponse(
                    success=False,
                    error="Rate limit exceeded. Please wait before making more requests.",
                    metadata={"retry_after": "60 seconds"}
                ).to_dict()
                return jsonify(response), 429

            # Add current request
            requests[ip].append(now)
            return f(*args, **kwargs)
        return wrapped
    return decorator

def cache_response(timeout=CACHE_TIMEOUT):
    """Decorator to cache API responses"""
    def decorator(f):
        cache = {}
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            cache_key = f"{f.__name__}:{str(args)}:{str(kwargs)}"
            now = datetime.utcnow().timestamp()

            if cache_key in cache:
                result, timestamp = cache[cache_key]
                if now - timestamp < timeout:
                    return result

            result = f(*args, **kwargs)
            cache[cache_key] = (result, now)
            return result
        return wrapped
    return decorator

@dataclass
class APIResponse:
    """Standardized API response format for Unity client"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        response = {
            'success': self.success,
            'timestamp': datetime.utcnow().isoformat(),
            'version': '1.0'
        }
        if self.data is not None:
            response['data'] = self.data
        if self.error is not None:
            response['error'] = self.error
        if self.metadata is not None:
            response['metadata'] = self.metadata
        return response

@unity_api.route('/story-node/<int:node_id>')
@rate_limit(requests_per_minute=60)
@cache_response(timeout=60)  # Cache story nodes for 1 minute
def get_story_node(node_id):
    """Get a specific story node and its choices"""
    try:
        node = StoryNode.query.get_or_404(node_id)

        # Get associated image if it exists
        image_data = None
        if node.image:
            image_data = {
                'url': node.image.image_url,
                'character_name': node.image.character_name,
                'character_traits': node.image.character_traits
            }

        # Format choices
        choices = []
        for choice in node.choices:
            choices.append({
                'id': choice.id,
                'text': choice.choice_text,
                'consequence': choice.consequence
            })

        response = APIResponse(
            success=True,
            data={
                'node': {
                    'id': node.id,
                    'narrative_text': node.narrative_text,
                    'image': image_data,
                    'choices': choices,
                    'is_endpoint': node.is_endpoint
                }
            }
        )
        return jsonify(response.to_dict())
    except Exception as e:
        return jsonify(APIResponse(success=False, error=str(e)).to_dict()), 500

@unity_api.route('/select-choice/<int:choice_id>', methods=['POST'])
@rate_limit(requests_per_minute=30)  # Lower limit for state-changing operations
def select_choice(choice_id):
    """Process a choice selection and return the next story node"""
    try:
        choice = StoryChoice.query.get_or_404(choice_id)

        # Get user progress from request
        user_id = request.json.get('user_id')
        if not user_id:
            return jsonify(APIResponse(success=False, error='user_id is required').to_dict()), 400

        # Update or create user progress
        user_progress = UserProgress.query.filter_by(user_id=user_id).first()
        if not user_progress:
            user_progress = UserProgress(user_id=user_id)

        # Update progress to next node
        user_progress.current_node_id = choice.next_node_id
        db.session.add(user_progress)
        db.session.commit()

        response = APIResponse(
            success=True,
            data={
                'next_node_id': choice.next_node_id,
                'progress_saved': True
            },
            metadata={
                'choice_id': choice_id,
                'user_id': user_id
            }
        )
        return jsonify(response.to_dict())
    except Exception as e:
        return jsonify(APIResponse(success=False, error=str(e)).to_dict()), 500

@unity_api.route('/user-progress/<string:user_id>')
@rate_limit(requests_per_minute=60)
def get_user_progress(user_id):
    """Get the current progress for a user"""
    try:
        progress = UserProgress.query.filter_by(user_id=user_id).first()

        response = APIResponse(
            success=True,
            data={
                'has_progress': progress is not None,
                'current_node_id': progress.current_node_id if progress else None
            },
            metadata={
                'user_id': user_id,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        return jsonify(response.to_dict())
    except Exception as e:
        return jsonify(APIResponse(success=False, error=str(e)).to_dict()), 500

@unity_api.route('/characters')
@rate_limit(requests_per_minute=30)
@cache_response(timeout=300)  # Cache character list for 5 minutes
def get_characters():
    """Get all available characters"""
    try:
        characters = ImageAnalysis.query.filter_by(image_type='character').all()
        character_list = []

        for char in characters:
            character_list.append({
                'id': char.id,
                'name': char.character_name,
                'image_url': char.image_url,
                'traits': char.character_traits,
                'role': char.character_role,
                'plot_lines': char.plot_lines
            })

        response = APIResponse(
            success=True,
            data={'characters': character_list},
            metadata={
                'count': len(character_list),
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        return jsonify(response.to_dict())
    except Exception as e:
        return jsonify(APIResponse(success=False, error=str(e)).to_dict()), 500


@unity_api.route('/story-branch/<int:node_id>')
def get_story_branch(node_id):
    """Get the complete branch information for a story node"""
    try:
        node = StoryNode.query.get_or_404(node_id)

        # Get branch history (ancestors)
        branch_history = []
        current = node
        while current.parent_node:
            branch_history.append({
                'id': current.id,
                'narrative_text': current.narrative_text,
                'branch_metadata': current.branch_metadata
            })
            current = current.parent_node

        # Get available sub-branches (children)
        sub_branches = [{
            'id': child.id,
            'preview': child.narrative_text[:100] + '...',
            'metadata': child.branch_metadata
        } for child in node.child_nodes]

        response = APIResponse(
            success=True,
            data={
                'current_node': {
                    'id': node.id,
                    'narrative_text': node.narrative_text,
                    'metadata': node.branch_metadata
                },
                'branch_history': branch_history,
                'sub_branches': sub_branches
            }
        )
        return jsonify(response.to_dict())
    except Exception as e:
        return jsonify(APIResponse(success=False, error=str(e)).to_dict()), 500

@unity_api.route('/achievements/<string:user_id>')
def get_user_achievements(user_id):
    """Get all achievements and their status for a user"""
    try:
        progress = UserProgress.query.filter_by(user_id=user_id).first()
        earned_achievements = progress.achievements_earned if progress else []

        # Get all achievements
        achievements = Achievement.query.all()
        achievement_list = []

        for achievement in achievements:
            achievement_list.append({
                'id': achievement.id,
                'name': achievement.name,
                'description': achievement.description,
                'points': achievement.points,
                'earned': achievement.id in earned_achievements if earned_achievements else False,
                'criteria': achievement.criteria
            })

        response = APIResponse(
            success=True,
            data={
                'achievements': achievement_list,
                'total_points': sum(a['points'] for a in achievement_list if a['earned'])
            }
        )
        return jsonify(response.to_dict())
    except Exception as e:
        return jsonify(APIResponse(success=False, error=str(e)).to_dict()), 500

@unity_api.route('/save-game-state', methods=['POST'])
@rate_limit(requests_per_minute=30)  # Lower limit for state-changing operations
def save_game_state():
    """Save comprehensive game state for Unity client"""
    try:
        data = request.json
        user_id = data.get('user_id')
        if not user_id:
            return jsonify(APIResponse(success=False, error='user_id is required').to_dict()), 400

        # Get or create user progress
        progress = UserProgress.query.filter_by(user_id=user_id).first()
        if not progress:
            progress = UserProgress(user_id=user_id)

        # Update game state
        progress.current_node_id = data.get('current_node_id', progress.current_node_id)
        progress.choice_history = data.get('choice_history', progress.choice_history)
        progress.achievements_earned = data.get('achievements_earned', progress.achievements_earned)
        progress.game_state = data.get('game_state', progress.game_state)

        db.session.add(progress)
        db.session.commit()

        response = APIResponse(
            success=True,
            data={'state_saved': True},
            metadata={
                'user_id': user_id,
                'saved_at': progress.last_updated.isoformat()
            }
        )
        return jsonify(response.to_dict())
    except Exception as e:
        return jsonify(APIResponse(success=False, error=str(e)).to_dict()), 500

@unity_api.route('/load-game-state/<string:user_id>')
def load_game_state(user_id):
    """Load comprehensive game state for Unity client"""
    try:
        progress = UserProgress.query.filter_by(user_id=user_id).first()
        if not progress:
            return jsonify(APIResponse(success=False, error='No saved game state found').to_dict()), 404

        response = APIResponse(
            success=True,
            data={
                'current_node_id': progress.current_node_id,
                'choice_history': progress.choice_history,
                'achievements_earned': progress.achievements_earned,
                'game_state': progress.game_state,
                'last_updated': progress.last_updated.isoformat()
            }
        )
        return jsonify(response.to_dict())
    except Exception as e:
        return jsonify(APIResponse(success=False, error=str(e)).to_dict()), 500