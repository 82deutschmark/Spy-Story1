from models.base import db
from sqlalchemy.dialects.postgresql import JSONB
from .stories import story_characters

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

    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    def __repr__(self):
        return f'<Character {self.id}: {self.character_name}>'