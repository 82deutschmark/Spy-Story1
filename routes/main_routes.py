import os
import logging
import json
from flask import Blueprint, render_template, request, jsonify, url_for, redirect, flash, session
import uuid

from database import db
from models import (AIInstruction, StoryGeneration, StoryNode, 
                   StoryChoice, UserProgress, Transaction, PlotArc, CharacterEvolution, Mission)
from models.character_data import Character
from models.scene_images import SceneImages
from services.story_maker import generate_story, get_story_options

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
        # Try filtering by dimension first
        scene = SceneImages.query.filter(
            SceneImages.image_type == 'scene',
            SceneImages.image_width > SceneImages.image_height
        ).order_by(db.func.random()).first()

        # Fallback if no scene images with right dimensions exist
        if not scene:
            scene = SceneImages.query.filter(
                SceneImages.image_type == 'scene'
            ).order_by(db.func.random()).first()

        return scene.image_url if scene else None

    except Exception as e:
        logger.error(f"Error getting random scene background: {str(e)}")
        # Return a default or fallback image URL if the above fails
        return "/static/images/default-background.jpg"

@main_bp.route('/')
def index():
    """Main page showing character selection and story options"""
    story_options = get_story_options()
    background_image = get_random_scene_background()
    user_progress = get_or_create_user_progress()

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

    return render_template(
        'index.html',
        story_options=story_options,
        images=character_data,
        background_image=background_image,
        user_progress=user_progress
    )

@main_bp.route('/storyboard/<int:story_id>')
def storyboard(story_id):
    """Display the current story progress and choices"""
    story = StoryGeneration.query.get_or_404(story_id)
    story_data = json.loads(story.generated_story)
    user_progress = get_or_create_user_progress()

    # Update user progress to reflect current story
    user_progress.current_story_id = story_id
    db.session.commit()
    logger.debug(f"Updated user progress with current_story_id: {story_id}")

    # Get random scene for background
    background_image = get_random_scene_background()

    # Get associated character images from the story and referenced characters
    character_images = []

    # Add direct story images first
    for image in story.images:
        analysis = image.analysis_result or {}
        character_images.append({
            'id': image.id,
            'image_url': image.image_url,
            'name': image.character_name or analysis.get('character_name', ''),
            'traits': image.character_traits
        })

    # Get all characters mentioned in the story
    mentioned_characters = []
    if 'characters' in story_data and isinstance(story_data['characters'], list):
        mentioned_characters = story_data['characters']

    # Try to find images for any additional characters mentioned
    for character_name in mentioned_characters:
        # Skip characters we already have
        if any(char['name'].lower() == character_name.lower() for char in character_images):
            continue

        # Look for this character in the database
        character_img = Character.query.filter(
            Character.character_name.ilike(f'%{character_name}%')
        ).first()

        if character_img:
            character_images.append({
                'id': character_img.id,
                'image_url': character_img.image_url,
                'name': character_img.character_name,
                'traits': character_img.character_traits
            })

    # Prepare story progress data for the template with proper field names
    story_progress = {
        'current_story_id': user_progress.current_story_id,
        'completed_plot_arcs': user_progress.completed_plot_arcs or [],
        'choice_history': user_progress.choice_history or [],
        'active_missions': user_progress.active_missions or []
    }

    return render_template(
        'storyboard.html',
        story=story_data,
        story_id=story_id,
        character_images=character_images,
        background_image=background_image,
        user_progress=user_progress,
        story_progress=story_progress
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
            selected_character_ids = request.form.getlist('selected_images[]')
            protagonist_gender = request.form.get('protagonist_gender')
            protagonist_name = request.form.get('protagonist_name')
            custom_choice = data.get('custom_choice', '')

        # Get previous story context
        previous_story_id = data.get('story_id')
        story_context = data.get('story_context', '')

        logger.debug(f"Received data format: {'JSON' if request.is_json else 'Form'}")
        logger.debug(f"Data received: {data}")
        logger.debug(f"Selected character IDs: {selected_character_ids}")

        # Get user progress with protagonist name for identification
        user_progress = get_or_create_user_progress(protagonist_name)

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
            'setting': data.get('setting', 'Enchanted world'),
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
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'error': str(e)}), 500
        else:
            flash('Error generating story: ' + str(e), 'error')
            return redirect(url_for('main.index'))

@main_bp.route('/make_choice', methods=['POST'])
def make_choice():
    """Process a story choice and handle currency requirements"""
    try:
        data = request.json
        choice_id = data.get('choice_id')
        custom_choice = data.get('custom_choice')
        story_id = data.get('story_id')
        node_id = data.get('node_id')
        characters = data.get('characters', [])  # Array of character IDs in the story

        # Get user progress
        user_progress = get_or_create_user_progress()

        if custom_choice:
            # Validate diamond balance for custom choice
            currency_requirements = {'💎': 100}
            if not user_progress.can_afford(currency_requirements):
                return jsonify({
                    'error': 'Insufficient diamonds',
                    'required': 100,
                    'current_balance': user_progress.currency_balances.get('💎', 0)
                }), 400

            # Spend diamonds and record transaction
            success = user_progress.spend_currency(
                currency_requirements,
                'choice',
                f'Custom choice: {custom_choice[:50]}...' if len(custom_choice) > 50 else custom_choice
            )
            if not success:
                return jsonify({'error': 'Failed to process currency transaction'}), 500

@main_bp.route('/reroll_character', methods=['POST'])
def reroll_character():
    """Return a new random character to replace an existing one"""
    try:
        data = request.json
        character_id = data.get('character_id')
        
        if not character_id:
            logger.error("No character ID provided for reroll")
            return jsonify({'error': 'No character ID provided'}), 400
            
        # Get a random character from the characters table
        new_character = Character.query.filter(Character.id != character_id)\
            .filter(Character.character_name.isnot(None))\
            .order_by(db.func.random()).first()
            
        if not new_character:
            logger.error("No alternative characters found for reroll")
            return jsonify({'error': 'No alternative characters found'}), 404
            
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
        character_html = render_template('partials/character_card.html', 
                                         img=char_data, 
                                         index=0)
        
        return jsonify({
            'success': True,
            'character': char_data,
            'character_html': character_html
        })
    except Exception as e:
        logger.error(f"Error rerolling character: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500


            # Record the choice
            if story_id and node_id:
                user_progress.record_choice(
                    choice_text=custom_choice,
                    choice_id='custom',
                    node_id=node_id,
                    story_id=story_id
                )

                # Award experience for making a custom choice
                user_progress.add_experience_points(25, "Made custom story choice")

            # Return success for custom choice
            return jsonify({
                'success': True,
                'new_balances': user_progress.currency_balances,
                'message': 'Custom choice processed successfully'
            })

        else:
            # For standard choices
            choice_text = data.get('choice_text', 'Standard choice')

            # Process currency requirements if any
            currency_requirements = data.get('currency_requirements')
            if currency_requirements and not user_progress.can_afford(currency_requirements):
                return jsonify({
                    'error': 'Insufficient funds',
                    'requirements': currency_requirements,
                    'current_balances': user_progress.currency_balances
                }), 400

            if currency_requirements:
                success = user_progress.spend_currency(
                    currency_requirements,
                    'choice',
                    f'Story choice: {choice_text[:50]}...' if len(choice_text) > 50 else choice_text,
                    node_id
                )
                if not success:
                    return jsonify({'error': 'Failed to process currency transaction'}), 500

            # Record the choice in user progress
            if story_id and node_id:
                user_progress.record_choice(
                    choice_text=choice_text,
                    choice_id=choice_id,
                    node_id=node_id,
                    story_id=story_id
                )

                # Award experience for making a choice
                user_progress.add_experience_points(10, "Made story choice")

            # Track character evolution for each character in the story
            if story_id and characters:
                for char_id in characters:
                    # Get character details
                    character = Character.query.get(char_id)
                    if not character:
                        continue

                    # Update user's character relationship
                    user_progress.encounter_character(
                        character_id=char_id, 
                        character_name=character.character_name
                    )

                    # Check if this character already has an evolution record
                    char_evolution = CharacterEvolution.query.filter_by(
                        user_id=user_progress.user_id,
                        character_id=char_id,
                        story_id=story_id
                    ).first()

                    # Create new evolution record if needed
                    if not char_evolution:
                        # Verify character exists in characters table
                        from models.character_data import Character
                        character_exists = Character.query.get(char_id)
                        if not character_exists:
                            logger.error(f"Failed to create evolution record: Character with ID {char_id} not found in characters table")
                            continue
                            
                        char_evolution = CharacterEvolution(
                            user_id=user_progress.user_id,
                            character_id=char_id,
                            story_id=story_id,
                            role='supporting',  # Default role
                            evolved_traits=character.character_traits or []  # Start with original traits
                        )
                        db.session.add(char_evolution)
                        db.session.commit()

            # Return updated user information
            return jsonify({
                'success': True,
                'new_balances': user_progress.currency_balances,
                'level': user_progress.level,
                'experience': user_progress.experience_points,
                'message': 'Choice processed successfully'
            })

    except Exception as e:
        logger.error(f"Error processing choice: {str(e)}")
        return jsonify({'error': str(e)}), 500