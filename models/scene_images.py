from models.base import db
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime

class SceneImages(db.Model):
    """Model for storing scene images and their metadata."""
    __tablename__ = 'scene_images'
    
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(255), nullable=False)
    image_type = db.Column(db.String(50))  # 'scene', 'character', etc.
    image_width = db.Column(db.Integer)
    image_height = db.Column(db.Integer)
    setting = db.Column(db.String(255))  # Scene setting (previously location)
    setting_description = db.Column(db.Text)  # Scene setting description
    story_fit = db.Column(db.Float)
    dramatic_moments = db.Column(db.JSON)
    analysis_result = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    image_size_bytes = db.Column(db.Integer)
    image_format = db.Column(db.String(50))
    name = db.Column(db.String(255))
    
    # Scene specific fields
    scene_type = db.Column(db.String(100))
    
    def __repr__(self):
        return f'<SceneImages {self.id}: {self.name}>'
