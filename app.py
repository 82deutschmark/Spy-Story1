import os
import logging
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for
from dotenv import load_dotenv
from services.openai_service import analyze_artwork, generate_image_description
from services.story_maker import generate_story, get_story_options
from database import db
from models import AIInstruction, ImageAnalysis, StoryGeneration
from flask_cors import CORS # Added import
from api.unity_routes import unity_api # Added import

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

# CORS configuration
CORS(app, resources={
    r"/api/unity/*": {
        "origins": "*",  # In production, replace with specific Unity client origin
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})


# Create database tables
with app.app_context():
    db.create_all()


@app.route('/')
def index():
    """Main page showing character selection and story options"""
    story_options = get_story_options()

    # Get 4 random images for character selection
    images = ImageAnalysis.query.filter_by(image_type='character').order_by(db.func.random()).limit(4).all()
    image_data = []
    for img in images:
        analysis = img.analysis_result or {}

        # Extract name - first use character_name field, then try analysis_result
        char_name = img.character_name or ''
        if not char_name and analysis:
            if 'character' in analysis and 'name' in analysis['character']:
                char_name = analysis['character'].get('name', '')
            elif 'character_name' in analysis:
                char_name = analysis.get('character_name', '')
            elif 'name' in analysis:
                char_name = analysis.get('name', '')

        # Get character traits and plot lines safely
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
        images=image_data
    )


@app.route('/debug')
def debug():
    """Debug tool for image analysis and database management"""
    recent_images = ImageAnalysis.query.order_by(ImageAnalysis.created_at.desc()).limit(10).all()
    recent_stories = StoryGeneration.query.order_by(StoryGeneration.created_at.desc()).limit(10).all()

    # Get database stats for the health check tab
    image_count = ImageAnalysis.query.count()
    character_count = ImageAnalysis.query.filter_by(image_type='character').count()
    scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
    story_count = StoryGeneration.query.count()

    # Count orphaned images (not connected to any story)
    orphaned_images = db.session.query(ImageAnalysis).outerjoin(
        story_images, ImageAnalysis.id == story_images.c.image_id
    ).filter(story_images.c.story_id == None).count()

    # Count empty stories (not connected to any images)
    empty_stories = db.session.query(StoryGeneration).outerjoin(
        story_images, StoryGeneration.id == story_images.c.story_id
    ).filter(story_images.c.image_id == None).count()

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

@app.route('/story-builder')
def story_builder():
    """Advanced story branching builder interface"""
    return render_template('story_builder.html')


@app.route('/storyboard/<int:story_id>')
def storyboard(story_id):
    """Display the current story progress and choices"""
    story = StoryGeneration.query.get_or_404(story_id)
    story_data = json.loads(story.generated_story)

    # Get associated character images
    character_images = []
    for image in story.images:
        analysis = image.analysis_result
        character_images.append({
            'id': image.id,
            'image_url': image.image_url,
            'name': analysis.get('name', ''),
            'traits': image.character_traits
        })

    return render_template(
        'storyboard.html',
        story=story_data,
        character_images=character_images
    )


@app.route('/generate_story', methods=['POST'])
def generate_story_route():
    try:
        # Get form data
        data = request.form
        selected_image_ids = request.form.getlist('selected_images[]')

        if len(selected_image_ids) != 1:
            return jsonify({'error': 'Please select a character for your story'}), 400

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
            'previous_choice': data.get('previous_choice', ''),
            'story_context': data.get('story_context', '')
        }

        # Get character information from selected images
        selected_images = ImageAnalysis.query.filter(ImageAnalysis.id.in_(selected_image_ids)).all()
        if not selected_images:
            return jsonify({'error': 'Selected images not found'}), 404

        # Get the main character information
        main_character_img = selected_images[0]
        analysis = main_character_img.analysis_result or {}

        # Extract name - first use character_name field, then try analysis_result
        char_name = main_character_img.character_name or ''
        if not char_name and analysis:
            if 'character' in analysis and 'name' in analysis['character']:
                char_name = analysis['character'].get('name', '')
            elif 'character_name' in analysis:
                char_name = analysis.get('character_name', '')
            elif 'name' in analysis:
                char_name = analysis.get('name', '')

        # If still no name, use a default
        if not char_name:
            char_name = "Mystery Character"

        # Build comprehensive character info
        character_info = {
            'name': char_name,
            'role': main_character_img.character_role or 'protagonist',
            'character_traits': main_character_img.character_traits or [],
            'style': analysis.get('style', 'A mysterious character'),
            'plot_lines': main_character_img.plot_lines or []
        }

        # Generate the story
        story_params['character_info'] = character_info
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

        # Parse the story data
        story_data = json.loads(result['story'])
        
        # For form submissions, redirect to storyboard
        if request.method == 'POST' and request.content_type and 'form' in request.content_type:
            return redirect(url_for('storyboard', story_id=story.id))
            
        # For AJAX requests, return JSON
        return jsonify({
            'success': True,
            'story': story_data,
            'story_id': story.id
        })

    except Exception as e:
        logger.error(f"Error generating story: {str(e)}")
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


@app.route('/save_analysis', methods=['POST'])
def save_analysis():
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
        logger.error(f"Error deleting all stories: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@app.route('/api/db/health-check', methods=['GET'])
def db_health_check():
    """API endpoint to perform a database health check"""
    try:
        # Get counts
        image_count = ImageAnalysis.query.count()
        character_count = ImageAnalysis.query.filter_by(image_type='character').count()
        scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
        story_count = StoryGeneration.query.count()
        orphaned_images = ImageAnalysis.query.filter(~ImageAnalysis.stories.any()).count()
        empty_stories = StoryGeneration.query.filter(StoryGeneration.generated_story.is_(None)).count()

        # Check for potential issues
        issues = []

        # Check for missing image URLs
        invalid_urls = ImageAnalysis.query.filter(
            db.or_(
                ImageAnalysis.image_url.is_(None),
                ImageAnalysis.image_url == '',
                ~ImageAnalysis.image_url.like('http%')
            )
        ).count()

        if invalid_urls > 0:
            issues.append({
                'severity': 'warning',
                'message': f'Found {invalid_urls} images with invalid or missing URLs',
                'type': 'invalid_urls'
            })

        # Check for missing analysis results
        missing_analysis = ImageAnalysis.query.filter(
            db.or_(
                ImageAnalysis.analysis_result.is_(None),
                ImageAnalysis.analysis_result == {}
            )
        ).count()

        # Check for characters missing plot lines
        missing_plot_lines = ImageAnalysis.query.filter(
            db.and_(
                ImageAnalysis.image_type == 'character',
                db.or_(
                    ImageAnalysis.plot_lines.is_(None),
                    ImageAnalysis.plot_lines == []
                )
            )
        ).count()

        if missing_plot_lines > 0:
            issues.append({
                'severity': 'warning',
                'message': f'Found {missing_plot_lines} characters with missing plot lines',
                'type': 'missing_plot_lines'
            })

        if missing_analysis > 0:
            issues.append({
                'severity': 'error',
                'message': f'Found {missing_analysis} images with missing analysis results',
                'type': 'missing_analysis'
            })

        # Check for stories with no images
        stories_no_images = StoryGeneration.query.filter(~StoryGeneration.images.any()).count()

        if stories_no_images > 0:
            issues.append({
                'severity': 'warning',
                'message': f'Found {stories_no_images} stories with no associated images',
                'type': 'stories_no_images'
            })

        # Check for malformed story JSON
        malformed_stories = 0
        for story in StoryGeneration.query.all():
            if story.generated_story:
                try:
                    if isinstance(story.generated_story, str):
                        json.loads(story.generated_story)
                except:
                    malformed_stories += 1

        if malformed_stories > 0:
            issues.append({
                'severity': 'error',
                'message': f'Found {malformed_stories} stories with malformed JSON',
                'type': 'malformed_json'
            })

        return jsonify({
            'success': True,
            'stats': {
                'image_count': image_count,
                'character_count': character_count,
                'scene_count': scene_count,
                'story_count': story_count,
                'orphaned_images': orphaned_images,
                'empty_stories': empty_stories
            },
            'issues': issues,
            'has_issues': len(issues) > 0
        })
    except Exception as e:
        logger.error(f"Error performing health check: {str(e)}")
        return jsonify({'error': str(e)}), 500


app.register_blueprint(unity_api, url_prefix='/api/unity') # Blueprint registration

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)