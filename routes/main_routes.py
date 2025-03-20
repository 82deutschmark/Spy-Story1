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
import logging
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

# Configure logging
logger = logging.getLogger(__name__)

# Create Blueprint
main_bp = Blueprint('main', __name__)

# Required character roles for story generation
REQUIRED_ROLES = ['mission-giver', 'villain']

def get_or_create_user_progress(protagonist_name=None):
    """Get or create user progress record for the current session. Uses protagonist_name for identification."""
    from utils.db_utils import get_or_create_user_progress as db_get_or_create_user_progress

    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        logger.debug(f"Created new user session with ID: {session['user_id']}")

    # Use the enhanced db_utils version that handles protagonist name lookup
    user_progress = db_get_or_create_user_progress(session['user_id'], protagonist_name)

    return user_progress

# PayPal check removed

def get_random_scene_background():
    """Get a random scene image suitable for background"""
    try:
        scene = SceneImages.query.filter_by(
            image_type='scene'
        ).order_by(db.func.random()).first()
        
        return scene.image_url if scene else None
    except Exception as e:
        logger.error(f"Error getting random scene background: {str(e)}")
        return None

def get_random_characters_with_roles() -> List[Character]:
    """Get random characters ensuring required roles are present."""
    try:
        # Get one random character for each required role
        mission_giver = Character.query.filter_by(character_role='mission-giver').order_by(db.func.random()).first()
        villain = Character.query.filter_by(character_role='villain').order_by(db.func.random()).first()
        
        if not mission_giver or not villain:
            logger.error("Missing required character roles in database")
            return []
            
        # Get a random neutral character if available
        neutral_char = Character.query.filter_by(character_role='neutral').order_by(db.func.random()).first()
        
        # Combine characters
        selected_characters = [mission_giver, villain]
        if neutral_char:
            selected_characters.append(neutral_char)
            
        return selected_characters
        
    except Exception as e:
        logger.error(f"Error getting random characters: {str(e)}")
        return []

@main_bp.route('/')
def index():
    """Main page showing character selection and story options"""
    try:
        story_options = get_story_options()
        background_image = get_random_scene_background()

        # Get random characters with required roles
        characters = get_random_characters_with_roles()
        if not characters:
            logger.error("Failed to get characters with required roles")
            return render_template(
                'error.html',
                error_message="Unable to load characters. Please try again later."
            )

        character_data = []
        for char in characters:
            # Ensure we're using standardized role values
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

        # Initialize user progress only if needed (e.g., form submission)
        user_progress = None
        if request.args.get('init_progress'):
            user_progress = get_or_create_user_progress()

        return render_template(
            'index.html',
            story_options=story_options,
            images=character_data,
            background_image=background_image,
            user_progress=user_progress
        )
    except Exception as e:
        logger.error(f"Error in index route: {str(e)}", exc_info=True)
        return render_template(
            'error.html',
            error_message="An error occurred while loading the page. Please try again."
        )

@main_bp.route('/storyboard/<int:story_id>')
def storyboard(story_id):
    """Display the current story progress and choices"""
    try:
        # Get story and initialize game state
        story = StoryGeneration.query.get_or_404(story_id)
        story_data = json.loads(story.generated_story)
        user_progress = get_or_create_user_progress()
        game_state = GameState(user_progress.user_id)

        # Update user progress to reflect current story
        user_progress.current_story_id = story_id
        
        # Get random scene for background
        background_image = get_random_scene_background()

        # Get associated character images from the story's characters
        character_images = []

        try:
            # Add characters from the story's character relationship
            for character in story.characters:
                try:
                    character_images.append({
                        'id': character.id,
                        'image_url': character.image_url,
                        'name': character.character_name,
                        'traits': character.character_traits
                    })
                except Exception as e:
                    logger.error(f"Error processing character {character.id}: {str(e)}")
                    continue
        except Exception as e:
            logger.error(f"Error accessing story characters: {str(e)}")
            # Continue without story characters

        # Get all characters mentioned in the story
        mentioned_characters = []
        if 'characters' in story_data and isinstance(story_data['characters'], list):
            mentioned_characters = story_data['characters']

        # Add any missing characters from the mentioned list
        for char_name in mentioned_characters:
            if not any(char['name'] == char_name for char in character_images):
                # Try to find the character in the database
                character = Character.query.filter_by(character_name=char_name).first()
                if character:
                    character_images.append({
                        'id': character.id,
                        'image_url': character.image_url,
                        'name': character.character_name,
                        'traits': character.character_traits
                    })

        # Resolve current node using priority-based resolution
        current_node = game_state.resolve_current_node(story_id)
        if not current_node:
            logger.error(f"Could not resolve node for story {story_id}")
            flash("Could not find a valid story node.", "error")
            return redirect(url_for('main.index'))
            
        # Transition to resolved node if different from current
        if current_node.id != (game_state.current_node.id if game_state.current_node else None):
            if not game_state.transition_to_node(current_node.id):
                logger.error(f"Failed to transition to node {current_node.id}")
                flash("Failed to load story state.", "error")
                return redirect(url_for('main.index'))

        # Get node context for additional state information
        node_context = game_state.get_node_context(current_node.id)
        
        # Update character relationships from node context
        for char_id, char_info in node_context["character_relationships"].items():
            for i, char in enumerate(character_images):
                if str(char['id']) == char_id:
                    character_images[i].update({
                        'relationship_level': char_info['relationship_level']
                    })

        # Prepare story progress data for the template
        story_progress = {
            'current_story_id': user_progress.current_story_id,
            'current_node_id': current_node.id,
            'completed_plot_arcs': user_progress.completed_plot_arcs or [],
            'choice_history': user_progress.choice_history or [],
            'active_missions': node_context["active_missions"]
        }

        # Commit the transaction after all database operations are successful
        db.session.commit()

        return render_template(
            'storyboard.html',
            story=story_data,
            story_id=story_id,
            node=current_node,
            character_images=character_images,
            background_image=background_image,
            user_progress=user_progress,
            story_progress=story_progress
        )

    except Exception as e:
        # Rollback the transaction on any error
        db.session.rollback()
        logger.error(f"Error in storyboard route: {str(e)}", exc_info=True)
        return render_template(
            'error.html',
            error_message="An error occurred while loading the story. Please try again."
        )

@main_bp.route('/generate_story', methods=['POST'])
def generate_story_route():
    """Generate a new story or continue an existing one"""
    try:
        # Get form data
        data = request.form.to_dict()
        
        # Get random characters with required roles
        selected_characters = get_random_characters_with_roles()
        if not selected_characters:
            return jsonify({
                'error': 'Unable to generate story: Missing required character roles'
            }), 500
            
        # Add selected characters to form data
        data['selected_characters'] = [char.id for char in selected_characters]
        
        # Get user progress
        user_progress = get_or_create_user_progress()
        
        # Initialize game engine
        game_engine = GameEngine(user_id=user_progress.user_id)
        
        try:
            # Start new story using game engine
            story_data = game_engine.start_new_story(form_data=data)
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return jsonify({
                    'success': True,
                    'redirect': url_for('main.storyboard', story_id=story_data['story_id'])
                })
            else:
                return redirect(url_for('main.storyboard', story_id=story_data['story_id']))
                
        except Exception as e:
            # Ensure transaction is rolled back
            db.session.rollback()
            raise
            
    except Exception as e:
        logger.error(f"Error generating story: {str(e)}", exc_info=True)
        # Ensure any open transaction is rolled back
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main_bp.route('/make_choice', methods=['POST'])
def make_choice():
    """Process a story choice and generate continuation"""
    try:
        # Handle both JSON and form data
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
        
        # Log the received data for debugging
        logger.debug(f"Received choice data: story_id={story_id}, node_id={node_id}, choice_id={choice_id}")
        
        # Validate required fields individually
        if not story_id:
            raise ValueError("Missing story_id")
        if not node_id:
            raise ValueError("Missing node_id")
        if not choice_id:
            raise ValueError("Missing choice_id")
            
        # Get story generation
        story = StoryGeneration.query.get_or_404(story_id)
        
        # Get user progress
        user_progress = get_or_create_user_progress()
        
        # Initialize game engine
        game_engine = GameEngine(user_id=user_progress.user_id)
        
        # Process the choice and generate continuation
        result = game_engine.make_choice(
            choice_id=choice_id,
            custom_choice_text=previous_choice,
            story_context=story_context,
            characters=[{"id": char_id} for char_id in characters]
        )
        
        # Save changes
        db.session.commit()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': True,
                'redirect_url': url_for('main.storyboard', story_id=story_id)
            })
        
        return redirect(url_for('main.storyboard', story_id=story_id))
        
    except ValueError as e:
        logger.error(f"Validation error in make_choice: {str(e)}")
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        flash(str(e), 'error')
        return redirect(url_for('main.storyboard', story_id=story_id))
    except Exception as e:
        logger.error(f"Error processing choice: {str(e)}", exc_info=True)
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'success': False,
                'error': 'An error occurred while processing your choice'
            }), 500
        flash('An error occurred while processing your choice', 'error')
        return redirect(url_for('main.storyboard', story_id=story_id))

@main_bp.route('/reroll_character', methods=['POST'])
def reroll_character():
    """Return a new random character to replace an existing one"""
    try:
        logger.info("Received reroll character request")
        data = request.json
        character_id = data.get('character_id')
        logger.info(f"Reroll request for character_id: {character_id}")

        if not character_id:
            logger.error("No character ID provided for reroll")
            return jsonify({'error': 'No character ID provided'}), 400

        # Get a random character from the characters table
        logger.info("Querying for random character")
        new_character = Character.query.filter(Character.id != character_id)\
            .filter(Character.character_name.isnot(None))\
            .order_by(db.func.random()).first()

        if not new_character:
            logger.error("No alternative characters found for reroll")
            return jsonify({'error': 'No alternative characters found'}), 404

        logger.info(f"Found new character: {new_character.id} - {new_character.character_name}")

        # Prepare character data
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

        # Generate HTML for the new character
        character_html = render_template('partials/character_card.html')
        character_html = render_template_string(
            "{% from 'partials/character_card.html' import character_card %}"
            "{{ character_card(img, index) }}",
            img=char_data,
            index=0
        )

        logger.info("Successfully prepared character data and HTML")
        return jsonify({
            'success': True,
            'character': char_data,
            'character_html': character_html
        })
    except Exception as e:
        logger.error(f"Error rerolling character: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500