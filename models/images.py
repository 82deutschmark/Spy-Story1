
from models.base import db
import json
from sqlalchemy.dialects.postgresql import JSONB
from .stories import story_images

class ImageAnalysis(db.Model):
    """Model for storing image analysis results"""
    __tablename__ = 'image_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(1024), nullable=False)
    image_width = db.Column(db.Integer)
    image_height = db.Column(db.Integer)
    image_format = db.Column(db.String(50))
    image_size_bytes = db.Column(db.Integer)
    image_type = db.Column(db.String(50), index=True)  # 'character', 'scene', etc.
    analysis_result = db.Column(JSONB)
    
    # Add the missing 'name' column
    name = db.Column(db.String(255))
    
    # Character specific fields
    character_name = db.Column(db.String(255))
    character_traits = db.Column(JSONB)
    personality_traits = db.Column(JSONB)
    character_role = db.Column(db.String(100))
    role = db.Column(db.String(100))  # Duplicate of character_role for compatibility
    plot_lines = db.Column(JSONB)
    potential_plot_lines = db.Column(JSONB)
    backstory = db.Column(db.Text)
    description = db.Column(db.Text)
    
    # Scene specific fields
    scene_type = db.Column(db.String(100))
    setting = db.Column(db.String(255))
    setting_description = db.Column(db.Text)
    story_fit = db.Column(JSONB)
    dramatic_moments = db.Column(JSONB)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.now())
    
    # Relationships
    stories = db.relationship('StoryGeneration', secondary=story_images, 
                              backref=db.backref('images', lazy='dynamic'))
    
    def __repr__(self):
        return f'<ImageAnalysis {self.id}: {self.image_type}>'
