
import os
import logging
import json
from flask import Flask, render_template, request, jsonify, redirect, url_for
from dotenv import load_dotenv
from services.openai_service import analyze_artwork, generate_image_description
from services.story_maker import generate_story, get_story_options
from database import db
from models import AIInstruction, ImageAnalysis, StoryGeneration, story_images
from flask_cors import CORS

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the Flask application
app = Flask(__name__)

# Configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///story_adventure.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Initialize the database with the app
db.init_app(app)

# Enable CORS
CORS(app)

# Create database tables within app context
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    # Get recent characters
    recent_characters = ImageAnalysis.query.filter_by(image_type='character').order_by(ImageAnalysis.id.desc()).limit(3).all()
    return render_template('index.html', characters=recent_characters)

@app.route('/debug')
def debug():
    """Debug page for image analysis and database management"""
    recent_images = ImageAnalysis.query.order_by(ImageAnalysis.id.desc()).limit(10).all()
    recent_stories = StoryGeneration.query.order_by(StoryGeneration.id.desc()).limit(10).all()
    
    # Get counts for stats
    image_count = ImageAnalysis.query.count()
    character_count = ImageAnalysis.query.filter_by(image_type='character').count()
    scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
    story_count = StoryGeneration.query.count()
    
    # Calculate possible issues
    orphaned_images = ImageAnalysis.query.filter(~ImageAnalysis.id.in_(
        db.session.query(story_images.c.image_id)
    )).count()
    
    empty_stories = StoryGeneration.query.filter(
        StoryGeneration.images == None
    ).count()
    
    return render_template('debug.html', 
                          recent_images=recent_images,
                          recent_stories=recent_stories,
                          image_count=image_count,
                          character_count=character_count,
                          scene_count=scene_count,
                          story_count=story_count,
                          orphaned_images=orphaned_images,
                          empty_stories=empty_stories)

@app.route('/generate', methods=['POST'])
def generate_route():
    """Route for generating image analysis"""
    image_url = request.form.get('image_url')
    
    if not image_url:
        return jsonify({'success': False, 'error': 'No image URL provided'})
    
    try:
        # Check if we've already analyzed this image
        existing = ImageAnalysis.query.filter_by(image_url=image_url).first()
        if existing:
            return jsonify({
                'success': True, 
                'analysis': existing.analysis_result,
                'image_url': image_url,
                'saved_to_db': True,
                'image_id': existing.id
            })
        
        # Generate new analysis
        analysis = analyze_artwork(image_url)
        
        return jsonify({
            'success': True, 
            'analysis': analysis,
            'image_url': image_url,
            'saved_to_db': False
        })
        
    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/save_analysis', methods=['POST'])
def save_analysis_route():
    """Route for saving image analysis to database"""
    data = request.json
    
    if not data or 'image_url' not in data or 'analysis' not in data:
        return jsonify({'success': False, 'error': 'Invalid data provided'})
    
    try:
        image_url = data['image_url']
        analysis = data['analysis']
        
        # Check if we've already analyzed this image
        existing = ImageAnalysis.query.filter_by(image_url=image_url).first()
        if existing:
            # Update existing record
            existing.analysis_result = analysis
            
            # Extract and update fields based on analysis
            if 'image_metadata' in analysis:
                metadata = analysis['image_metadata']
                existing.image_width = metadata.get('width')
                existing.image_height = metadata.get('height')
                existing.image_format = metadata.get('format')
                existing.image_size_bytes = metadata.get('size_bytes')
            
            if 'image_type' in analysis:
                existing.image_type = analysis['image_type']
            
            # Character-specific fields
            if analysis.get('image_type') == 'character':
                existing.character_name = analysis.get('name', '')
                existing.character_traits = analysis.get('character_traits', [])
                existing.character_role = analysis.get('role', 'neutral')
                existing.plot_lines = analysis.get('plot_lines', [])
            
            # Scene-specific fields
            elif analysis.get('image_type') == 'scene':
                existing.scene_type = analysis.get('scene_type', 'narrative')
                existing.setting = analysis.get('setting', '')
                existing.setting_description = analysis.get('setting_description', '')
                existing.dramatic_moments = analysis.get('dramatic_moments', [])
            
            db.session.commit()
            return jsonify({'success': True, 'message': 'Analysis updated', 'id': existing.id})
        
        # Create new record
        image_analysis = ImageAnalysis(
            image_url=image_url,
            analysis_result=analysis,
            image_type=analysis.get('image_type', 'character')
        )
        
        # Extract and set fields based on analysis
        if 'image_metadata' in analysis:
            metadata = analysis['image_metadata']
            image_analysis.image_width = metadata.get('width')
            image_analysis.image_height = metadata.get('height')
            image_analysis.image_format = metadata.get('format')
            image_analysis.image_size_bytes = metadata.get('size_bytes')
        
        # Character-specific fields
        if analysis.get('image_type') == 'character':
            image_analysis.character_name = analysis.get('name', '')
            image_analysis.character_traits = analysis.get('character_traits', [])
            image_analysis.character_role = analysis.get('role', 'neutral')
            image_analysis.plot_lines = analysis.get('plot_lines', [])
        
        # Scene-specific fields
        elif analysis.get('image_type') == 'scene':
            image_analysis.scene_type = analysis.get('scene_type', 'narrative')
            image_analysis.setting = analysis.get('setting', '')
            image_analysis.setting_description = analysis.get('setting_description', '')
            image_analysis.dramatic_moments = analysis.get('dramatic_moments', [])
        
        db.session.add(image_analysis)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Analysis saved', 'id': image_analysis.id})
        
    except Exception as e:
        logger.error(f"Error saving analysis: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/generate_story', methods=['GET', 'POST'])
def generate_story_route():
    """Route for generating or continuing a story"""
    if request.method == 'POST':
        # Get form data
        selected_images = request.form.getlist('selected_images[]')
        conflict = request.form.get('conflict')
        setting = request.form.get('setting')
        narrative_style = request.form.get('narrative_style')
        mood = request.form.get('mood')
        
        # For continuing a story
        previous_choice = request.form.get('previous_choice')
        story_context = request.form.get('story_context')
        
        if not selected_images:
            return jsonify({'success': False, 'error': 'No characters selected'})
        
        # Get image records
        images = []
        for image_id in selected_images:
            image = ImageAnalysis.query.get(image_id)
            if image:
                images.append(image)
        
        if not images:
            return jsonify({'success': False, 'error': 'Invalid character selection'})
        
        try:
            # Generate story options
            options_result = get_story_options(images)
            
            # If conflict not provided, use suggested options
            if not conflict and options_result:
                conflicts = options_result.get('conflicts', [])
                if conflicts:
                    conflict = conflicts[0]
            
            if not setting and options_result:
                settings = options_result.get('settings', [])
                if settings:
                    setting = settings[0]
            
            if not narrative_style and options_result:
                styles = options_result.get('narrative_styles', [])
                if styles:
                    narrative_style = styles[0]
            
            if not mood and options_result:
                moods = options_result.get('moods', [])
                if moods:
                    mood = moods[0]
            
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
            
            if not result:
                return jsonify({'success': False, 'error': 'Failed to generate story'})
            
            # Create story record
            story = StoryGeneration(
                primary_conflict=conflict,
                setting=setting,
                narrative_style=narrative_style,
                mood=mood,
                generated_story=result
            )
            
            # Associate images with story
            for image in images:
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
                'conflict': conflict,
                'setting': setting,
                'narrative_style': narrative_style,
                'mood': mood,
                'story_id': story.id
            })
            
        except Exception as e:
            logger.error(f"Error generating story: {str(e)}")
            return jsonify({'success': False, 'error': str(e)})
    
    # GET request - return the form
    character_images = ImageAnalysis.query.filter_by(image_type='character').all()
    return render_template('index.html', characters=character_images)

@app.route('/storyboard/<int:story_id>')
def storyboard(story_id):
    """Route for displaying a generated story"""
    story = StoryGeneration.query.get_or_404(story_id)
    
    if not story.generated_story:
        return redirect(url_for('index'))
    
    # Get character images
    character_images = story.images
    
    # Parse the story JSON
    story_data = json.loads(story.generated_story['story'])
    
    return render_template('storyboard.html', 
                           story=story_data, 
                           character_images=character_images,
                           story=story)
