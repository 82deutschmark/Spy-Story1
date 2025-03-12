import os
import logging
import json
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, url_for, redirect, flash, session
from werkzeug.middleware.proxy_fix import ProxyFix
from middleware.request_logger import RequestLoggerMiddleware
from flask_cors import CORS

from database import db, init_db
from models import AIInstruction, ImageAnalysis, StoryGeneration, StoryNode, StoryChoice, UserProgress
from routes import register_blueprints
from utils.error_handlers import register_error_handlers
from admin_config import init_admin
from utils.input_validation import validate_input
from utils.currency import process_currency_transaction
from api.unity_routes import unity_api

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create and configure the Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

# Import these after db is initialized to avoid circular imports
from services.openai_service import analyze_artwork, generate_image_description
from services.story_maker import generate_story, get_story_options

# CORS configuration
CORS(app, resources={
    r"/api/unity/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

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

# Main routes
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
        user_progress=user_progress
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
        user_progress=user_progress
    )

@app.route('/generate_story', methods=['POST'])
def generate_story_route():
    """Generate a new story or continue an existing one"""
    try:
        # Get form data
        data = request.form
        selected_image_ids = request.form.getlist('selected_images[]')
        protagonist_gender = request.form.get('protagonist_gender')
        protagonist_name = validate_input(request.form.get('protagonist_name'), max_length=50)
        custom_choice = validate_input(data.get('custom_choice', ''), max_length=200)

        # Check if this is a custom choice and verify diamond balance
        if custom_choice:
            user_progress = get_or_create_user_progress()
            currency_requirements = {'💎': 100}
            if not user_progress.can_afford(currency_requirements):
                return jsonify({
                    'error': 'Custom choices require 100 💎. You only have ' +
                             f'{user_progress.currency_balances.get("💎",0)} 💎.'
                }), 400

            success = process_currency_transaction(user_progress, currency_requirements, 'choice',
                                                   f'Custom choice: {custom_choice[:50]}...' if len(custom_choice) > 50 else custom_choice)
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
            'conflict': validate_input(data.get('conflict', 'Mysterious adventure'), max_length=100),
            'setting': validate_input(data.get('setting', 'Enchanted world'), max_length=100),
            'narrative_style': validate_input(data.get('narrative_style', 'Engaging modern style'), max_length=100),
            'mood': validate_input(data.get('mood', 'Exciting and adventurous'), max_length=100),
            'custom_conflict': validate_input(data.get('custom_conflict', ''), max_length=200),
            'custom_setting': validate_input(data.get('custom_setting', ''), max_length=200),
            'custom_narrative': validate_input(data.get('custom_narrative', ''), max_length=200),
            'custom_mood': validate_input(data.get('custom_mood', ''), max_length=200),
            'story_context': validate_input(data.get('story_context', ''), max_length=200)
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
                'name': validate_input(img.character_name or analysis.get('name', 'Unknown Character'), max_length=50),
                'role': validate_input(img.character_role or 'protagonist', max_length=50),
                'character_traits': img.character_traits or [],
                'style': validate_input(analysis.get('style', 'A mysterious character'), max_length=100),
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
                'name': validate_input(char.character_name, max_length=50),
                'character_traits': char.character_traits,
                'role': validate_input(char.character_role, max_length=50),
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

@app.route('/make_choice', methods=['POST'])
def make_choice():
    """Process a story choice and handle currency requirements"""
    try:
        data = request.json
        choice_id = data.get('choice_id')
        custom_choice = data.get('custom_choice')

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
            success = process_currency_transaction(user_progress, currency_requirements, 'choice',
                                                   f'Custom choice: {custom_choice[:50]}...' if len(custom_choice) > 50 else custom_choice)
            if not success:
                return jsonify({'error': 'Failed to process currency transaction'}), 500

        else:
            # Get the choice and validate currency requirements
            choice = StoryChoice.query.get_or_404(choice_id)
            if not choice.currency_requirements:
                return jsonify({'error': 'Invalid choice: missing currency requirements'}), 400

            # Check if user can afford the choice
            if not user_progress.can_afford(choice.currency_requirements):
                return jsonify({
                    'error': 'Insufficient funds',
                    'requirements': choice.currency_requirements,
                    'current_balances': user_progress.currency_balances
                }), 400

            # Spend currency and record transaction
            success = process_currency_transaction(user_progress, choice.currency_requirements, 'choice',
                                                   f'Story choice: {choice.choice_text[:50]}...' if len(choice.choice_text) > 50 else choice.choice_text,
                                                   choice.node_id)
            if not success:
                return jsonify({'error': 'Failed to process currency transaction'}), 500

        # Generate next part of the story
        story_params = {
            'custom_choice': custom_choice if custom_choice else None,
            'previous_choice': choice.choice_text if not custom_choice else custom_choice,
            # Add other necessary story parameters here
        }

        # Return success response with updated balances
        return jsonify({
            'success': True,
            'new_balances': user_progress.currency_balances,
            'message': 'Choice processed successfully'
        })

    except Exception as e:
        logger.error(f"Error processing choice: {str(e)}")
        return jsonify({'error': str(e)}), 500

# API Routes
@app.route('/api/save_analysis', methods=['POST'])
def save_analysis():
    """Save edited analysis from debug page"""
    try:
        data = request.json
        image_id = data.get('image_id')
        analysis = data.get('analysis')

        if not image_id or not analysis:
            return jsonify({'error': 'Missing image_id or analysis'}), 400

        image = ImageAnalysis.query.get_or_404(image_id)
        image.analysis_result = analysis
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Analysis updated successfully'
        })
    except Exception as e:
        logger.error(f"Error saving analysis: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/validate_image_types')
def validate_image_types():
    """API endpoint to validate image type storage and check for inconsistencies"""
    try:
        # Get all images
        images = ImageAnalysis.query.all()

        results = {
            'character_images': 0,
            'scene_images': 0,
            'character_missing_traits': 0,
            'scene_missing_details': 0,
            'inconsistent_fields': 0,
            'samples': []
        }

        for img in images:
            # Check image type
            if img.image_type == 'character':
                results['character_images'] += 1

                # Check if character data is missing
                if not img.character_traits or not img.character_role or not img.plot_lines:
                    results['character_missing_traits'] += 1

                # Add sample data
                if len(results['samples']) < 3 and img.image_type == 'character':
                    sample = {
                        'id': img.id,
                        'image_url': img.image_url,
                        'image_type': img.image_type,
                        'character_traits': img.character_traits,
                        'character_role': img.character_role,
                        'plot_lines': img.plot_lines
                    }
                    results['samples'].append(sample)

            elif img.image_type == 'scene':
                results['scene_images'] += 1

                # Check if scene data is missing
                if not img.scene_type or not img.setting or not img.dramatic_moments:
                    results['scene_missing_details'] += 1

                # Add sample data
                if len(results['samples']) < 6 and img.image_type == 'scene' and len(results['samples']) >= 3:
                    sample = {
                        'id': img.id,
                        'image_url': img.image_url,
                        'image_type': img.image_type,
                        'scene_type': img.scene_type,
                        'setting': img.setting,
                        'dramatic_moments': img.dramatic_moments
                    }
                    results['samples'].append(sample)

            # Check for inconsistencies in analysis_result vs. specific fields
            if img.analysis_result:
                inconsistency = False
                if img.image_type == 'character':
                    if img.character_traits != img.analysis_result.get('character_traits'):
                        inconsistency = True
                elif img.image_type == 'scene':
                    if img.scene_type != img.analysis_result.get('scene_type'):
                        inconsistency = True

                if inconsistency:
                    results['inconsistent_fields'] += 1

        return jsonify(results)
    except Exception as e:
        logger.error(f"Error validating image types: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/generate', methods=['POST'])
def generate_post():
    """Generate analysis for an image URL"""
    image_url = request.form.get('image_url')

    if not image_url:
        return jsonify({'error': 'No image URL provided'}), 400

    try:
        # Validate URL format
        if not image_url.startswith(('http://', 'https://')):
            return jsonify({'error': 'Invalid image URL format'}), 400

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

@app.route('/save_analysis_original', methods=['POST'])
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

        # Check for explicit type field (new format)
        if 'type' in analysis and analysis['type'] == 'CHARACTER':
            is_character = True
            logger.debug("Detected character from 'type' field")
        # Check for nested character object (old format)
        elif 'character' in analysis and isinstance(analysis['character'], dict):
            is_character = True
            logger.debug("Detected character from nested 'character' object")
        # Or check for character-specific fields at the top level
        elif any(key in analysis for key in ['character_name', 'character_traits', 'plot_lines', 'personality_traits', 'potential_plot_lines']):
            is_character = True
            logger.debug("Detected character from character-specific fields")
        # Or check for character-specific role field
        elif 'role' in analysis and analysis['role'].lower() in ['hero', 'villain', 'neutral', 'protagonist', 'antagonist']:
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
            # Check for personality_traits (new format) first
            if 'personality_traits' in analysis:
                character_traits = analysis.get('personality_traits')
            # Then check old format options
            elif 'character' in analysis and 'character_traits' in character_data:
                character_traits = character_data.get('character_traits')
            else:
                character_traits = analysis.get('character_traits')

        character_role = None
        if is_character:
            if 'character' in analysis and 'role' in character_data:
                character_role = character_data.get('role')
            else:
                character_role = analysis.get('role')

        plot_lines = None
        if is_character:
            # Check for potential_plot_lines (new format) first
            if 'potential_plot_lines' in analysis:
                plot_lines = analysis.get('potential_plot_lines')
            # Then check old format options
            elif 'character' in analysis and 'plot_lines' in character_data:
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

@app.route('/api/random_character')
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

@app.route('/api/image/<int:image_id>')
def get_image_details(image_id):
    """API endpoint to get details of a specific image"""
    try:
        image = ImageAnalysis.query.get_or_404(image_id)

        return jsonify({
            'success': True,
            'id': image.id,
            'image_url': image.image_url,
            'image_type': image.image_type,
            'analysis': image.analysis_result,
            'created_at': image.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        logger.error(f"Error getting image details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/image/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    """API endpoint to delete a specific image record"""
    try:
        image = ImageAnalysis.query.get_or_404(image_id)

        # Remove associations with stories
        for story in image.stories:
            story.images.remove(image)

        db.session.delete(image)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Image record {image_id} deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting image: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/story/<int:story_id>', methods=['DELETE'])
def delete_story(story_id):
    """API endpoint to delete a specific story record"""
    try:
        story = StoryGeneration.query.get_or_404(story_id)
        db.session.delete(story)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Story record {story_id} deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting story: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/db/delete-all-images', methods=['POST'])
def delete_all_images():
    """API endpoint to delete all image records"""
    try:
        # First remove associations with stories
        for image in ImageAnalysis.query.all():
            for story in image.stories:
                story.images.remove(image)

        # Then delete all images
        num_deleted = db.session.query(ImageAnalysis).delete()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Deleted {num_deleted} image records'
        })
    except Exception as e:
        logger.error(f"Error deleting all images: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/db/delete-all-stories', methods=['POST'])
def delete_all_stories():
    """API endpoint to delete all story records"""
    try:
        num_deleted = db.session.query(StoryGeneration).delete()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Deleted {num_deleted} story records'
        })
    except Exception as e:
        logger.error(f"Error deleting all stories: {str(e)}