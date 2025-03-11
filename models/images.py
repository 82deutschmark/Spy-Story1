
from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB
import logging

logger = logging.getLogger(__name__)

class ImageAnalysis(db.Model):
    """Model for storing analyzed character or scene images"""
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(1024), nullable=False)
    image_width = db.Column(db.Integer)
    image_height = db.Column(db.Integer)
    image_format = db.Column(db.String(16))
    image_size_bytes = db.Column(db.Integer)
    image_type = db.Column(db.String(32))  # 'character' or 'scene'
    analysis_result = db.Column(JSONB)  # Full analysis from OpenAI
    
    # Character-specific fields
    name = db.Column(db.String(255))  # Primary name field used by the form
    character_name = db.Column(db.String(255))  # Legacy/secondary name field
    character_traits = db.Column(JSONB)  # Array of character traits
    personality_traits = db.Column(JSONB)  # Duplicate of character_traits for compatibility
    character_role = db.Column(db.String(32))  # 'mission-giver', 'villain', or 'neutral'
    role = db.Column(db.String(32))  # Alias for character_role used by the form
    
    # Plot lines
    plot_lines = db.Column(JSONB)  # Array of plot line suggestions
    potential_plot_lines = db.Column(JSONB)  # Duplicate of plot_lines for compatibility
    
    # Character background
    backstory = db.Column(JSONB)  # Array of backstory elements
    
    # Description
    description = db.Column(db.Text)  # Character or scene description
    
    # Scene-specific fields
    scene_type = db.Column(db.String(64))  # E.g., 'narrative', 'choice', 'action'
    setting = db.Column(db.String(255))  # Setting of the scene
    setting_description = db.Column(db.Text)  # Detailed description of the setting
    story_fit = db.Column(db.String(255))  # How well the scene fits in the story
    dramatic_moments = db.Column(JSONB)  # Array of dramatic moments in the scene
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
