import os
import logging
import json
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from services.openai_service import analyze_artwork, generate_instagram_post
from services.story_maker import generate_story, get_story_options
from database import db
from models import AIInstruction, HashtagCollection, ImageAnalysis, StoryGeneration

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
    instructions = AIInstruction.query.all()
    hashtag_collections = HashtagCollection.query.all()
    story_options = get_story_options()

    # Get 9 random images for character selection
    images = ImageAnalysis.query.order_by(db.func.random()).limit(9).all()
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
        instructions=instructions,
        hashtag_collections=hashtag_collections,
        story_options=story_options,
        images=image_data
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

        if len(selected_image_ids) != 3:
            return jsonify({'error': 'Please select exactly 3 characters'}), 400

        # Get the story parameters
        story_params = {
            'conflict': data.get('conflict'),
            'setting': data.get('setting'),
            'narrative_style': data.get('narrative_style'),
            'mood': data.get('mood'),
            'custom_conflict': data.get('custom_conflict'),
            'custom_setting': data.get('custom_setting'),
            'custom_narrative': data.get('custom_narrative'),
            'custom_mood': data.get('custom_mood'),
            'previous_choice': data.get('previous_choice'),
            'story_context': data.get('story_context')
        }

        # Get character information from selected images
        selected_images = ImageAnalysis.query.filter(ImageAnalysis.id.in_(selected_image_ids)).all()
        if not selected_images:
            return jsonify({'error': 'Selected images not found'}), 404

        # Use the first selected character as the main character
        main_character = selected_images[0]
        character_info = {
            'name': main_character.analysis_result.get('name', ''),
            'traits': main_character.character_traits,
            'description': main_character.analysis_result.get('style', '')
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
        
        # Generate Instagram caption with hashtags
        caption = generate_instagram_post(analysis)
        
        return jsonify({
            'success': True,
            'caption': caption,
            'analysis': analysis
        })
    
    except Exception as e:
        logger.error(f"Error generating post: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)