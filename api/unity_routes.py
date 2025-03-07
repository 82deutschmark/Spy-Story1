from flask import Blueprint, jsonify, request
from models import StoryNode, StoryChoice, UserProgress, ImageAnalysis
from database import db
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

unity_api = Blueprint('unity_api', __name__)

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