import os
import logging
import json
from flask import Blueprint, render_template, request, jsonify, url_for, redirect, flash, session
import uuid

from database import db
from models import (AIInstruction, ImageAnalysis, StoryGeneration, StoryNode, 
                   StoryChoice, UserProgress, Transaction, PlotArc, CharacterEvolution, Mission)
from services.story_maker import generate_story, get_story_options

# Configure logging
logger = logging.getLogger(__name__)

# Create Blueprint
main_bp = Blueprint('main', __name__)

def get_or_create_user_progress():
    """Get or create user progress record for the current session"""
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        logger.debug(f"Created new user session with ID: {session['user_id']}")

    user_progress = UserProgress.query.filter_by(user_id=session['user_id']).first()
    if not user_progress:
        logger.debug(f"Creating new user progress for ID: {session['user_id']}")
        user_progress = UserProgress(
            user_id=session['user_id'],
            currency_balances={
                "💎": 500,  # Diamonds
                "💷": 5000,  # Pounds
                "💶": 5000,  # Euros
                "💴": 5000,  # Yen
                "💵": 5000,  # Dollars
            }
        )
        db.session.add(user_progress)
        db.session.commit()
        logger.debug(f"Created user progress with initial balances: {user_progress.currency_balances}")
    else:
        logger.debug(f"Found existing user progress for ID: {session['user_id']}")

    return user_progress

@main_bp.before_request
def check_paypal_config():
    """Log PayPal configuration status before each request"""
    paypal_client_id = os.environ.get('PAYPAL_CLIENT_ID')
    logger.debug(f"PayPal Client ID available: {bool(paypal_client_id)}")
    if not paypal_client_id:
        logger.warning("PayPal Client ID is missing from environment variables")

def get_random_scene_background():
    """Get a random scene image suitable for background"""
    try:
        # Try filtering by dimension first
        scene = ImageAnalysis.query.filter(
            ImageAnalysis.image_type == 'scene',
            ImageAnalysis.image_width > ImageAnalysis.image_height
        ).order_by(db.func.random()).first()

        # Fallback if no scene images with right dimensions exist
        if not scene:
            scene = ImageAnalysis.query.filter(
                ImageAnalysis.image_type == 'scene'
            ).order_by(db.func.random()).first()

        return scene.image_url if scene else None

    except Exception as e:
        logger.error(f"Error getting random scene background: {str(e)}")
        # Return None on any error to ensure the application doesn't crash
        return None

@main_bp.route('/')
def index():
    """Main page showing character selection and story options"""
    story_options = get_story_options()
    background_image = get_random_scene_background()
    user_progress = get_or_create_user_progress()

    # Get 2 random images for character selection
    images = ImageAnalysis.query.filter_by(image_type='character').order_by(db.func.random()).limit(2).all()
    image_data = []
    for img in images:
        analysis = img.analysis_result or {}
        char_name = img.character_name or ''
        if not char_name and analysis:
            if 'character' in analysis and 'name' in analysis['character']:
                char_name = analysis['character'].get('name', '')
            elif 'character_name' in analysis:
                char_name = analysis.get('character_name', '')
            elif 'name' in analysis:
                char_name = analysis.get('name', '')

        char_traits = []
        plot_lines = []
        try:
            if hasattr(img, 'character_traits') and img.character_traits:
                char_traits = img.character_traits
            elif analysis and 'character_traits' in analysis:
                char_traits = analysis.get('character_traits', [])

            if hasattr(img, 'plot_lines') and img.plot_lines:
                plot_lines = img.plot_lines
            elif analysis and 'plot_lines' in analysis:
                plot_lines = analysis.get('plot_lines', [])
        except:
            pass

        image_data.append({
            'id': img.id,
            'image_url': img.image_url,
            'name': char_name,
            'style': analysis.get('style', ''),
            'story': analysis.get('story', ''),
            'character_traits': char_traits,
            'plot_lines': plot_lines
        })

    return render_template(
        'index.html',
        story_options=story_options,
        images=image_data,
        background_image=background_image,
        user_progress=user_progress,
        paypal_client_id=os.environ.get('PAYPAL_CLIENT_ID')
    )

@main_bp.route('/storyboard/<int:story_id>')
def storyboard(story_id):
    """Display the current story progress and choices"""
    story = StoryGeneration.query.get_or_404(story_id)
    story_data = json.loads(story.generated_story)
    user_progress = get_or_create_user_progress()

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
        character_img = ImageAnalysis.query.filter(
            ImageAnalysis.image_type == 'character',
            ImageAnalysis.character_name.ilike(f'%{character_name}%')
        ).first()

        if character_img:
            character_images.append({
                'id': character_img.id,
                'image_url': character_img.image_url,
                'name': character_img.character_name,
                'traits': character_img.character_traits
            })

    return render_template(
        'storyboard.html',
        story=story_data,
        story_id=story_id,
        character_images=character_images,
        background_image=background_image,
        user_progress=user_progress,
        paypal_client_id=os.environ.get('PAYPAL_CLIENT_ID')
    )

@main_bp.route('/generate_story', methods=['POST'])
def generate_story_route():
    """Generate a new story or continue an existing one"""
    try:
        # Get form data
        data = request.form
        selected_image_ids = request.form.getlist('selected_images[]')
        protagonist_gender = request.form.get('protagonist_gender')
        protagonist_name = request.form.get('protagonist_name')
        custom_choice = data.get('custom_choice', '')

        # Get previous story context
        previous_story_id = data.get('story_id')
        story_context = data.get('story_context', '')

        # Get user progress
        user_progress = get_or_create_user_progress()

        # Check if this is a custom choice and verify diamond balance
        if custom_choice:
            currency_requirements = {'💎': 100}
            if not user_progress.can_afford(currency_requirements):
                return jsonify({
                    'error': 'Custom choices require 100 💎. You only have ' +
                             f'{user_progress.currency_balances.get("💎",0)} 💎.'
                }), 400

            success = user_progress.spend_currency(
                currency_requirements,
                'choice',
                f'Custom choice: {custom_choice[:50]}...' if len(custom_choice) > 50 else custom_choice
            )
            if not success:
                return jsonify({'error': 'Failed to process currency transaction'}), 500

        logger.debug(f"Form data received: {data}")
        logger.debug(f"Selected image IDs: {selected_image_ids}")

        if not selected_image_ids:
            logger.error("No character selected - missing selected_images[] in form data")
            return jsonify({'error': 'Please select a character for your story'}), 400

        if len(selected_image_ids) < 1:
            logger.error(f"No characters selected, got {len(selected_image_ids)}")
            return jsonify({'error': 'Please select at least one character for your story'}), 400

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
        selected_images = ImageAnalysis.query.filter(ImageAnalysis.id.in_(selected_image_ids)).all()
        if not selected_images:
            return jsonify({'error': 'Selected images not found'}), 404

        # Get information for all selected characters - DIRECTLY from the database
        # This avoids any unnecessary API calls for image analysis
        selected_characters = []
        for img in selected_images:
            # Use only the data already in the database
            char_data = {
                'name': img.character_name or 'Unknown Character',
                'role': img.character_role or 'protagonist',
                'character_traits': img.character_traits or [],
                'style': 'A mysterious character',  # Default description if none exists
                'plot_lines': img.plot_lines or []
            }

            # Only if we already have analysis_result stored, get additional info from it
            if img.analysis_result:
                try:
                    analysis = img.analysis_result
                    if 'style' in analysis:
                        char_data['style'] = analysis.get('style', char_data['style'])
                except Exception as e:
                    logger.error(f"Error parsing stored analysis result: {str(e)}")

            selected_characters.append(char_data)

        # Use the first character as the main character for backward compatibility
        main_character_img = selected_images[0]
        character_info = selected_characters[0]

        # Get additional characters from database (excluding the selected characters)
        additional_characters = []
        selected_ids = [img.id for img in selected_images]
        additional_chars_query = ImageAnalysis.query.filter_by(image_type='character') \
            .filter(~ImageAnalysis.id.in_(selected_ids)) \
            .filter(ImageAnalysis.character_name.isnot(None)) \
            .order_by(db.func.random()) \
            .limit(3) \
            .all()  # Only get characters with names

        for char in additional_chars_query:
            # Use only data already in the database, no analysis needed
            char_data = {
                'name': char.character_name or 'Unknown Character',
                'character_traits': char.character_traits or [],
                'role': char.character_role or 'neutral',
                'plot_lines': char.plot_lines or []
            }
            additional_characters.append(char_data)

        # Add the selected characters (except the main one) to story_params
        if len(selected_characters) > 1:
            # Remove the main character from the list
            secondary_characters = selected_characters[1:]
            # Add them to additional characters
            additional_characters = secondary_characters + additional_characters

        # Generate the story
        story_params['character_info'] = character_info
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
        for image in selected_images:
            story.images.append(image)

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
            primary_characters=selected_ids
        )
        db.session.add(plot_arc)

        # Add this plot arc to user's active arcs
        if not user_progress.active_plot_arcs:
            user_progress.active_plot_arcs = []
        user_progress.active_plot_arcs.append(plot_arc.id)

        # Process character evolutions for all characters
        for img in selected_images:
            # Register this character encounter with the user
            user_progress.encounter_character(
                character_id=img.id,
                character_name=img.character_name or "Unknown Character",
                initial_relationship=5 if img.id == main_character_img.id else 0
            )

            # Create character evolution entry
            char_evolution = CharacterEvolution(
                user_id=user_progress.user_id,
                character_id=img.id,
                story_id=story.id,
                role='protagonist' if img.id == main_character_img.id else 'supporting',
                evolved_traits=img.character_traits or []
            )
            db.session.add(char_evolution)

        # Extract mission information from the story result
        if 'mission' in result:
            mission_data = result.get('mission', {})
            if mission_data and isinstance(mission_data, dict):
                # Create a new mission
                mission = Mission(
                    title=mission_data.get('title', 'Mysterious Mission'),
                    description=mission_data.get('description', 'Details unknown'),
                    user_id=user_progress.user_id,
                    story_id=story.id,
                    giver_name=mission_data.get('giver', 'Unknown'),
                    target_name=mission_data.get('target', 'Unknown'),
                    objective=mission_data.get('objective', 'Unspecified objective'),
                    reward_currency=mission_data.get('reward_currency', '💵'),
                    reward_amount=mission_data.get('reward_amount', 1000),
                    deadline_description=mission_data.get('deadline', 'Soon'),
                    difficulty=mission_data.get('difficulty', 'Medium')
                )
                db.session.add(mission)
                db.session.flush()  # Get the ID without committing

                # Add this mission to user's active missions
                if not user_progress.active_missions:
                    user_progress.active_missions = []
                user_progress.active_missions.append(mission.id)

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
        logger.error(f"Error generating story: {str(e)}")
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
                    character = ImageAnalysis.query.get(char_id)
                    if not character:
                        continue

                    # Update user's character relationship
                    user_progress.encounter_character(
                        character_id=char_id, 
                        character_name=character.character_name or "Unknown Character"
                    )

                    # Check if this character already has an evolution record
                    char_evolution = CharacterEvolution.query.filter_by(
                        user_id=user_progress.user_id,
                        character_id=char_id,
                        story_id=story_id
                    ).first()

                    # Create new evolution record if needed
                    if not char_evolution:
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

@main_bp.route('/user-progress/current')
def get_current_user_progress():
    """Get the current user's progress data for AJAX updates"""
    try:
        user_progress = get_or_create_user_progress()

        # Return user progress data in JSON format
        return jsonify({
            'success': True,
            'progress': {
                'level': user_progress.level,
                'experience_points': user_progress.experience_points,
                'active_missions': user_progress.active_missions,
                'completed_missions': user_progress.completed_missions,
                'active_plot_arcs': user_progress.active_plot_arcs,
                'completed_plot_arcs': user_progress.completed_plot_arcs,
                'encountered_characters': user_progress.encountered_characters
            }
        })
    except Exception as e:
        logger.error(f"Error getting user progress: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500