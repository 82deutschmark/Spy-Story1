import os
import logging
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
from dotenv import load_dotenv
from database import db
from models import (
    AIInstruction, ImageAnalysis, StoryGeneration, 
    story_images, StoryNode, StoryChoice, 
    UserProgress, Achievement
)
from services.story_maker import generate_story, get_story_options

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS

# Configure the database
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = os.environ.get("SESSION_SECRET")

# Initialize the database
db.init_app(app)

# Register blueprints
from api.unity_routes import unity_api
app.register_blueprint(unity_api, url_prefix='/api/unity')

# Create database tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    """Render the home page"""
    try:
        # Get some character images to display
        character_images = ImageAnalysis.query.filter_by(image_type='character').limit(4).all()
        logger.debug(f"Found {len(character_images)} character images")

        return render_template('index.html', character_images=character_images)
    except Exception as e:
        logger.error(f"Error rendering index: {str(e)}")
        return render_template('index.html', character_images=[])

@app.route('/debug')
def debug():
    """Render the debug page"""
    try:
        # Get recent image analyses
        recent_images = ImageAnalysis.query.order_by(ImageAnalysis.created_at.desc()).limit(10).all()

        # Get recent story generations
        recent_stories = StoryGeneration.query.order_by(StoryGeneration.created_at.desc()).limit(10).all()

        # Get database stats
        image_count = ImageAnalysis.query.count()
        story_count = StoryGeneration.query.count()

        return render_template('debug.html', 
                           recent_images=recent_images,
                           recent_stories=recent_stories,
                           image_count=image_count,
                           story_count=story_count)
    except Exception as e:
        logger.error(f"Error rendering debug page: {str(e)}")
        return render_template('debug.html')

@app.route('/builder')
def story_builder():
    """Render the story builder page"""
    return render_template('story_builder.html')

@app.route('/storyboard')
def storyboard():
    """Render the storyboard page"""
    # Get story ID from query parameters
    story_id = request.args.get('story_id')
    
    if not story_id:
        return redirect(url_for('index'))
    
    # Get the story
    story = StoryGeneration.query.get_or_404(story_id)
    
    # Get the associated images
    character_images = []
    for image in story.images:
        if image.image_type == 'character':
            character_data = {
                'name': image.character_name,
                'image_url': image.image_url,
                'traits': image.character_traits or []
            }
            character_images.append(character_data)
    
    # Parse the story text
    try:
        story_data = json.loads(story.story_text)
    except json.JSONDecodeError:
        story_data = {
            'title': 'Error parsing story',
            'story': story.story_text,
            'choices': []
        }
    
    return render_template('storyboard.html', 
                          story=story,
                          character_images=character_images,
                          story_data=story_data)

@app.route('/generate', methods=['POST'])
def generate():
    """Generate image analysis using OpenAI"""
    image_url = request.form.get('image_url')
    
    if not image_url:
        return jsonify({
            'success': False,
            'error': 'No image URL provided'
        })
    
    try:
        # Check if this image has already been analyzed
        existing_analysis = ImageAnalysis.query.filter_by(image_url=image_url).first()
        if existing_analysis:
            return jsonify({
                'success': True,
                'image_url': image_url,
                'analysis': existing_analysis.analysis_result,
                'saved_to_db': True
            })
        
        # Generate new analysis
        analysis = analyze_artwork(image_url)
        
        return jsonify({
            'success': True,
            'image_url': image_url,
            'analysis': analysis,
            'saved_to_db': False
        })
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/save_analysis', methods=['POST'])
def save_analysis():
    """Save image analysis to the database"""
    data = request.get_json()
    
    if not data or 'image_url' not in data or 'analysis' not in data:
        return jsonify({
            'success': False,
            'error': 'Invalid data provided'
        })
    
    try:
        image_url = data['image_url']
        analysis = data['analysis']
        
        # Check if this image already exists
        existing_analysis = ImageAnalysis.query.filter_by(image_url=image_url).first()
        if existing_analysis:
            return jsonify({
                'success': True,
                'message': 'Analysis already exists in the database',
                'id': existing_analysis.id
            })
        
        # Extract data from the analysis
        image_type = analysis.get('image_type', '')
        
        # If image_type is not explicitly set, try to infer it
        if not image_type:
            if 'character' in analysis or 'character_name' in analysis or 'character_traits' in analysis:
                image_type = 'character'
            elif 'scene_type' in analysis or 'setting' in analysis:
                image_type = 'scene'
            else:
                # Default to unknown type
                image_type = 'unknown'
        
        # Create new record
        new_analysis = ImageAnalysis(
            image_url=image_url,
            image_type=image_type,
            analysis_result=analysis
        )
        
        # Set character-specific fields if applicable
        if image_type == 'character':
            new_analysis.character_name = analysis.get('name', '')
            if not new_analysis.character_name and 'character' in analysis:
                new_analysis.character_name = analysis['character'].get('name', '')
                
            new_analysis.character_role = analysis.get('role', '')
            if not new_analysis.character_role and 'character' in analysis:
                new_analysis.character_role = analysis['character'].get('role', '')
                
            new_analysis.character_traits = analysis.get('character_traits', [])
            new_analysis.plot_lines = analysis.get('plot_lines', [])
        
        # Set scene-specific fields if applicable
        elif image_type == 'scene':
            new_analysis.scene_type = analysis.get('scene_type', '')
            new_analysis.setting = analysis.get('setting', '')
            new_analysis.dramatic_moments = analysis.get('dramatic_moments', [])
        
        # Save to database
        db.session.add(new_analysis)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Analysis saved to database',
            'id': new_analysis.id
        })
    except Exception as e:
        logger.error(f"Error saving analysis: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/generate_story_options', methods=['POST'])
def generate_story_options_route():
    """Generate story options based on selected images"""
    data = request.get_json()
    
    if not data or 'selected_images' not in data:
        return jsonify({
            'success': False,
            'error': 'No images selected'
        })
    
    try:
        # Get selected images
        image_ids = data['selected_images']
        images = ImageAnalysis.query.filter(ImageAnalysis.id.in_(image_ids)).all()
        
        if not images:
            return jsonify({
                'success': False,
                'error': 'No valid images found'
            })
        
        # Generate options
        options = get_story_options(images)
        
        return jsonify({
            'success': True,
            'options': options
        })
    except Exception as e:
        logger.error(f"Error generating story options: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/generate_story', methods=['POST'])
def generate_story_route():
    """Generate a story based on selected parameters"""
    # Get data from form or JSON
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form
    
    try:
        # Get the various parameters
        image_ids = data.getlist('selected_images[]') if hasattr(data, 'getlist') else data.get('selected_images', [])
        conflict = data.get('conflict')
        setting = data.get('setting')
        narrative_style = data.get('narrative_style')
        mood = data.get('mood')
        previous_choice = data.get('previous_choice')
        story_context = data.get('story_context')
        
        # Check if continuing a story
        is_continuation = previous_choice is not None and story_context is not None
        
        # Get images
        if isinstance(image_ids, str):
            # Handle the case where image_ids is a single string
            image_ids = [image_ids]
            
        images = ImageAnalysis.query.filter(ImageAnalysis.id.in_(image_ids)).all()
        
        if not images:
            return jsonify({
                'success': False,
                'error': 'No valid images selected'
            })
        
        # Generate story
        result = generate_story(
            images=images,
            conflict=conflict,
            setting=setting,
            narrative_style=narrative_style,
            mood=mood,
            previous_choice=previous_choice,
            story_context=story_context
        )
        
        # Save the generated story to the database
        story_data = json.loads(result['story'])
        
        # Create new story record or update existing one
        if is_continuation:
            # For continuation, we create a new story
            story = StoryGeneration(
                primary_conflict=conflict,
                setting=setting,
                narrative_style=narrative_style,
                mood=mood,
                story_text=result['story'],
                images=images
            )
        else:
            # New story
            story = StoryGeneration(
                primary_conflict=conflict,
                setting=setting,
                narrative_style=narrative_style,
                mood=mood,
                story_text=result['story'],
                images=images
            )
        
        db.session.add(story)
        db.session.commit()
        
        # Redirect to the storyboard with the new story ID
        return redirect(url_for('storyboard', story_id=story.id))
    except Exception as e:
        logger.error(f"Error generating story: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        })

# API Routes
@app.route('/api/image/<int:image_id>', methods=['GET'])
def api_get_image(image_id):
    """API endpoint to get image analysis details"""
    try:
        image = ImageAnalysis.query.get_or_404(image_id)
        
        return jsonify({
            'success': True,
            'id': image.id,
            'image_url': image.image_url,
            'image_type': image.image_type,
            'analysis': image.analysis_result,
            'created_at': image.created_at.isoformat()
        })
    except Exception as e:
        logger.error(f"API error getting image: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/image/<int:image_id>', methods=['DELETE'])
def api_delete_image(image_id):
    """API endpoint to delete an image analysis"""
    try:
        image = ImageAnalysis.query.get_or_404(image_id)
        
        # Remove from any stories
        for story in image.stories:
            story.images.remove(image)
        
        db.session.delete(image)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Image analysis (ID: {image_id}) deleted successfully'
        })
    except Exception as e:
        logger.error(f"API error deleting image: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/story/<int:story_id>', methods=['DELETE'])
def api_delete_story(story_id):
    """API endpoint to delete a story"""
    try:
        story = StoryGeneration.query.get_or_404(story_id)
        
        db.session.delete(story)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Story (ID: {story_id}) deleted successfully'
        })
    except Exception as e:
        logger.error(f"API error deleting story: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/db/health-check')
def api_db_health_check():
    """API endpoint to check database health"""
    try:
        # Get database stats
        image_count = ImageAnalysis.query.count()
        character_count = ImageAnalysis.query.filter_by(image_type='character').count()
        scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
        story_count = StoryGeneration.query.count()
        
        # Calculate orphaned images (not used in any story)
        orphaned_images = db.session.query(ImageAnalysis).\
            outerjoin(story_images).\
            filter(story_images.c.image_id == None).\
            count()
        
        # Calculate empty stories (no images attached)
        empty_stories = db.session.query(StoryGeneration).\
            outerjoin(story_images).\
            filter(story_images.c.story_id == None).\
            count()
        
        # Identify potential issues
        issues = []
        has_issues = False
        
        if empty_stories > 0:
            has_issues = True
            issues.append({
                'severity': 'warning',
                'message': f'Found {empty_stories} stories with no images attached'
            })
        
        if orphaned_images > 0:
            has_issues = True
            issues.append({
                'severity': 'info',
                'message': f'Found {orphaned_images} images not used in any story'
            })
        
        # Check for duplicate image URLs
        duplicate_urls = db.session.query(ImageAnalysis.image_url).\
            group_by(ImageAnalysis.image_url).\
            having(db.func.count(ImageAnalysis.id) > 1).\
            count()
        
        if duplicate_urls > 0:
            has_issues = True
            issues.append({
                'severity': 'warning',
                'message': f'Found {duplicate_urls} duplicate image URLs in the database'
            })
        
        # Return health check results
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
            'has_issues': has_issues,
            'issues': issues
        })
    except Exception as e:
        logger.error(f"API error during health check: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/db/delete-all-images', methods=['POST'])
def api_delete_all_images():
    """API endpoint to delete all images"""
    try:
        # First remove all image associations from stories
        for story in StoryGeneration.query.all():
            story.images = []
        
        # Then delete all images
        ImageAnalysis.query.delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'All image records deleted successfully'
        })
    except Exception as e:
        logger.error(f"API error deleting all images: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/db/delete-all-stories', methods=['POST'])
def api_delete_all_stories():
    """API endpoint to delete all stories"""
    try:
        StoryGeneration.query.delete()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'All story records deleted successfully'
        })
    except Exception as e:
        logger.error(f"API error deleting all stories: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/images/characters')
def api_get_characters():
    """API endpoint to get all character images"""
    try:
        characters = ImageAnalysis.query.filter_by(image_type='character').all()
        character_list = []
        
        for char in characters:
            character_list.append({
                'id': char.id,
                'name': char.character_name,
                'image_url': char.image_url,
                'character_role': char.character_role,
                'character_traits': char.character_traits,
                'plot_lines': char.plot_lines
            })
        
        return jsonify({
            'success': True,
            'characters': character_list
        })
    except Exception as e:
        logger.error(f"API error getting characters: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/images/scenes')
def api_get_scenes():
    """API endpoint to get all scene images"""
    try:
        scenes = ImageAnalysis.query.filter_by(image_type='scene').all()
        scene_list = []
        
        for scene in scenes:
            scene_list.append({
                'id': scene.id,
                'setting': scene.setting,
                'image_url': scene.image_url,
                'scene_type': scene.scene_type,
                'dramatic_moments': scene.dramatic_moments
            })
        
        return jsonify({
            'success': True,
            'scenes': scene_list
        })
    except Exception as e:
        logger.error(f"API error getting scenes: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

import json
# The __main__ block is removed because it's likely handled in main.py