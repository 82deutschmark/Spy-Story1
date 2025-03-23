"""
main_routes.py - Core Application Routes
====================================

!!! IMPORTANT - READ BEFORE MODIFYING !!!
This module contains the primary route handlers for the story generation
and user interaction flows. Changes here directly affect core gameplay.

Key Features:
------------
- Story generation and continuation
- Character selection and management
- User progress tracking
- Currency transactions
- Plot arc management
- Mission handling

Dependencies:
-----------
- Database Models:
  * AIInstruction: Story generation parameters
  * StoryGeneration: Story content and state
  * StoryNode/Choice: Story flow control
  * UserProgress: User state and progress
  * Character: Character data and traits
  * Transaction: Currency operations
  * PlotArc: Story arc tracking
  * Mission: Mission management

Required Services:
---------------
- story_maker.py: Story generation logic
- validation_utils.py: Input validation
- currency_utils.py: Transaction processing
- db_utils.py: Database operations

Route Structure:
-------------
1. Index Route ('/')
   - Character selection
   - Story options
   - User progress initialization

2. Storyboard Route ('/storyboard/<story_id>')
   - Story display
   - Character integration
   - Progress tracking

3. Story Generation ('/generate_story')
   - Story creation
   - Character integration
   - Currency handling
   - Progress updates

4. Choice Processing ('/make_choice')
   - Choice validation
   - Currency requirements
   - Story continuation
   - Character evolution

Usage Guidelines:
---------------
1. ALWAYS validate user input
2. Maintain proper error handling
3. Update user progress atomically
4. Handle currency transactions safely
5. Preserve story continuity

Integration Points:
----------------
- Story generation system
- Character management
- Currency system
- Progress tracking
- Mission system
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
    mission_giver = Character.query.filter_by(character_role='mission-giver').order_by(db.func.random()).first()
    villain = Character.query.filter_by(character_role='villain').order_by(db.func.random()).first()
    if not mission_giver or not villain:
        return []
    neutral_char = Character.query.filter_by(character_role='neutral').order_by(db.func.random()).first()
    selected_characters = [mission_giver, villain]
    if neutral_char:
        selected_characters.append(neutral_char)
    return selected_characters

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
                if not any(char['id'] == choice['character_id'] for char in character_images):
                    character = Character.query.get(choice['character_id'])
                    if character:
                        character_images.append({
                            'id': character.id,
                            'image_url': character.image_url,
                            'name': character.character_name,
                            'traits': character.character_traits
                        })
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
    template_story_data = {
        "narrative_text": current_node.narrative_text,
        "choices": current_node.branch_metadata.get("choices", [])
    }
    db.session.commit()
    return render_template('storyboard.html',
                           story=template_story_data,
                           story_id=story_id,
                           node=current_node,
                           character_images=character_images,
                           background_image=background_image,
                           user_progress=user_progress,
                           story_progress=story_progress)

@main_bp.route('/generate_story', methods=['POST'])
def generate_story_route():
    data = request.form.to_dict()
    selected_chars_input = request.form.getlist('selected_images')
    if selected_chars_input:
        selected_characters = Character.query.filter(
            Character.id.in_([int(cid) for cid in selected_chars_input])
        ).all()
        required_roles = ['mission-giver', 'villain']
        existing_roles = [char.character_role.lower() for char in selected_characters if char.character_role]
        for role in required_roles:
            if role not in existing_roles:
                missing_char = Character.query.filter_by(character_role=role).order_by(db.func.random()).first()
                if missing_char:
                    selected_characters.append(missing_char)
    else:
        selected_characters = get_random_characters_with_roles()
    if not selected_characters:
        return jsonify({'error': 'Missing required character roles'}), 500
    data['selected_characters'] = [char.id for char in selected_characters]
    user_progress = get_or_create_user_progress()
    game_engine = GameEngine(user_id=user_progress.user_id)
    story_data = game_engine.start_new_story(form_data=data)
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'success': True, 'redirect': url_for('main.storyboard', story_id=story_data['story_id'])})
    else:
        return redirect(url_for('main.storyboard', story_id=story_data['story_id']))

@main_bp.route('/make_choice', methods=['POST'])
def make_choice():
    if request.is_json:
        data = request.get_json()
        story_id = data.get('story_id')
        node_id = data.get('node_id')
        choice_id = data.get('choice_id')
        previous_choice = data.get('previous_choice')
        story_context = data.get('story_context')
        characters = data.get('characters', [])
    else:
        story_id = request.form.get('story_id')
        node_id = request.form.get('node_id')
        choice_id = request.form.get('choice_id')
        previous_choice = request.form.get('previous_choice')
        story_context = request.form.get('story_context')
        characters = request.form.getlist('characters[]')
    if not story_id or not node_id or not choice_id:
        raise ValueError("Missing required fields")
    story = StoryGeneration.query.get_or_404(story_id)
    user_progress = get_or_create_user_progress()
    game_engine = GameEngine(user_id=user_progress.user_id)
    result = game_engine.make_choice(
        choice_id=choice_id,
        custom_choice_text=previous_choice,
        story_context=story_context,
        characters=[{"id": char_id} for char_id in characters]
    )
    new_node = StoryNode.query.get(result['current_node']['id'])
    if not new_node:
        raise ValueError("Failed to create new story node")
    user_progress.current_node_id = new_node.id
    user_progress.last_active = datetime.utcnow()
    if not new_node.branch_metadata:
        new_node.branch_metadata = {}
    new_node.branch_metadata['choices'] = result['available_choices']
    db.session.commit()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return jsonify({'success': True, 'redirect_url': url_for('main.storyboard', story_id=story_id)})
    return redirect(url_for('main.storyboard', story_id=story_id))

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
        'character_role': role
    }
    character_html = render_template('partials/character_card.html')
    character_html = render_template_string(
        "{% from 'partials/character_card.html' import character_card %}{{ character_card(img, index) }}",
        img=char_data,
        index=0
    )
    return jsonify({'success': True, 'character': char_data, 'character_html': character_html})