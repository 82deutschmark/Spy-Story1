"""
Main Web Routes Module
=====================

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
from flask import Blueprint, render_template, request, jsonify, url_for, redirect, flash, session, render_template_string
import uuid
from datetime import datetime
from typing import List, Dict, Any

from database import db
from models import (AIInstruction, StoryGeneration, StoryNode, 
                   StoryChoice, UserProgress, Transaction, PlotArc, CharacterEvolution, Mission)
from models.character_data import Character
from models.scene_images import SceneImages
from services.story_maker import generate_story, get_story_options
from services.game_engine import GameEngine
from services.mission_generator import update_mission_progress
from services.state_manager import GameState
from utils.validation_utils import validate_story_parameters, validate_string_length
from utils.currency_utils import process_transaction
from utils.db_utils import get_or_create_user_progress as db_get_or_create_user_progress
from utils.character_manager import get_random_characters  # NEW import
from utils.context_manager import configure_logging  # Import the logging configuration function

import logging
import sys
logger = logging.getLogger(__name__)

# Ensure logs are visible in the console
def setup_logging():
    """Configure main routes logging to ensure visibility in console"""
    # Configure root logger if not already configured
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
        root_logger.setLevel(logging.INFO)
    
    # Configure httpx and openai for API debugging
    logging.getLogger("httpx").setLevel(logging.DEBUG)
    logging.getLogger("openai").setLevel(logging.DEBUG)
    
    logger.info("Main routes logging configured")

# Set up logging 
setup_logging()
configure_logging()  # Configure OpenAI context manager logging

# Create Blueprint
main_bp = Blueprint('main', __name__)

REQUIRED_ROLES = ['mission-giver', 'villain']

def get_or_create_user_progress(protagonist_name=None):
    from utils.db_utils import get_or_create_user_progress as db_get_or_create_user_progress
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
    user_progress = db_get_or_create_user_progress(session['user_id'], protagonist_name)
    return user_progress

def get_random_scene_background():
    scene = SceneImages.query.filter_by(image_type='scene').order_by(db.func.random()).first()
    return scene.image_url if scene else None

def get_random_characters_with_roles() -> List[Character]:
    """
    Select at least one mission-giver and one villain.
    Uses the central module's get_random_characters() then supplements missing roles.
    """
    selected = get_random_characters(3)
    # Ensure mission-giver and villain are present:
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

@main_bp.route('/')
def index():
    story_options = get_story_options()
    background_image = get_random_scene_background()
    characters = get_random_characters_with_roles()
    if not characters:
        return render_template('error.html', error_message="Unable to load characters. Please try again later.")
    character_data = []
    for char in characters:
        role = char.character_role or 'neutral'
        if role.lower() not in ['villain', 'neutral', 'mission-giver', 'undetermined']:
            role = 'neutral'
        char_data = {
            'id': char.id,
            'image_url': char.image_url,
            'name': char.character_name,
            'story': char.description or '',
            'character_traits': char.character_traits or [],
            'plot_lines': char.plot_lines or [],
            'character_role': role
        }
        character_data.append(char_data)
    user_progress = None
    if request.args.get('init_progress'):
        user_progress = get_or_create_user_progress()
    return render_template('index.html',
                           story_options=story_options,
                           images=character_data,
                           background_image=background_image,
                           user_progress=user_progress)

@main_bp.route('/storyboard/<int:story_id>')
def storyboard(story_id):
    story = StoryGeneration.query.get_or_404(story_id)
    user_progress = get_or_create_user_progress()
    game_state = GameState(user_progress.user_id)
    user_progress.current_story_id = story_id
    background_image = get_random_scene_background()
    character_images = []
    for character in story.characters:
        character_images.append({
            'id': character.id,
            'image_url': character.image_url,
            'name': character.character_name,
            'traits': character.character_traits
        })
    current_node = game_state.resolve_current_node()
    if not current_node:
        flash('Error: Could not resolve current story node', 'error')
        return redirect(url_for('main.dashboard'))
    
    # Debug logging removed

    if current_node.branch_metadata and 'choices' in current_node.branch_metadata:
        for choice in current_node.branch_metadata['choices']:
            if choice.get('character_id'):
                try:
                    # Fix for character_id sometimes being a string name instead of integer ID
                    character_id = choice['character_id']
                    # If character_id is not an integer, try to find the character by name
                    if not isinstance(character_id, int) and not (isinstance(character_id, str) and character_id.isdigit()):
                        # Looks like character_id is a name, search by name
                        logger.warning(f"Found character name instead of ID in choice: {character_id}")
                        character = Character.query.filter_by(character_name=character_id).first()
                        if character:
                            # Update the choice with the correct ID
                            choice['character_id'] = character.id
                            db.session.commit()  # Save the updated branch_metadata
                            logger.info(f"Converted character name '{character_id}' to ID: {character.id}")
                        else:
                            # If character not found by name, set to None to avoid errors
                            choice['character_id'] = None
                            db.session.commit()  # Save the updated branch_metadata
                            logger.warning(f"Character name '{character_id}' not found, setting to None")
                            continue
                    
                    # Now try to get character with the corrected ID (ensure it's an integer)
                    if isinstance(choice['character_id'], str) and choice['character_id'].isdigit():
                        choice['character_id'] = int(choice['character_id'])
                        db.session.commit()
                    
                    # Only proceed if we have a valid ID and character not already loaded
                    if not any(char['id'] == choice['character_id'] for char in character_images):
                        character = Character.query.get(choice['character_id'])
                        if character:
                            character_images.append({
                                'id': character.id,
                                'image_url': character.image_url,
                                'name': character.character_name,
                                'traits': character.character_traits
                            })
                except Exception as e:
                    logger.error(f"Error processing character_id: {str(e)}")
                    # Handle the error gracefully, continue with other choices
                    choice['character_id'] = None
                    db.session.commit()
    if not current_node.branch_metadata:
        current_node.branch_metadata = {
            "choices": {},  # Removed legacy dependency on story_data
            "timestamp": datetime.utcnow().isoformat(),
            "character_relationships": {},
            "active_missions": []
        }
        db.session.commit()
    else:
        if "timestamp" not in current_node.branch_metadata:
            current_node.branch_metadata["timestamp"] = datetime.utcnow().isoformat()
        if "character_relationships" not in current_node.branch_metadata:
            current_node.branch_metadata["character_relationships"] = {}
        if "active_missions" not in current_node.branch_metadata:
            current_node.branch_metadata["active_missions"] = []
        if "choices" not in current_node.branch_metadata:
            current_node.branch_metadata["choices"] = {}
        db.session.commit()
    
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
    
    # Update the story object with current node's narrative text
    story.narrative_text = current_node.narrative_text
    
    db.session.commit()
    return render_template('storyboard.html',
                           story=story,  # Pass the full story object
                           story_id=story_id,
                           node=current_node,
                           character_images=character_images,
                           background_image=background_image,
                           user_progress=user_progress,
                           story_progress=story_progress)

@main_bp.route('/generate_story', methods=['POST'])
def generate_story_route():
    logger.info(f"Received {request.method} request at /generate_story")
    data = request.form.to_dict()
    
    # Get the character IDs from the form
    selected_chars_input = request.form.getlist('selected_images')
    
    # Process the character IDs - handle both individual IDs and comma-separated IDs
    character_ids = []
    for id_value in selected_chars_input:
        # Check if this is a comma-separated list of IDs
        if ',' in id_value:
            # Split the comma-separated string and add each ID to our list
            character_ids.extend([int(cid.strip()) for cid in id_value.split(',')])
        else:
            # Single ID - just convert to int and add to list
            character_ids.append(int(id_value))
    
    if character_ids:
        # Query selected characters by ID from processed list
        selected_characters = Character.query.filter(
            Character.id.in_(character_ids)
        ).all()
        
        # Ensure we have at least one character
        if not selected_characters:
            return jsonify({'error': 'Please select at least one character'}), 400
        
        # Check for required roles and add them if missing
        required_roles = ['mission-giver', 'villain']
        existing_roles = [char.character_role.lower() for char in selected_characters if char.character_role]
        for role in required_roles:
            if role not in existing_roles:
                missing_char = Character.query.filter_by(character_role=role).order_by(db.func.random()).first()
                if missing_char:
                    selected_characters.append(missing_char)
        
        # Save both IDs and full details in the form data
        data['selected_characters'] = [char.id for char in selected_characters]
        
        # The first selected character will be the protagonist
        data['protagonist_info'] = {
            "id": selected_characters[0].id,
            "character_name": selected_characters[0].character_name,
            "character_traits": selected_characters[0].character_traits or {},
            "backstory": getattr(selected_characters[0], 'backstory', ""),
            "plot_lines": getattr(selected_characters[0], 'plot_lines', []),
            "character_role": selected_characters[0].character_role,
            "role": selected_characters[0].character_role
        }
        
        # And if additional characters exist:
        if len(selected_characters) > 1:
            data['additional_characters'] = [
                {
                    "id": char.id,
                    "name": char.character_name,
                    "character_traits": char.character_traits or {},
                    "backstory": getattr(char, 'backstory',""),
                    "plot_lines": getattr(char, 'plot_lines', []),
                    "character_role": char.character_role,
                    "role": char.character_role,
                    "role_requirements": ""
                } for char in selected_characters[1:]
            ]
    else:
        # If no characters selected, use random ones
        selected_characters = get_random_characters_with_roles()
        data['selected_characters'] = [char.id for char in selected_characters]
    
    if not selected_characters:
        return jsonify({'error': 'Missing required character roles'}), 500
    
    user_progress = get_or_create_user_progress()
    game_engine = GameEngine(user_id=user_progress.user_id)
    story_data = game_engine.start_new_story(form_data=data)
    
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
        
    logger.debug(f"Extracted values:")
    logger.debug(f"  story_id: {story_id}")
    logger.debug(f"  choice_id: {choice_id}")
    logger.debug(f"  previous_choice: {previous_choice}")
    logger.debug(f"  story_context: {story_context}")
    logger.debug(f"  characters: {json.dumps(characters, default=str)}")
    
    if not story_id or not choice_id:
        raise ValueError("Missing required fields")
    story = StoryGeneration.query.get_or_404(story_id)
    user_progress = get_or_create_user_progress()
    game_engine = GameEngine(user_id=user_progress.user_id)
    
    # Get character details from IDs for complete character data
    if characters:
        character_objects = []
        for char_id in characters:
            char = Character.query.get(char_id)
            if char:
                character_objects.append({
                    "id": char.id,
                    "character_name": char.character_name,
                    "name": char.character_name,
                    "character_role": char.character_role,
                    "role": char.character_role,
                    "character_traits": char.character_traits or {},
                    "backstory": getattr(char, 'backstory', ""),
                    "plot_lines": getattr(char, 'plot_lines', [])
                })
        characters = character_objects
    else:
        # If no characters were provided, use an empty list
        characters = []
    
    logger.debug(f"Prepared character objects: {json.dumps(characters, default=str, indent=2)}")
    
    result = game_engine.make_choice(
        choice_id=choice_id,
        custom_choice_text=previous_choice,
        story_context=story_context,
        characters=characters
    )
    
    logger.debug(f"make_choice result (summary): {json.dumps({...})}")
    'current_node_id': result.get('current_node', {}).get('id'),
    'choice_count': len(result.get('available_choices', [])),
    'mission_updates': len(result.get('mission_updates', [])),
    'character_updates': len(result.get('character_updates', []))
    }, indent=2)}")
    'current_node_id': result.get('current_node', {}).get('id'),
    'choice_count': len(result.get('available_choices', [])),
    'mission_updates': len(result.get('mission_updates', [])),
    'character_updates': len(result.get('character_updates', []))
    }, indent=2)}")
    
    # Add success and story_id fields for backward compatibility with the front-end
    result['success'] = True
    result['story_id'] = story_id
    
    return jsonify(result)

@main_bp.route('/reroll_character', methods=['POST'])
def reroll_character():
    data = request.json
    character_id = data.get('character_id')
    if not character_id:
        return jsonify({'error': 'No character ID provided'}), 400
    new_character = Character.query.filter(Character.id != character_id)\
        .filter(Character.character_name.isnot(None))\
        .order_by(db.func.random()).first()
    if not new_character:
        return jsonify({'error': 'No alternative characters found'}), 404
    role = new_character.character_role or 'neutral'
    if role.lower() not in ['villain', 'neutral', 'mission-giver', 'undetermined']:
        role = 'neutral'
    char_data = {
        'id': new_character.id,
        'image_url': new_character.image_url,
        'name': new_character.character_name,
        'story': new_character.description or '',
        'character_traits': new_character.character_traits or [],
        'plot_lines': new_character.plot_lines or [],
        'character_role': role,
        'role': role
    }
    character_html = render_template('partials/character_card.html')
    character_html = render_template_string(
        "{% from 'partials/character_card.html' import character_card %}{{ character_card(img, index) }}",
        img=char_data,
        index=0
    )
    return jsonify({'success': True, 'character': char_data, 'character_html': character_html})

@main_bp.route('/api/user/progress')
def api_user_progress():
    user_progress = get_or_create_user_progress()
    progress_data = {
       "active_missions": user_progress.active_missions or [],
       "currency": user_progress.currency_balances,
       "notes": user_progress.game_state.get("notes", "No notes yet")
    }
    return jsonify(progress_data)