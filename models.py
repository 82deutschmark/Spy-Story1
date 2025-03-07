from datetime import datetime
from app import db
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import JSONB

# Association table for many-to-many relationship between stories and images
story_images = db.Table('story_images',
    db.Column('story_id', db.Integer, db.ForeignKey('story_generation.id'), primary_key=True),
    db.Column('image_id', db.Integer, db.ForeignKey('image_analysis.id'), primary_key=True)
)

class StoryGeneration(db.Model):
    """Model for storing generated story segments and their choices"""
    id = db.Column(db.Integer, primary_key=True)
    primary_conflict = db.Column(db.String(255))
    setting = db.Column(db.String(255))
    narrative_style = db.Column(db.String(255))
    mood = db.Column(db.String(255))
    generated_story = db.Column(JSONB)  # Stores the story text and choices
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Many-to-many relationship with ImageAnalysis
    images = db.relationship('ImageAnalysis', secondary=story_images,
                           backref=db.backref('stories', lazy='dynamic'))

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
    character_traits = db.Column(JSONB)  # Array of character traits if a character
    character_role = db.Column(db.String(32))  # 'hero', 'villain', or 'neutral'
    plot_lines = db.Column(JSONB)  # Array of plot line suggestions for the character
    scene_type = db.Column(db.String(64))  # E.g., 'narrative', 'choice', 'action'
    setting = db.Column(db.String(255))  # Setting of the scene
    setting_description = db.Column(db.Text)  # Detailed description of the setting
    story_fit = db.Column(db.String(255))  # How well the scene fits in the story
    dramatic_moments = db.Column(JSONB)  # Array of dramatic moments in the scene
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AIInstruction(db.Model):
    """Model for storing AI generation parameters and instructions"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    prompt_template = db.Column(db.Text, nullable=False)
    parameters = db.Column(JSONB)  # Stores additional parameters
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Removed HashtagCollection model - no longer needed
