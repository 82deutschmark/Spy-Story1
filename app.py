
from flask import Flask, render_template, request, redirect, url_for, jsonify, Blueprint
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, Table, Text
from sqlalchemy.orm import relationship
from database import db
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///story_adventure.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Import API routes and services
from api.unity_routes import unity_api
from services.openai_service import analyze_artwork, generate_image_description
from services.story_maker import generate_story, get_story_options

# Register blueprints
app.register_blueprint(unity_api, url_prefix='/api/unity')

# Import models - these now need to be imported after app and db are initialized
from models import AIInstruction, ImageAnalysis, StoryGeneration, story_images

# Routes
@app.route('/')
def index():
    """Home page route"""
    # Get recent character images for the gallery
    recent_characters = ImageAnalysis.query.filter_by(image_type='character').order_by(ImageAnalysis.created_at.desc()).limit(6).all()
    
    # Get recent scene images for the gallery
    recent_scenes = ImageAnalysis.query.filter_by(image_type='scene').order_by(ImageAnalysis.created_at.desc()).limit(3).all()
    
    # Get recent stories
    recent_stories = StoryGeneration.query.order_by(StoryGeneration.created_at.desc()).limit(5).all()
    
    return render_template('index.html', 
                           characters=recent_characters,
                           scenes=recent_scenes,
                           stories=recent_stories)

@app.route('/debug')
def debug():
    """Debug page route"""
    # Get recent images
    recent_images = ImageAnalysis.query.order_by(ImageAnalysis.created_at.desc()).limit(10).all()
    
    # Get recent stories
    recent_stories = StoryGeneration.query.order_by(StoryGeneration.created_at.desc()).limit(10).all()
    
    # Get database stats
    image_count = ImageAnalysis.query.count()
    character_count = ImageAnalysis.query.filter_by(image_type='character').count()
    scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
    story_count = StoryGeneration.query.count()
    
    # Get orphaned images (not associated with any story)
    orphaned_images = ImageAnalysis.query.filter(~ImageAnalysis.id.in_(
        db.session.query(story_images.c.image_id)
    )).count()
    
    # Get empty stories (without images)
    empty_stories = StoryGeneration.query.filter(~StoryGeneration.id.in_(
        db.session.query(story_images.c.story_id)
    )).count()
    
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
def generate():
    """Generate image analysis based on URL"""
    image_url = request.form.get('image_url')
    
    if not image_url:
        return jsonify({"success": False, "error": "No image URL provided"})
    
    try:
        # Call OpenAI service to analyze the artwork
        analysis = analyze_artwork(image_url)
        
        # Check if this image URL is already in the database
        existing_image = ImageAnalysis.query.filter_by(image_url=image_url).first()
        
        return jsonify({
            "success": True,
            "image_url": image_url,
            "analysis": analysis,
            "saved_to_db": existing_image is not None
        })
    except Exception as e:
        logger.error(f"Error generating analysis: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

@app.route('/save_analysis', methods=['POST'])
def save_analysis():
    """Save image analysis to database"""
    data = request.json
    image_url = data.get('image_url')
    analysis = data.get('analysis')
    
    if not image_url or not analysis:
        return jsonify({"success": False, "error": "Missing image URL or analysis"})
    
    try:
        # Check if image already exists
        existing_image = ImageAnalysis.query.filter_by(image_url=image_url).first()
        
        if existing_image:
            # Update existing record
            existing_image.analysis_result = analysis
            existing_image.updated_at = datetime.now()
            
            # Update image type and other metadata
            if isinstance(analysis, dict):
                existing_image.image_type = analysis.get('image_type', existing_image.image_type)
                
                # Update character-specific fields
                if analysis.get('image_type') == 'character':
                    # Try to find character name in various places
                    character_name = None
                    if 'character' in analysis and isinstance(analysis['character'], dict):
                        character_name = analysis['character'].get('name')
                    if not character_name and 'name' in analysis:
                        character_name = analysis['name']
                    
                    if character_name:
                        existing_image.character_name = character_name
                    
                    # Character role
                    role = None
                    if 'character' in analysis and isinstance(analysis['character'], dict):
                        role = analysis['character'].get('role')
                    if not role and 'role' in analysis:
                        role = analysis['role']
                    
                    if role:
                        existing_image.character_role = role
                    
                    # Character traits
                    traits = None
                    if 'character' in analysis and isinstance(analysis['character'], dict):
                        traits = analysis['character'].get('character_traits')
                    if not traits and 'character_traits' in analysis:
                        traits = analysis['character_traits']
                    
                    if traits:
                        existing_image.character_traits = traits
                    
                    # Plot lines
                    plot_lines = None
                    if 'character' in analysis and isinstance(analysis['character'], dict):
                        plot_lines = analysis['character'].get('plot_lines')
                    if not plot_lines and 'plot_lines' in analysis:
                        plot_lines = analysis['plot_lines']
                    
                    if plot_lines:
                        existing_image.plot_lines = plot_lines
                
                # Update scene-specific fields
                if analysis.get('image_type') == 'scene':
                    if 'scene_type' in analysis:
                        existing_image.scene_type = analysis['scene_type']
                    if 'setting' in analysis:
                        existing_image.setting = analysis['setting']
                    if 'dramatic_moments' in analysis:
                        existing_image.dramatic_moments = analysis['dramatic_moments']
            
            db.session.commit()
            return jsonify({"success": True, "message": "Image analysis updated", "id": existing_image.id})
        else:
            # Create new record
            new_image = ImageAnalysis(
                image_url=image_url,
                analysis_result=analysis
            )
            
            # Set image type and other metadata
            if isinstance(analysis, dict):
                new_image.image_type = analysis.get('image_type', 'unknown')
                
                # Set character-specific fields
                if analysis.get('image_type') == 'character':
                    # Try to find character name in various places
                    character_name = None
                    if 'character' in analysis and isinstance(analysis['character'], dict):
                        character_name = analysis['character'].get('name')
                    if not character_name and 'name' in analysis:
                        character_name = analysis['name']
                    
                    if character_name:
                        new_image.character_name = character_name
                    
                    # Character role
                    role = None
                    if 'character' in analysis and isinstance(analysis['character'], dict):
                        role = analysis['character'].get('role')
                    if not role and 'role' in analysis:
                        role = analysis['role']
                    
                    if role:
                        new_image.character_role = role
                    
                    # Character traits
                    traits = None
                    if 'character' in analysis and isinstance(analysis['character'], dict):
                        traits = analysis['character'].get('character_traits')
                    if not traits and 'character_traits' in analysis:
                        traits = analysis['character_traits']
                    
                    if traits:
                        new_image.character_traits = traits
                    
                    # Plot lines
                    plot_lines = None
                    if 'character' in analysis and isinstance(analysis['character'], dict):
                        plot_lines = analysis['character'].get('plot_lines')
                    if not plot_lines and 'plot_lines' in analysis:
                        plot_lines = analysis['plot_lines']
                    
                    if plot_lines:
                        new_image.plot_lines = plot_lines
                
                # Set scene-specific fields
                if analysis.get('image_type') == 'scene':
                    if 'scene_type' in analysis:
                        new_image.scene_type = analysis['scene_type']
                    if 'setting' in analysis:
                        new_image.setting = analysis['setting']
                    if 'dramatic_moments' in analysis:
                        new_image.dramatic_moments = analysis['dramatic_moments']
            
            db.session.add(new_image)
            db.session.commit()
            return jsonify({"success": True, "message": "Image analysis saved", "id": new_image.id})
    
    except Exception as e:
        logger.error(f"Error saving analysis: {str(e)}")
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)})

@app.route('/storyboard/<int:story_id>')
def storyboard(story_id):
    """Display a story"""
    story = StoryGeneration.query.get_or_404(story_id)
    
    # Parse story data from JSON
    story_data = json.loads(story.story_text)
    
    # Get character images for this story
    character_images = []
    for image in story.images:
        if image.image_type == 'character':
            character_info = {
                'id': image.id,
                'name': image.character_name or 'Unknown Character',
                'image_url': image.image_url,
                'traits': image.character_traits or []
            }
            character_images.append(character_info)
    
    return render_template('storyboard.html', 
                           story=story,
                           story_data=story_data,
                           character_images=character_images)

@app.route('/generate_story', methods=['POST'])
def generate_story_route():
    """Generate a story based on form inputs"""
    # Get form data
    selected_images = request.form.getlist('selected_images[]')
    conflict = request.form.get('conflict')
    setting = request.form.get('setting')
    narrative_style = request.form.get('narrative_style')
    mood = request.form.get('mood')
    previous_choice = request.form.get('previous_choice')
    story_context = request.form.get('story_context')
    
    # Validate inputs
    if not selected_images:
        return jsonify({"success": False, "error": "Please select at least one character or scene"})
    
    if not conflict or not setting or not narrative_style or not mood:
        return jsonify({"success": False, "error": "Please provide all story parameters"})
    
    try:
        # Get images from database
        images = []
        for image_id in selected_images:
            image = ImageAnalysis.query.get(image_id)
            if image:
                images.append(image)
        
        # Generate story
        story_result = generate_story(
            images=images,
            conflict=conflict,
            setting=setting,
            narrative_style=narrative_style, 
            mood=mood,
            previous_choice=previous_choice,
            story_context=story_context
        )
        
        if not story_result:
            return jsonify({"success": False, "error": "Failed to generate story"})
        
        # Create story record
        story = StoryGeneration(
            primary_conflict=conflict,
            setting=setting,
            narrative_style=narrative_style,
            mood=mood,
            story_text=story_result.get('story')
        )
        
        # Add images to story
        for image in images:
            story.images.append(image)
        
        # Save to database
        db.session.add(story)
        db.session.commit()
        
        # Redirect to story view
        return redirect(url_for('storyboard', story_id=story.id))
        
    except Exception as e:
        logger.error(f"Error generating story: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

# API Routes

@app.route('/api/image/<int:image_id>', methods=['GET'])
def get_image(image_id):
    """Get image details"""
    image = ImageAnalysis.query.get(image_id)
    
    if not image:
        return jsonify({"success": False, "error": "Image not found"})
    
    # Parse analysis_result if it's a string
    analysis = image.analysis_result
    if isinstance(analysis, str):
        try:
            analysis = json.loads(analysis)
        except:
            pass
    
    return jsonify({
        "success": True,
        "id": image.id,
        "image_url": image.image_url,
        "image_type": image.image_type,
        "analysis": analysis,
        "created_at": image.created_at.isoformat() if image.created_at else None
    })

@app.route('/api/image/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    """Delete an image"""
    image = ImageAnalysis.query.get(image_id)
    
    if not image:
        return jsonify({"success": False, "error": "Image not found"})
    
    try:
        # Remove from any stories
        image.stories = []
        
        # Delete the image
        db.session.delete(image)
        db.session.commit()
        
        return jsonify({"success": True, "message": f"Image {image_id} deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/story/<int:story_id>', methods=['DELETE'])
def delete_story(story_id):
    """Delete a story"""
    story = StoryGeneration.query.get(story_id)
    
    if not story:
        return jsonify({"success": False, "error": "Story not found"})
    
    try:
        # Remove image associations
        story.images = []
        
        # Delete the story
        db.session.delete(story)
        db.session.commit()
        
        return jsonify({"success": True, "message": f"Story {story_id} deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/db/health-check', methods=['GET'])
def health_check():
    """Check database health"""
    try:
        # Get counts
        image_count = ImageAnalysis.query.count()
        character_count = ImageAnalysis.query.filter_by(image_type='character').count()
        scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
        story_count = StoryGeneration.query.count()
        
        # Get orphaned images (not associated with any story)
        orphaned_images = ImageAnalysis.query.filter(~ImageAnalysis.id.in_(
            db.session.query(story_images.c.image_id)
        )).count()
        
        # Get empty stories (without images)
        empty_stories = StoryGeneration.query.filter(~StoryGeneration.id.in_(
            db.session.query(story_images.c.story_id)
        )).count()
        
        # Check for potential issues
        issues = []
        has_issues = False
        
        if orphaned_images > 0:
            issues.append({
                "severity": "warning",
                "message": f"Found {orphaned_images} images not associated with any story"
            })
            has_issues = True
        
        if empty_stories > 0:
            issues.append({
                "severity": "warning",
                "message": f"Found {empty_stories} stories without any images"
            })
            has_issues = True
        
        # Look for potential data inconsistencies
        characters_without_names = ImageAnalysis.query.filter_by(image_type='character').filter(
            (ImageAnalysis.character_name == None) | (ImageAnalysis.character_name == '')
        ).count()
        
        if characters_without_names > 0:
            issues.append({
                "severity": "warning",
                "message": f"Found {characters_without_names} character images without names"
            })
            has_issues = True
        
        return jsonify({
            "success": True,
            "stats": {
                "image_count": image_count,
                "character_count": character_count,
                "scene_count": scene_count,
                "story_count": story_count,
                "orphaned_images": orphaned_images,
                "empty_stories": empty_stories
            },
            "issues": issues,
            "has_issues": has_issues
        })
    
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/db/delete-all-images', methods=['POST'])
def delete_all_images():
    """Delete all images"""
    try:
        # First remove all story-image associations
        db.session.execute(story_images.delete())
        
        # Then delete all images
        ImageAnalysis.query.delete()
        
        db.session.commit()
        
        return jsonify({"success": True, "message": "All images deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/db/delete-all-stories', methods=['POST'])
def delete_all_stories():
    """Delete all stories"""
    try:
        # First remove all story-image associations
        db.session.execute(story_images.delete())
        
        # Then delete all stories
        StoryGeneration.query.delete()
        
        db.session.commit()
        
        return jsonify({"success": True, "message": "All stories deleted successfully"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": str(e)})

# Create database tables
@app.before_first_request
def create_tables():
    db.create_all()

# Run the app
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
