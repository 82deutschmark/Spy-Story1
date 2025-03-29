"""
Main Web Routes Module
======================

This module handles all web UI routes and template rendering. It manages user sessions
and provides the interactive story experience through HTML templates.

Key Responsibilities:
- Web page rendering with templates
- Session management
- Form handling
- User progress tracking through sessions
- Story state management for web UI
- Character selection interface
- Story progression through web forms

Integration Points:
- Templates: Renders HTML templates from /templates
- Session: Manages Flask session data
- GameEngine: Core game logic but accessed through web context
- Database: Queries through SQLAlchemy models 

Note: This module should NOT be imported by API routes. All shared logic
should go through the GameEngine or other service classes.
"""

import os
import json
import uuid
import sys
from datetime import datetime
from typing import List

from flask import (Blueprint, render_template, request, jsonify, url_for,
                   redirect, flash, session, render_template_string)
import logging

from database import db
from models import (AIInstruction, StoryGeneration, StoryNode, 
                    StoryChoice, UserProgress, Transaction, PlotArc,
                    CharacterEvolution, Mission)
from models.character_data import Character
from models.scene_images import SceneImages
from services.story_maker import generate_story, get_story_options
from services.game_engine import GameEngine
from services.mission_generator import update_mission_progress
from services.state_manager import GameState
from utils.validation_utils import validate_story_parameters, validate_string_length
from utils.currency_utils import process_transaction
from utils.db_utils import get_or_create_user_progress as db_get_or_create_user_progress
from utils.character_manager import get_random_characters
from utils.context_manager import configure_logging

# Set up logging
logger = logging.getLogger(__name__)

def setup_logging() -> None:
    """Configure main routes logging to ensure console visibility."""
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
        root_logger.setLevel(logging.INFO)

    # Configure API libraries for debugging
    logging.getLogger("httpx").setLevel(logging.DEBUG)
    logging.getLogger("openai").setLevel(logging.DEBUG)
    logger.info("Main routes logging configured")

# Initialize logging
setup_logging()
configure_logging()

# Create Blueprint
main_bp = Blueprint('main', __name__)
REQUIRED_ROLES = ['mission-giver', 'villain']


def serialize_character(char: Character, include_backstory: bool = False) -> dict:
    """
    Convert a Character instance into a dictionary suitable for JSON responses or template context.
    """
    role = (char.character_role or 'neutral').lower()
    if role not in ['mission-giver', 'villain', 'neutral', 'undetermined']:
        role = 'neutral'
    data = {
        'id': char.id,
        'image_url': char.image_url,
        'name': char.character_name,
        'story': char.description or '',
        'character_traits': char.character_traits or [],
        'plot_lines': char.plot_lines or [],
        'character_role': role,
        'role': role
    }
    if include_backstory:
        data['backstory'] = getattr(char, 'backstory', "")
    return data


def ensure_branch_metadata(node: StoryNode) -> None:
    """
    Ensure that the current story node has all the default keys in its branch metadata.
    """
    if not node.branch_metadata:
        node.branch_metadata = {
            "choices": {},
            "timestamp": datetime.utcnow().isoformat(),
            "character_relationships": {},
            "active_missions": []
        }
    else:
        node.branch_metadata.setdefault("timestamp", datetime.utcnow().isoformat())
        node.branch_metadata.setdefault("character_relationships", {})
        node.branch_metadata.setdefault("active_missions", [])
        node.branch_metadata.setdefault("choices", {})
    db.session.commit()


def update_choice_character_ids(choices: list, character_images: list) -> None:
    """
    Iterate over branch metadata choices and convert character name to ID if needed.
    Also, append any missing character data to character_images.
    """
    for choice in choices:
        if choice.get('character_id'):
            try:
                character_id = choice['character_id']
                # If character_id is not a valid int, attempt conversion from name
                if not isinstance(character_id, int) and not (
                    isinstance(character_id, str) and character_id.isdigit()
                ):
                    logger.warning(f"Found character name instead of ID in choice: {character_id}")
                    character = Character.query.filter_by(character_name=character_id).first()
                    if character:
                        choice['character_id'] = character.id
                        db.session.commit()
                        logger.info(f"Converted character name '{character_id}' to ID: {character.id}")
                    else:
                        choice['character_id'] = None
                        db.session.commit()
                        logger.warning(f"Character name '{character_id}' not found, setting to None")
                        continue

                # Convert numeric string to integer if necessary
                if isinstance(choice['character_id'], str) and choice['character_id'].isdigit():
                    choice['character_id'] = int(choice['character_id'])
                    db.session.commit()

                # Append character details if not already loaded
                if not any(char['id'] == choice['character_id'] for char in character_images):
                    character = Character.query.get(choice['character_id'])
                    if character:
                        character_images.append(serialize_character(character))
            except Exception as e:
                logger.error(f"Error processing character_id: {str(e)}")
                choice['character_id'] = None
                db.session.commit()


def process_selected_characters(selected_ids: List[str]) -> List[Character]:
    """
    Process and return a list of selected Character objects.
    If no valid selections are made, return random characters.
    Also ensure that required roles are present.
    """
    character_ids = []
    for id_value in selected_ids:
        if ',' in id_value:
            character_ids.extend([int(cid.strip()) for cid in id_value.split(',')])
        else:
            character_ids.append(int(id_value))

    if character_ids:
        selected_characters = Character.query.filter(
            Character.id.in_(character_ids)
        ).all()
        # Add missing required roles if necessary
        if selected_characters:
            existing_roles = [char.character_role.lower() for char in selected_characters if char.character_role]
            for role in REQUIRED_ROLES:
                if role not in existing_roles:
                    missing_char = Character.query.filter_by(character_role=role).order_by(db.func.random()).first()
                    if missing_char:
                        selected_characters.append(missing_char)
            return selected_characters
    # Fallback: if no characters were provided or found, use random ones.
    return get_random_characters_with_roles()


def build_character_form_data(selected_characters: List[Character]) -> dict:
    """
    Build form data for character selection including protagonist and additional characters.
    """
    form_data = {
        'selected_characters': [char.id for char in selected_characters],
        'protagonist_info': serialize_character(selected_characters[0], include_backstory=True)
    }
    if len(selected_characters) > 1:
        form_data['additional_characters'] = [
            serialize_character(char, include_backstory=True) for char in selected_characters[1:]
        ]
    return form_data


def get_random_scene_background() -> str:
    scene = SceneImages.query.filter_by(image_type='scene').order_by(db.func.random()).first()
    return scene.image_url if scene else None


def get_random_characters_with_roles() -> List[Character]:
    """
    Select at least one mission-giver and one villain.
    Uses get_random_characters() and supplements missing roles.
    """
    selected = get_random_characters(3)
    roles = [char.character_role.lower() for char in selected if char.character_role]
    if 'mission-giver' not in roles:
        mg = Character.query.filter_by(character_role='mission-giver').order_by(db.func.random()).first()
        if mg and mg not in selected:
            selected.append(mg)
    if 'villain' not in roles:
        vil = Character.query.filter_by(character_role='villain').order_by(db.func.random()).first()
        if vil and vil not in selected:
            selected.append(vil)
    return selected


def get_or_create_progress(protagonist_name=None) -> UserProgress:
    """
    Ensure a user_id exists in session and retrieve or create user progress.
    """
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    return db_get_or_create_user_progress(session['user_id'], protagonist_name)


@main_bp.route('/')
def index():
    story_options = get_story_options()
    background_image = get_random_scene_background()
    characters = get_random_characters_with_roles()
    if not characters:
        return render_template('error.html', error_message="Unable to load characters. Please try again later.")

    # Serialize characters for display
    character_data = [serialize_character(char) for char in characters]

    user_progress = None
    if request.args.get('init_progress'):
        user_progress = get_or_create_progress()

    return render_template('index.html',
                           story_options=story_options,
                           images=character_data,
                           background_image=background_image,
                           user_progress=user_progress)


@main_bp.route('/storyboard/<int:story_id>')
def storyboard(story_id):
    story = StoryGeneration.query.get_or_404(story_id)
    user_progress = get_or_create_progress()
    game_state = GameState(user_progress.user_id)
    user_progress.current_story_id = story_id
    background_image = get_random_scene_background()

    # Build initial character images from the story's characters
    character_images = [
        {
            'id': char.id,
            'image_url': char.image_url,
            'name': char.character_name,
            'traits': char.character_traits
        } for char in story.characters
    ]

    current_node = game_state.resolve_current_node()
    if not current_node:
        flash('Error: Could not resolve current story node', 'error')
        return redirect(url_for('main.dashboard'))

    # Update choices in branch metadata with valid character IDs
    if current_node.branch_metadata and 'choices' in current_node.branch_metadata:
        update_choice_character_ids(current_node.branch_metadata['choices'], character_images)

    ensure_branch_metadata(current_node)

    # Merge character relationship data into character images
    for char_id, char_info in current_node.branch_metadata.get("character_relationships", {}).items():
        for i, char in enumerate(character_images):
            if str(char['id']) == char_id:
                character_images[i].update({'relationship_level': char_info.get('relationship_level', 0)})

    story_progress = {
        'current_story_id': user_progress.current_story_id,
        'current_node_id': current_node.id,
        'completed_plot_arcs': user_progress.completed_plot_arcs or [],
        'choice_history': user_progress.choice_history or [],
        'active_missions': current_node.branch_metadata.get("active_missions", [])
    }

    # Update narrative text and commit changes
    story.narrative_text = current_node.narrative_text
    db.session.commit()

    return render_template('storyboard.html',
                           story=story,
                           story_id=story_id,
                           node=current_node,
                           character_images=character_images,
                           background_image=background_image,
                           user_progress=user_progress,
                           story_progress=story_progress)


@main_bp.route('/generate_story', methods=['POST'])
def generate_story_route():
    logger.info(f"Received {request.method} request at /generate_story")
    form_data = request.form.to_dict()
    selected_ids = request.form.getlist('selected_images')

    selected_characters = process_selected_characters(selected_ids)
    if not selected_characters:
        return jsonify({'error': 'Missing required character roles'}), 500

    # Build form data with full character details
    form_data.update(build_character_form_data(selected_characters))

    user_progress = get_or_create_progress()
    game_engine = GameEngine(user_id=user_progress.user_id)
    story_data = game_engine.start_new_story(form_data=form_data)

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'success': True, 'redirect': url_for('main.storyboard', story_id=story_data['story_id'])})
    else:
        return redirect(url_for('main.storyboard', story_id=story_data['story_id']))


@main_bp.route('/make_choice', methods=['POST'])
def make_choice():
    logger.info("=== /make_choice POST endpoint called ===")
    if request.is_json:
        data = request.get_json()
        logger.debug(f"JSON POST data: {json.dumps(data, indent=2)}")
        story_id = data.get('story_id')
        choice_id = data.get('choice_id')
        previous_choice = data.get('previous_choice')
        story_context = data.get('story_context')
        characters = data.get('characters', [])
    else:
        logger.debug(f"Form POST data: {request.form}")
        story_id = request.form.get('story_id')
        choice_id = request.form.get('choice_id')
        previous_choice = request.form.get('previous_choice')
        story_context = request.form.get('story_context')
        characters = request.form.getlist('characters[]')

    if not story_id or not choice_id:
        raise ValueError("Missing required fields")

    story = StoryGeneration.query.get_or_404(story_id)
    user_progress = get_or_create_progress()
    game_engine = GameEngine(user_id=user_progress.user_id)

    # Retrieve complete character details if provided
    character_objects = []
    if characters:
        for char_id in characters:
            char = Character.query.get(char_id)
            if char:
                character_objects.append(serialize_character(char, include_backstory=True))
    characters = character_objects

    result = game_engine.make_choice(
        choice_id=choice_id,
        custom_choice_text=previous_choice,
        story_context=story_context,
        characters=characters
    )

    # Log a summary of the result
    summary = {
        'current_node_id': result.get('current_node', {}).get('id'),
        'choice_count': len(result.get('available_choices', [])),
        'mission_updates': len(result.get('mission_updates', [])),
        'character_updates': len(result.get('character_updates', []))
    }
    logger.debug(f"make_choice result (summary): {json.dumps(summary, indent=2)}")

    result.update({'success': True, 'story_id': story_id})
    return jsonify(result)


@main_bp.route('/reroll_character', methods=['POST'])
def reroll_character():
    data = request.json
    character_id = data.get('character_id')
    if not character_id:
        return jsonify({'error': 'No character ID provided'}), 400

    new_character = (Character.query.filter(Character.id != character_id)
                     .filter(Character.character_name.isnot(None))
                     .order_by(db.func.random()).first())
    if not new_character:
        return jsonify({'error': 'No alternative characters found'}), 404

    char_data = serialize_character(new_character)
    # Render partial using the updated character data
    character_html = render_template_string(
        "{% from 'partials/character_card.html' import character_card %}{{ character_card(img, index) }}",
        img=char_data,
        index=0
    )
    return jsonify({'success': True, 'character': char_data, 'character_html': character_html})


@main_bp.route('/api/user/progress')
def api_user_progress():
    user_progress = get_or_create_progress()
    progress_data = {
       "active_missions": user_progress.active_missions or [],
       "currency": user_progress.currency_balances,
       "notes": user_progress.game_state.get("notes", "No notes yet")
    }
    return jsonify(progress_data)
