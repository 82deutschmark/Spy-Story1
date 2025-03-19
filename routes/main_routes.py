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

from database import db
from models import (AIInstruction, StoryGeneration, StoryNode, 
                   StoryChoice, UserProgress, Transaction, PlotArc, CharacterEvolution, Mission)
from models.character_data import Character
from models.scene_images import SceneImages
from services.story_maker import generate_story, get_story_options
from services.game_engine import GameEngine
from services.mission_generator import update_mission_progress
from utils.validation_utils import validate_story_parameters, validate_string_length
from utils.currency_utils import process_transaction
from utils.db_utils import get_or_create_user_progress as db_get_or_create_user_progress

# Configure logging
logger = logging.getLogger(__name__)

# Create Blueprint
main_bp = Blueprint('main', __name__)

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

@main_bp.route('/')
def index():
    """Main page showing character selection and story options"""
    try:
        story_options = get_story_options()
        background_image = get_random_scene_background()

        # Get 2 random characters for selection
        characters = Character.query.order_by(db.func.random()).limit(2).all()
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
        story = StoryGeneration.query.get_or_404(story_id)
        story_data = json.loads(story.generated_story)
        user_progress = get_or_create_user_progress()

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

        # Get the current node ID if this is a continuation
        node_id = None
        if hasattr(story, 'node_id'):
            node_id = story.node_id

        # Prepare story progress data for the template
        story_progress = {
            'current_story_id': user_progress.current_story_id,
            'completed_plot_arcs': user_progress.completed_plot_arcs or [],
            'choice_history': user_progress.choice_history or [],
            'active_missions': user_progress.active_missions or []
        }

        # Commit the transaction after all database operations are successful
        db.session.commit()

        return render_template(
            'storyboard.html',
                             story=story_data,
                             story_id=story_id,
                             character_images=character_images,
                             background_image=background_image,
                             user_progress=user_progress,
                             story_progress=story_progress,
                             node_id=node_id)

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
    from utils.validation_utils import validate_story_parameters, validate_string_length
    from utils.currency_utils import process_transaction

    try:
        # Get data from either JSON or form data
        if request.is_json:
            data = request.get_json()
            # Handle array data from JSON properly
            selected_character_ids = data.get('selected_images', [])
            if isinstance(selected_character_ids, str):
                selected_character_ids = [selected_character_ids]
            protagonist_gender = data.get('protagonist_gender')
            protagonist_name = data.get('protagonist_name')
            custom_choice = data.get('custom_choice', '')
        else:
            data = request.form
            # Handle both array and single value for selected_images
            selected_character_ids = data.getlist('selected_images[]') or [data.get('selected_images')] if data.get('selected_images') else []
            protagonist_gender = request.form.get('protagonist_gender')
            protagonist_name = request.form.get('protagonist_name')
            custom_choice = data.get('custom_choice', '')

        # Get previous story context
        previous_story_id = data.get('story_id')
        story_context = data.get('story_context', '')
        is_continuation = data.get('is_continuation') == 'true'
        choice_id = data.get('choice_id')
        node_id = data.get('node_id')

        logger.debug(f"Received data format: {'JSON' if request.is_json else 'Form'}")
        logger.debug(f"Data received: {data}")
        logger.debug(f"Selected character IDs: {selected_character_ids}")
        logger.debug(f"Is continuation: {is_continuation}")
        logger.debug(f"Choice ID: {choice_id}")
        logger.debug(f"Node ID: {node_id}")

        # Get user progress with protagonist name for identification
        user_progress = get_or_create_user_progress(protagonist_name)

        # If this is a continuation, process the choice first
        if is_continuation and choice_id and node_id:
            try:
                # Get the previous story node
                previous_node = StoryNode.query.get(node_id)
                if not previous_node:
                    raise ValueError(f"Previous story node {node_id} not found")

                # Process the choice through the game engine
                game_engine = GameEngine(user_id=user_progress.user_id)
                story_data = game_engine.make_choice(
                    choice_id=choice_id,
                    custom_choice_text=custom_choice
                )
                
                # Create a new story node with the continuation
                story = StoryGeneration(
                    primary_conflict=data.get('conflict', 'Unknown conflict'),
                    setting=data.get('setting', 'Unknown setting'),
                    narrative_style=data.get('narrative_style', 'Engaging modern style'),
                    mood=data.get('mood', 'Exciting and adventurous'),
                    generated_story=json.dumps(story_data)
                )
                
                # Create a new story node for this continuation
                new_node = StoryNode(
                    narrative_text=story_data.get('story', ''),
                    parent_node_id=node_id,  # Link to previous node
                    generated_by_ai=True,
                    branch_metadata={
                        'story_id': story.id,
                        'choice_id': choice_id,
                        'choice_text': custom_choice or data.get('previous_choice', ''),
                        'parent_story_id': story.id,
                        'timestamp': datetime.utcnow().isoformat()
                    }
                )
                db.session.add(new_node)
                
                # Associate characters with the new story
                selected_characters = Character.query.filter(Character.id.in_(selected_character_ids)).all()
                for character in selected_characters:
                    story.characters.append(character)
                    new_node.character_id = character.id  # Set primary character for this node
                
                db.session.add(story)
                db.session.commit()
                
                # Update user progress
                user_progress.current_story_id = story.id
                db.session.commit()
                
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({
                        'success': True,
                        'redirect': url_for('main.storyboard', story_id=story.id)
                    })
                else:
                    return redirect(url_for('main.storyboard', story_id=story.id))
                    
            except Exception as e:
                logger.error(f"Error processing story continuation: {str(e)}", exc_info=True)
                return jsonify({'error': str(e)}), 500

        # For new stories, continue with the existing logic
        # Validate input parameters
        is_valid, errors = validate_story_parameters(data)
        if not is_valid:
            return jsonify({'error': 'Invalid story parameters', 'details': errors}), 400

        # Validate character selection
        if not selected_character_ids:
            logger.error("No character selected - missing selected_images in form data")
            return jsonify({'error': 'Please select a character for your story'}), 400

        if len(selected_character_ids) < 1:
            logger.error(f"No characters selected, got {len(selected_character_ids)}")
            return jsonify({'error': 'Please select at least one character for your story'}), 400

        # Check if this is a custom choice and process currency requirement
        if custom_choice:
            # Validate custom choice text length
            is_valid, error = validate_string_length(
                custom_choice, 
                min_length=10, 
                max_length=500,
                field_name="Custom choice"
            )
            if not is_valid:
                return jsonify({'error': error}), 400

            # Process currency transaction
            currency_requirements = {'💎': 100}
            description = f'Custom choice: {custom_choice[:50]}...' if len(custom_choice) > 50 else custom_choice
            success, error_message, _ = process_transaction(
                user_progress=user_progress,
                transaction_type='choice',
                description=description,
                currency_requirements=currency_requirements
            )

            if not success:
                return jsonify({'error': error_message}), 400

        logger.debug(f"Form data received: {data}")
        logger.debug(f"Selected image IDs: {selected_character_ids}")

        # Get the story parameters
        story_params = {
            'conflict': data.get('conflict', 'Mysterious adventure'),
            'setting': data.get('setting', 'Unknown location'),
            'narrative_style': data.get('narrative_style', 'Engaging modern style'),
            'mood': data.get('mood', 'Exciting and adventurous'),
            'custom_conflict': data.get('custom_conflict', ''),
            'custom_setting': data.get('custom_setting', ''),
            'custom_narrative': data.get('custom_narrative', ''),
            'custom_mood': data.get('custom_mood', ''),
            'story_context': story_context
        }

        # Handle choice selection - either predefined or custom
        if custom_choice:
            story_params['previous_choice'] = f"Custom choice: {custom_choice}"
        else:
            story_params['previous_choice'] = data.get('previous_choice', '')

        logger.debug(f"Story parameters: {story_params}")

        # Get character information from selected images
        selected_characters = Character.query.filter(Character.id.in_(selected_character_ids)).all()
        if not selected_characters:
            return jsonify({'error': 'Selected characters not found'}), 404

        # Get information for all selected characters - DIRECTLY from the database
        # This avoids any unnecessary API calls for image analysis
        character_info = []
        for char in selected_characters:
            # Ensure we're using standardized role values
            role = char.character_role or 'neutral'
            if role.lower() not in ['villain', 'neutral', 'mission-giver', 'undetermined']:
                role = 'neutral'

            char_data = {
                'name': char.character_name,
                'role': role,
                'character_traits': char.character_traits or [],
                'style': 'A mysterious character',  # Default description if none exists
                'plot_lines': char.plot_lines or []
            }
            character_info.append(char_data)

        # Use the first character as the main character for backward compatibility
        main_character = selected_characters[0]
        main_character_info = character_info[0]

        # Get additional characters from database (excluding the selected characters)
        additional_characters = []
        selected_ids = [img.id for img in selected_characters]
        additional_chars_query = Character.query.filter(~Character.id.in_(selected_ids)) \
            .filter(Character.character_name.isnot(None)) \
            .order_by(db.func.random()) \
            .limit(3) \
            .all()  # Only get characters with names

        for char in additional_chars_query:
            # Ensure we're using standardized role values 
            role = char.character_role or 'neutral'
            if role.lower() not in ['villain', 'neutral', 'mission-giver', 'undetermined']:
                role = 'neutral'

            char_data = {
                'name': char.character_name or 'Unknown Character',
                'character_traits': char.character_traits or [],
                'role': role,
                'plot_lines': char.plot_lines or []
            }
            additional_characters.append(char_data)

        # Add the selected characters (except the main one) to story_params
        if len(character_info) > 1:
            # Remove the main character from the list
            secondary_characters = character_info[1:]
            # Add them to additional characters
            additional_characters = secondary_characters + additional_characters

        # Generate the story
        story_params['character_info'] = main_character_info
        story_params['additional_characters'] = additional_characters
        story_params['protagonist_name'] = protagonist_name
        story_params['protagonist_gender'] = protagonist_gender
        result = generate_story(**story_params)

        # Store the generated story
        story = StoryGeneration(
            primary_conflict=result['conflict'],
            setting=result['setting'],
            narrative_style=result['narrative_style'],
            mood=result['mood'],
            generated_story=result['story']
        )

        # Associate selected images with the story
        for character in selected_characters:
            # Link character to story if character ID is provided
            if character and character.id:
                # Use the characters relationship instead of images
                story.characters.append(character)

        db.session.add(story)
        db.session.commit()

        # Update user progress with this new story
        user_progress.current_story_id = story.id

        # Create a default plot arc for this story
        plot_arc = PlotArc(
            title=f"{'Custom adventure' if custom_choice else result['conflict']}",
            description=f"A story set in {result['setting']} with {result['mood']} mood",
            arc_type="main",
            story_id=story.id,
            status="active",
            primary_characters=[char.id for char in selected_characters]
        )
        db.session.add(plot_arc)

        # Add this plot arc to user's active arcs
        if not user_progress.active_plot_arcs:
            user_progress.active_plot_arcs = []
        user_progress.active_plot_arcs.append(plot_arc.id)

        # Process character evolutions for all characters
        for char in selected_characters:
            # Register this character encounter with the user
            user_progress.encounter_character(
                character_id=char.id,
                character_name=char.character_name,
                initial_relationship=5 if char.id == main_character.id else 0
            )

            # Create character evolution entry
            char_evolution = CharacterEvolution(
                user_id=user_progress.user_id,
                character_id=char.id,
                story_id=story.id,
                role='protagonist' if char.id == main_character.id else 'supporting',
                evolved_traits=char.character_traits or []
            )
            db.session.add(char_evolution)

        # If this is a continuation of previous story
        if previous_story_id and story_context:
            # Check if there are any plot arcs from previous story to carry over
            prev_arcs = PlotArc.query.filter_by(
                story_id=previous_story_id,
                status='active'
            ).all()

            # Carry over active plot arcs
            for arc in prev_arcs:
                arc.story_id = story.id  # Connect to new story
                if arc.id in user_progress.active_plot_arcs:
                    # This arc was already in user's active arcs
                    pass
                else:
                    # Add to user's active arcs
                    if not user_progress.active_plot_arcs:
                        user_progress.active_plot_arcs = []
                    user_progress.active_plot_arcs.append(arc.id)

        # Award experience for generating a story
        if not previous_story_id:
            # New story creation
            user_progress.add_experience_points(50, "Created a new story")
        else:
            # Story continuation
            user_progress.add_experience_points(20, "Continued an existing story")

        db.session.commit()

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            # If AJAX request, return JSON
            return jsonify({
                'success': True,
                'redirect': url_for('main.storyboard', story_id=story.id)
            })
        else:
            # If regular form submit, redirect to storyboard
            return redirect(url_for('main.storyboard', story_id=story.id))

    except Exception as e:
        logger.error(f"Error generating story: {str(e)}", exc_info=True)
        # Always return JSON response for errors
        error_message = str(e)
        if "Failed to generate story:" in error_message:
            error_message = error_message.split("Failed to generate story:", 1)[1].strip()
        return jsonify({'error': error_message}), 500

@main_bp.route('/make_choice', methods=['POST'])
def make_choice():
    """Process a story choice and generate continuation"""
    try:
        # Get data from either form or JSON
        if request.is_json:
            data = request.get_json()
            current_state = data.get('current_state', {})
            characters = data.get('characters', [])
        else:
            data = request.form
            current_state = {
                'story_id': data.get('story_id'),
                'node_id': data.get('node_id'),
                'story_context': data.get('story_context'),
                'characters': data.getlist('characters[]')
            }
            characters = data.getlist('characters[]')

        choice_id = data.get('choice_id')
        custom_choice = data.get('custom_choice')
        story_id = current_state.get('story_id')
        node_id = current_state.get('node_id')

        # Validate required data
        if not story_id or not node_id:
            raise ValueError("Missing required story or node information")

        # Validate choice_id if not a custom choice
        if not custom_choice:
            try:
                choice_id = int(choice_id)
                if not choice_id:
                    raise ValueError("Invalid choice ID")
            except (ValueError, TypeError):
                logger.error(f"Invalid choice_id provided: {choice_id}")
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({'error': 'Invalid choice ID'}), 400
                flash('Invalid choice', 'error')
                return redirect(url_for('main.storyboard', story_id=story_id))

        # Get user progress
        user_progress = get_or_create_user_progress()

        # Handle currency requirements
        if custom_choice:
            currency_requirements = {'💎': 100}
            if not user_progress.can_afford(currency_requirements):
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({'error': 'Insufficient diamonds for custom choice'}), 400
                flash('Insufficient diamonds for custom choice', 'error')
                return redirect(url_for('main.storyboard', story_id=story_id))

            success = user_progress.spend_currency(
                currency_requirements,
                'choice',
                f'Custom choice: {custom_choice[:50]}...' if len(custom_choice) > 50 else custom_choice
            )
            if not success:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({'error': 'Failed to process currency transaction'}), 400
                flash('Failed to process currency transaction', 'error')
                return redirect(url_for('main.storyboard', story_id=story_id))
        else:
            choice = StoryChoice.query.get(choice_id)
            if not choice:
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({'error': 'Invalid choice'}), 400
                flash('Invalid choice', 'error')
                return redirect(url_for('main.storyboard', story_id=story_id))

            if choice.currency_requirements and not user_progress.can_afford(choice.currency_requirements):
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return jsonify({'error': 'Insufficient funds for this choice'}), 400
                flash('Insufficient funds for this choice', 'error')
                return redirect(url_for('main.storyboard', story_id=story_id))

            if choice.currency_requirements:
                success = user_progress.spend_currency(
                    choice.currency_requirements,
                    'choice',
                    f'Story choice: {choice.choice_text[:50]}...' if len(choice.choice_text) > 50 else choice.choice_text
                )
                if not success:
                    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                        return jsonify({'error': 'Failed to process currency transaction'}), 400
                    flash('Failed to process currency transaction', 'error')
                    return redirect(url_for('main.storyboard', story_id=story_id))

        # Record the choice
        user_progress.record_choice(
            choice_text=custom_choice if custom_choice else choice.choice_text,
            choice_id=choice_id,
            node_id=node_id,
            story_id=story_id
        )

        # Award experience
        user_progress.add_experience_points(25 if custom_choice else 10, "Made story choice")

        # Get the current story node for context
        current_node = StoryNode.query.get(node_id)
        if not current_node:
            raise ValueError(f"Story node {node_id} not found")

        # Process choice through game engine with enhanced context
        game_engine = GameEngine(user_id=user_progress.user_id)
        story_data = game_engine.make_choice(
            choice_id=choice_id,
            custom_choice_text=custom_choice,
            story_context=current_state.get('storyContext'),
            characters=characters
        )

        # Create new story node with the continuation
        story = StoryGeneration(
            primary_conflict=data.get('conflict', 'Unknown conflict'),
            setting=data.get('setting', 'Unknown setting'),
            narrative_style=data.get('narrative_style', 'Engaging modern style'),
            mood=data.get('mood', 'Exciting and adventurous'),
            generated_story=json.dumps(story_data)
        )
        db.session.add(story)

        # Create new story node with enhanced metadata
        new_node = StoryNode(
            narrative_text=story_data.get('story', ''),
            parent_node_id=node_id,
            generated_by_ai=True,
            branch_metadata={
                'story_id': story.id,
                'choice_id': choice_id,
                'choice_text': custom_choice or data.get('previous_choice', ''),
                'parent_story_id': story.id,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        db.session.add(new_node)
        db.session.commit()

        # Track character evolution
        if characters:
            for char_id in characters:
                character = Character.query.get(char_id)
                if not character:
                    continue

                user_progress.encounter_character(
                    character_id=char_id,
                    character_name=character.character_name
                )

                char_evolution = CharacterEvolution.query.filter_by(
                    user_id=user_progress.user_id,
                    character_id=char_id,
                    story_id=story_id
                ).first()

                if not char_evolution:
                    char_evolution = CharacterEvolution(
                        user_id=user_progress.user_id,
                        character_id=char_id,
                        story_id=story_id,
                        role='supporting',
                        evolved_traits=character.character_traits or []
                    )
                    db.session.add(char_evolution)
            db.session.commit()

        # Prepare response data
        response_data = {
            'success': True,
            'story_id': new_node.id,
            'story_data': story_data,
            'game_state': story_data.get('game_state', {}) if hasattr(story_data, 'game_state') else None
        }

        # If this is an AJAX request, return JSON
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify(response_data)
        
        # Otherwise, do a regular redirect
        return redirect(url_for('main.storyboard', story_id=new_node.id))

    except Exception as e:
        logger.error(f"Error processing choice: {str(e)}")
        error_message = str(e)
        
        # If this is an AJAX request, return JSON error
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({
                'error': error_message,
                'redirect': url_for('main.index')  # Redirect to index if story_id is missing
            }), 500
            
        # Otherwise, redirect with flash message
        flash('An error occurred while processing your choice', 'error')
        return redirect(url_for('main.index'))  # Redirect to index if story_id is missing

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