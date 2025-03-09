
from flask import Flask
from database import db
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

# Create database tables
with app.app_context():
    db.create_all()

# Import routes and models AFTER db is initialized to avoid circular imports
from services.openai_service import analyze_artwork, generate_image_description
from services.story_maker import generate_story, get_story_options
from models import AIInstruction, ImageAnalysis, StoryGeneration, StoryNode, StoryChoice, UserProgress, Transaction
from api.unity_routes import unity_api
import routes  # Import all routes

# Register blueprints
app.register_blueprint(unity_api, url_prefix='/api/unity')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
