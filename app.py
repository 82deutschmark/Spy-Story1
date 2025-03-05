import os
import logging
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from services.openai_service import analyze_artwork, generate_instagram_post

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")

@app.route('/')
def index():
    return render_template('index.html')

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
