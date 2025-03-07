import os
import logging
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from services.openai_service import analyze_artwork, generate_image_description
from services.story_maker import generate_story, get_story_options
from database import db
from models import AIInstruction, ImageAnalysis, StoryGeneration

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
        analysis = img.analysis_result
        image_data.append({
            'id': img.id,
            'image_url': img.image_url,
            'name': analysis.get('name', ''),
            'style': analysis.get('style', ''),
            'story': analysis.get('story', ''),
            'character_traits': img.character_traits or []
        })

    return render_template(
        'index.html',
        story_options=story_options,
        images=image_data
    )

@app.route('/debug')
def debug():
    """Debug page with image analysis tool and database view"""
    # Get recent image analyses
    recent_images = ImageAnalysis.query.order_by(ImageAnalysis.created_at.desc()).limit(10).all()
    recent_stories = StoryGeneration.query.order_by(StoryGeneration.created_at.desc()).limit(10).all()

    # Database statistics
    image_count = ImageAnalysis.query.count()
    character_count = ImageAnalysis.query.filter_by(image_type='character').count()
    scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
    story_count = StoryGeneration.query.count()

    # Orphaned images (not associated with any story)
    orphaned_images = ImageAnalysis.query.filter(~ImageAnalysis.stories.any()).count()

    # Empty stories (no generated content)
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
        main_character = {
            'name': main_character_img.analysis_result.get('name', 'Main Character'),
            'traits': main_character_img.character_traits or [],
            'description': main_character_img.analysis_result.get('style', 'Mysterious character'),
            'is_main': True
        }

        # Generate two random supporting characters
        supporting_chars = ImageAnalysis.query.filter(
            ImageAnalysis.id != main_character_img.id,
            ImageAnalysis.image_type == 'character'
        ).order_by(db.func.random()).limit(2).all()

        other_characters = []
        for i, img in enumerate(supporting_chars):
            char_info = {
                'name': img.analysis_result.get('name', f'Supporting Character {i+1}'),
                'traits': img.character_traits or [],
                'description': img.analysis_result.get('style', 'Supporting character'),
                'is_main': False
            }
            other_characters.append(char_info)

        # Build comprehensive character info
        character_info = {
            'main_character': main_character,
            'supporting_characters': other_characters
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
        return jsonify({
            'success': True,
            'story': story_data,
            'story_id': story.id
        })

    except Exception as e:
        logger.error(f"Error generating story: {str(e)}")
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

        # Determine if it's a character or scene
        is_character = 'name' in analysis

        # Create new ImageAnalysis record
        image_analysis = ImageAnalysis(
            image_url=image_url,
            image_width=metadata.get('width'),
            image_height=metadata.get('height'),
            image_format=metadata.get('format'),
            image_size_bytes=metadata.get('size_bytes'),
            image_type='character' if is_character else 'scene',
            analysis_result=analysis,
            character_traits=analysis.get('character_traits') if is_character else None,
            character_role=analysis.get('role') if is_character else None,
            plot_lines=analysis.get('plot_lines') if is_character else None,
            scene_type=analysis.get('scene_type') if not is_character else None
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
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)