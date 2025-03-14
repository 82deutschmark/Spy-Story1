"""
Base Character Model
Stores core character information and attributes.
Character evolution/progression is handled by CharacterEvolution in character.py
"""

from models.base import db
from sqlalchemy.dialects.postgresql import JSONB
from .stories import story_characters
from datetime import datetime

class Character(db.Model):
    """Model for storing character data"""
    __tablename__ = 'characters'

    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(1024), nullable=False)
    character_name = db.Column(db.String(255), nullable=False)
    character_traits = db.Column(JSONB)
    character_role = db.Column(db.String(100))
    plot_lines = db.Column(JSONB)
    backstory = db.Column(db.Text)
    description = db.Column(db.Text)

    # Additional fields migrated from ImageAnalysis
    analysis_result = db.Column(JSONB)  # Store AI analysis results
    personality_traits = db.Column(JSONB)  # Additional personality data
    setting_description = db.Column(db.Text)  # For scene-related context
    dramatic_moments = db.Column(JSONB)  # Key story moments
    image_width = db.Column(db.Integer)  # Image dimensions
    image_height = db.Column(db.Integer)
    image_type = db.Column(db.String(50), default='character')  # Type identifier

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    stories = db.relationship('StoryGeneration', secondary=story_characters,
                            backref=db.backref('characters', lazy='dynamic'))
    evolutions = db.relationship('CharacterEvolution', backref='character', lazy='dynamic')

    def __repr__(self):
        return f'<Character {self.id}: {self.character_name}>'

    @property
    def name(self):
        """Compatibility property for templates still using 'name'"""
        return self.character_name