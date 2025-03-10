import os
import logging
import json
from flask import Blueprint, render_template, request, jsonify, url_for, redirect, flash, session
import uuid
import paypalrestsdk
from decimal import Decimal

from database import db
from models import AIInstruction, ImageAnalysis, StoryGeneration, StoryNode, StoryChoice, UserProgress, Transaction, PlotArc, CharacterEvolution, Mission
from services.openai_service import analyze_artwork, generate_image_description
from services.story_maker import generate_story, get_story_options
from services.mission_generator import generate_mission, get_user_active_missions, get_mission_by_id, update_mission_progress, complete_mission, fail_mission

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

@main_bp.route('/debug')
def debug():
    """Debug page with image analysis tool and database view"""
    recent_images = ImageAnalysis.query.order_by(ImageAnalysis.created_at.desc()).limit(10).all()
    recent_stories = StoryGeneration.query.order_by(StoryGeneration.created_at.desc()).limit(10).all()

    # Database statistics
    image_count = ImageAnalysis.query.count()
    character_count = ImageAnalysis.query.filter_by(image_type='character').count()
    scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
    story_count = StoryGeneration.query.count()
    orphaned_images = ImageAnalysis.query.filter(~ImageAnalysis.stories.any()).count()
    empty_stories = StoryGeneration.query.filter(StoryGeneration.generated_story.is_(None)).count()

    return render_template(
        'debug.html',
        recent_images=recent_images,
        recent_stories=recent_stories,
        image_count=image_count,
        character_count=character_count,
        scene_count=scene_count,
        story_count=story_count,
        orphaned_images=orphaned_images,
        empty_stories=empty_stories
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
        analysis = image.analysis_result
        character_images.append({
            'id': image.id,
            'image_url': image.image_url,
            'name': image.character_name or analysis.get('name', ''),
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

        # Get information for all selected characters
        selected_characters = []
        for img in selected_images:
            analysis = img.analysis_result or {}
            char_data = {
                'name': img.character_name or analysis.get('name', 'Unknown Character'),
                'role': img.character_role or 'protagonist',
                'character_traits': img.character_traits or [],
                'style': analysis.get('style', 'A mysterious character'),
                'plot_lines': img.plot_lines or []
            }
            selected_characters.append(char_data)

        # Use the first character as the main character for backward compatibility
        main_character_img = selected_images[0]
        character_info = selected_characters[0]

        # Get additional characters from database (excluding the selected characters)
        additional_characters = []
        selected_ids = [img.id for img in selected_images]
        additional_chars_query = ImageAnalysis.query.filter_by(image_type='character') \
            .filter(~ImageAnalysis.id.in_(selected_ids)) \
            .order_by(db.func.random()) \
            .limit(3) \
            .all()

        for char in additional_chars_query:
            char_data = {
                'name': char.character_name,
                'character_traits': char.character_traits,
                'role': char.character_role,
                'plot_lines': char.plot_lines
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

@main_bp.route('/generate', methods=['POST'])
def generate_post():
    """Handle image analysis requests from debug page"""
    image_url = request.form.get('image_url')

    if not image_url:
        return jsonify({'error': 'No image URL provided'}), 400

    try:
        # Validate URL format
        if not image_url.startswith(('http://', 'https://')):
            return jsonify({'error': 'Invalid image URL format. URL must start with http:// or https://'}), 400

        # Check for OpenAI API key
        if not os.environ.get("OPENAI_API_KEY"):
            return jsonify({'error': 'OpenAI API key not configured. Please add it to your Replit Secrets.'}), 500

        # Analyze the artwork using OpenAI
        analysis = analyze_artwork(image_url)

        # Generate a description of the analyzed image
        description = generate_image_description(analysis)

        return jsonify({
            'success': True,
            'description': description,
            'analysis': analysis,
            'saved_to_db': False,
            'image_url': image_url
        })

    except Exception as e:
        logger.error(f"Error generating post: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/save_analysis', methods=['POST'])
def save_analysis_original():
    """Save the analyzed image data to the database after user confirmation"""
    data = request.json

    if not data or not data.get('analysis') or not data.get('image_url'):
        return jsonify({'error': 'Missing required data'}), 400

    try:
        image_url = data.get('image_url')
        analysis = data.get('analysis')

        # Extract image metadata
        metadata = analysis.get('image_metadata', {})

        # Determine if it's a character or scene based on character indicators
        is_character = False

        # Check for nested character object
        if 'character' in analysis and isinstance(analysis['character'], dict):
            is_character = True
            logger.debug("Detected character from nested 'character' object")
        # Or check for character-specific fields at the top level
        elif any(key in analysis for key in ['character_name', 'character_traits', 'plot_lines']):
            is_character = True
            logger.debug("Detected character from top-level character fields")
        # Or check for character-specific role field
        elif 'role' in analysis and analysis['role'] in ['hero', 'villain', 'neutral']:
            is_character = True
            logger.debug("Detected character from role field")

        logger.info(f"Image classified as: {'character' if is_character else 'scene'}")

        # Extract character details if this is a character image
        character_data = analysis.get('character', {})

        # Get character name - check all possible locations in a consistent manner
        character_name = None
        if is_character:
            # Try to find name in all possible locations
            if 'character' in analysis and isinstance(analysis['character'], dict):
                if 'name' in analysis['character']:
                    character_name = analysis['character'].get('name')

            # If not found in character object, check top level fields
            if not character_name:
                if 'character_name' in analysis:
                    character_name = analysis.get('character_name')
                elif 'name' in analysis:
                    character_name = analysis.get('name')

            # Log character name extraction for debugging
            logger.debug(f"Extracted character name: {character_name} from analysis structure")

            # Ensure we always have a name for characters
            if not character_name:
                logger.warning(f"Could not find a name in the API response. Using default name.")
                character_name = "Unnamed Character"

        # Extract traits and plot lines either from character object or top level
        character_traits = None
        if is_character:
            if 'character' in analysis and 'character_traits' in character_data:
                character_traits = character_data.get('character_traits')
            else:
                character_traits = analysis.get('character_traits')

        character_role = None
        if is_character:
            if 'character' in analysis and 'role' in character_data:
                character_role = character_data.get('role')
            else:
                character_role = analysis.get('role')
                
            # Standardize character role to one of the valid options
            valid_roles = ['undetermined', 'villain', 'neutral', 'mission-giver']
            
            if character_role is None or character_role == '':
                character_role = 'undetermined'
            elif character_role.lower() == 'antagonist' or character_role.lower() == 'villain':
                character_role = 'villain'
            elif character_role.lower() == 'protagonist' or character_role.lower() == 'hero':
                character_role = 'neutral'
            elif character_role.lower() == 'mission giver':
                character_role = 'mission-giver'
            elif character_role.lower() not in valid_roles:
                character_role = 'undetermined'
            else:
                character_role = character_role.lower()
                
            logger.debug(f"Standardized character role: {character_role}")

        plot_lines = None
        if is_character:
            if 'character' in analysis and 'plot_lines' in character_data:
                plot_lines = character_data.get('plot_lines')
            else:
                plot_lines = analysis.get('plot_lines')

        # Create new ImageAnalysis record
        image_analysis = ImageAnalysis(
            image_url=image_url,
            image_width=metadata.get('width'),
            image_height=metadata.get('height'),
            image_format=metadata.get('format'),
            image_size_bytes=metadata.get('size_bytes'),
            image_type='character' if is_character else 'scene',
            analysis_result=analysis,
            character_name=character_name,  # Get name with our new logic
            character_traits=character_traits,
            character_role=character_role,
            plot_lines=plot_lines,
            scene_type=analysis.get('scene_type') if not is_character else None,
            setting=analysis.get('setting') if not is_character else None,
            setting_description=analysis.get('setting_description') if not is_character else None,
            story_fit=analysis.get('story_fit') if not is_character else None,
            dramatic_moments=analysis.get('dramatic_moments') if not is_character else None
        )

        db.session.add(image_analysis)
        db.session.commit()
        logger.info(f"Saved image analysis: {image_analysis.id}")

        return jsonify({
            'success': True,
            'message': 'Analysis saved to database',
            'image_id': image_analysis.id
        })

    except Exception as e:
        logger.error(f"Error saving analysis: {str(e)}")
        # Rollback and close the session to release any locks
        try:
            db.session.rollback()
        except:
            pass

        # Make sure we return a valid JSON response
        return jsonify({
            'success': False,
            'error': f"Database error: {str(e)}"
        }), 500

@main_bp.route('/api/save_analysis', methods=['POST'])
def save_analysis():
    """Save edited analysis from debug page"""
    try:
        data = request.json
        image_id = data.get('image_id')
        analysis = data.get('analysis')

        if not image_id or not analysis:
            return jsonify({'error': 'Missing image_id or analysis'}), 400

        image = ImageAnalysis.query.get_or_404(image_id)
        
        # Update analysis_result field
        image.analysis_result = analysis
        
        # If this is a character image, update character fields from analysis
        if image.image_type == 'character':
            # Update character name if present
            if 'name' in analysis:
                image.character_name = analysis.get('name')
            elif 'character_name' in analysis:
                image.character_name = analysis.get('character_name')
                
            # Update character role with validation
            if 'role' in analysis:
                role = analysis.get('role')
                # Standardize role
                valid_roles = ['undetermined', 'villain', 'neutral', 'mission-giver']
                if role is None or role == '':
                    image.character_role = 'undetermined'
                elif role.lower() == 'antagonist' or role.lower() == 'villain':
                    image.character_role = 'villain'
                elif role.lower() == 'protagonist' or role.lower() == 'hero':
                    image.character_role = 'neutral'
                elif role.lower() == 'mission giver':
                    image.character_role = 'mission-giver'
                elif role.lower() not in valid_roles:
                    image.character_role = 'undetermined'
                else:
                    image.character_role = role.lower()
            
            # Update traits and plot lines
            if 'personality_traits' in analysis:
                image.character_traits = analysis.get('personality_traits')
            elif 'character_traits' in analysis:
                image.character_traits = analysis.get('character_traits')
                
            if 'potential_plot_lines' in analysis:
                image.plot_lines = analysis.get('potential_plot_lines')
            elif 'plot_lines' in analysis:
                image.plot_lines = analysis.get('plot_lines')
                
        db.session.commit()
        logger.info(f"Successfully saved analysis for image ID {image_id}")

        return jsonify({
            'success': True,
            'message': 'Analysis updated successfully'
        })
    except Exception as e:
        logger.error(f"Error saving analysis: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/images/all')
def get_all_images():
    """API endpoint to get all images with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        image_type = request.args.get('type')
        search = request.args.get('search')

        query = ImageAnalysis.query

        # Apply filters
        if image_type:
            query = query.filter_by(image_type=image_type)

        if search:
            # Search by ID or character name
            if search.isdigit():
                query = query.filter(ImageAnalysis.id == int(search))
            else:
                query = query.filter(ImageAnalysis.character_name.ilike(f'%{search}%'))

        # Execute count query
        total = query.count()

        # Get paginated results
        images = query.order_by(ImageAnalysis.id.desc()).paginate(page=page, per_page=per_page)

        # Format results
        results = []
        for img in images.items:
            analysis = img.analysis_result or {}
            name = img.character_name or ''
            if not name and analysis:
                name= analysis.get('name', '')

            results.append({
                'id': img.id,
                'image_url': img.image_url,
                'image_type': img.image_type,
                'name': name,
                'created_at': img.created_at.strftime('%Y-%m-%d %H:%M'),
                'traits': img.character_traits or [],
                'role': img.character_role or '',
                'stories_count': img.stories.count()
            })

        return jsonify({
            'success': True,
            'images': results,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        })
    except Exception as e:
        logger.error(f"Error getting all images: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/stories/all')
def get_all_stories():
    """API endpoint to get all stories with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search')

        query = StoryGeneration.query

        # Apply search filter
        if search:
            if search.isdigit():
                query = query.filter(StoryGeneration.id == int(search))
            else:
                query = query.filter(
                    db.or_(
                        StoryGeneration.primary_conflict.ilike(f'%{search}%'),
                        StoryGeneration.setting.ilike(f'%{search}%')
                    )
                )

        # Execute count query
        total = query.count()

        # Get paginated results
        stories = query.order_by(StoryGeneration.id.desc()).paginate(page=page, per_page=per_page)

        # Format results
        results = []
        for story in stories.items:
            # Extract title from JSON if available
            title = "Untitled Story"
            if story.generated_story:
                try:
                    story_data = json.loads(story.generated_story)
                    if isinstance(story_data, dict) and 'title' in story_data:
                        title = story_data['title']
                except:
                    pass

            results.append({
                'id': story.id,
                'title': title,
                'conflict': story.primary_conflict,
                'setting': story.setting,
                'images_count': len(story.images),
                'character_names': [img.character_name for img in story.images if img.character_name],
                'created_at': story.created_at.strftime('%Y-%m-%d %H:%M')
            })

        return jsonify({
            'success': True,
            'stories': results,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        })
    except Exception as e:
        logger.error(f"Error getting all stories: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/random_character')
def random_character():
    """API endpoint to get a random character from the database"""
    try:
        random_image = ImageAnalysis.query.filter_by(image_type='character').order_by(db.func.random()).first()

        if not random_image:
            return jsonify({'error': 'No character images found in database'}), 404

        analysis = random_image.analysis_result
        return jsonify({
            'success': True,
            'id': random_image.id,
            'image_url': random_image.image_url,
            'name': analysis.get('name', ''),
            'style': analysis.get('style', ''),
            'character_traits': random_image.character_traits or []
        })
    except Exception as e:
        logger.error(f"Error getting random character: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/missions/active')
def get_active_missions():
    """API endpoint to get all active missions for the current user"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()
        
        # Get active missions
        if not user_progress.active_missions:
            return jsonify({
                'success': True,
                'missions': []
            })
            
        missions = Mission.query.filter(Mission.id.in_(user_progress.active_missions)).all()
        
        # Format mission data
        mission_data = []
        for mission in missions:
            # Get giver and target names
            giver_name = "Unknown"
            target_name = "Unknown"
            
            if mission.giver:
                giver_name = mission.giver.character_name
                
            if mission.target:
                target_name = mission.target.character_name
            
            mission_data.append({
                'id': mission.id,
                'title': mission.title,
                'description': mission.description,
                'objective': mission.objective,
                'giver': giver_name,
                'target': target_name,
                'difficulty': mission.difficulty,
                'reward_currency': mission.reward_currency,
                'reward_amount': mission.reward_amount,
                'deadline': mission.deadline,
                'progress': mission.progress,
                'status': mission.status,
                'created_at': mission.created_at.strftime('%Y-%m-%d %H:%M')
            })
        
        return jsonify({
            'success': True,
            'missions': mission_data
        })
    except Exception as e:
        logger.error(f"Error getting active missions: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/missions/<int:mission_id>')
def get_mission_details(mission_id):
    """API endpoint to get details of a specific mission"""
    try:
        mission = get_mission_by_id(mission_id)
        if not mission:
            return jsonify({'error': 'Mission not found'}), 404
            
        # Get user progress to verify the mission belongs to the user
        user_progress = get_or_create_user_progress()
        
        if mission.user_id != user_progress.user_id:
            return jsonify({'error': 'Unauthorized access to mission'}), 403
            
        # Get giver and target details
        giver_data = None
        target_data = None
        
        if mission.giver:
            giver_data = {
                'id': mission.giver.id,
                'name': mission.giver.character_name,
                'image_url': mission.giver.image_url
            }
            
        if mission.target:
            target_data = {
                'id': mission.target.id,
                'name': mission.target.character_name,
                'image_url': mission.target.image_url
            }
            
        # Format mission data
        mission_data = {
            'id': mission.id,
            'title': mission.title,
            'description': mission.description,
            'objective': mission.objective,
            'giver': giver_data,
            'target': target_data,
            'difficulty': mission.difficulty,
            'reward_currency': mission.reward_currency,
            'reward_amount': mission.reward_amount,
            'deadline': mission.deadline,
            'progress': mission.progress,
            'status': mission.status,
            'created_at': mission.created_at.strftime('%Y-%m-%d %H:%M'),
            'completed_at': mission.completed_at.strftime('%Y-%m-%d %H:%M') if mission.completed_at else None,
            'progress_updates': mission.progress_updates
        }
        
        return jsonify({
            'success': True,
            'mission': mission_data
        })
    except Exception as e:
        logger.error(f"Error getting mission details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/missions/generate', methods=['POST'])
def generate_new_mission():
    """API endpoint to generate a new mission for the user"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()
        
        # Get story ID if provided
        story_id = request.json.get('story_id')
        
        # Generate the mission
        mission = generate_mission(user_progress.user_id, story_id)
        
        if not mission:
            return jsonify({'error': 'Failed to generate mission'}), 500
            
        # Get giver and target names
        giver_name = "Unknown"
        target_name = "Unknown"
        
        if mission.giver:
            giver_name = mission.giver.character_name
            
        if mission.target:
            target_name = mission.target.character_name
        
        # Format mission data
        mission_data = {
            'id': mission.id,
            'title': mission.title,
            'description': mission.description,
            'objective': mission.objective,
            'giver': giver_name,
            'target': target_name,
            'difficulty': mission.difficulty,
            'reward_currency': mission.reward_currency,
            'reward_amount': mission.reward_amount,
            'deadline': mission.deadline,
            'progress': mission.progress,
            'status': mission.status,
            'created_at': mission.created_at.strftime('%Y-%m-%d %H:%M')
        }
        
        return jsonify({
            'success': True,
            'mission': mission_data
        })
    except Exception as e:
        logger.error(f"Error generating new mission: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/missions/<int:mission_id>/update', methods=['POST'])
def update_mission(mission_id):
    """API endpoint to update mission progress"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()
        
        # Get mission
        mission = get_mission_by_id(mission_id)
        if not mission:
            return jsonify({'error': 'Mission not found'}), 404
            
        # Verify the mission belongs to the user
        if mission.user_id != user_progress.user_id:
            return jsonify({'error': 'Unauthorized access to mission'}), 403
            
        # Get progress and description
        data = request.json
        progress = data.get('progress')
        description = data.get('description')
        
        if progress is None:
            return jsonify({'error': 'Progress is required'}), 400
            
        # Update the mission
        success = update_mission_progress(mission_id, progress, description)
        
        if not success:
            return jsonify({'error': 'Failed to update mission progress'}), 500
            
        return jsonify({
            'success': True,
            'message': 'Mission progress updated successfully',
            'new_progress': progress
        })
    except Exception as e:
        logger.error(f"Error updating mission progress: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/missions/<int:mission_id>/complete', methods=['POST'])
def complete_mission_route(mission_id):
    """API endpoint to complete a mission"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()
        
        # Complete the mission
        success = complete_mission(mission_id, user_progress.user_id)
        
        if not success:
            return jsonify({'error': 'Failed to complete mission'}), 500
            
        return jsonify({
            'success': True,
            'message': 'Mission completed successfully',
            'new_balances': user_progress.currency_balances
        })
    except Exception as e:
        logger.error(f"Error completing mission: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/api/missions/<int:mission_id>/fail', methods=['POST'])
def fail_mission_route(mission_id):
    """API endpoint to mark a mission as failed"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()
        
        # Get reason if provided
        reason = request.json.get('reason')
        
        # Fail the mission
        success = fail_mission(mission_id, user_progress.user_id, reason)
        
        if not success:
            return jsonify({'error': 'Failed to mark mission as failed'}), 500
            
        return jsonify({
            'success': True,
            'message': 'Mission marked as failed'
        })
    except Exception as e:
        logger.error(f"Error failing mission: {str(e)}")
        return jsonify({'error': str(e)}), 500

# Add more routes as needed