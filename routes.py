
import os
import logging
import json
from flask import render_template, request, jsonify, url_for, redirect, flash, session
import uuid
import paypalrestsdk
from decimal import Decimal

from database import db
from models import AIInstruction, ImageAnalysis, StoryGeneration, StoryNode, StoryChoice, UserProgress, Transaction
from services.openai_service import analyze_artwork, generate_image_description
from services.story_maker import generate_story, get_story_options
from main import app

# Configure logging
logger = logging.getLogger(__name__)

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

@app.before_request
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

@app.route('/')
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


@app.route('/debug')
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

@app.route('/storyboard/<int:story_id>')
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
        character_images=character_images,
        background_image=background_image,
        user_progress=user_progress,
        paypal_client_id=os.environ.get('PAYPAL_CLIENT_ID')
    )

@app.route('/generate_story', methods=['POST'])
def generate_story_route():
    """Generate a new story or continue an existing one"""
    try:
        # Get form data
        data = request.form
        selected_image_ids = request.form.getlist('selected_images[]')
        protagonist_gender = request.form.get('protagonist_gender')
        protagonist_name = request.form.get('protagonist_name')
        custom_choice = data.get('custom_choice', '')

        # Check if this is a custom choice and verify diamond balance
        if custom_choice:
            user_progress = get_or_create_user_progress()
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
            'story_context': data.get('story_context', '')
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

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            # If AJAX request, return JSON
            return jsonify({
                'success': True,
                'redirect': url_for('storyboard', story_id=story.id)
            })
        else:
            # If regular form submit, redirect to storyboard
            return redirect(url_for('storyboard', story_id=story.id))

    except Exception as e:
        logger.error(f"Error generating story: {str(e)}")
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'error': str(e)}), 500
        else:
            flash('Error generating story: ' + str(e), 'error')
            return redirect(url_for('index'))

# Add the rest of your routes from app.py here...
# (This would include all the other routes from app.py)

# Import other routes or add more route definitions as needed
