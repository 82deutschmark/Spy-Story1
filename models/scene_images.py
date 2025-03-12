
from models.base import db
from sqlalchemy.dialects.postgresql import JSONB

class SceneImages(db.Model):
    """Model for storing scene images"""
    __tablename__ = 'scene_images'
    
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(1024), nullable=False)
    image_width = db.Column(db.Integer)
    image_height = db.Column(db.Integer)
    image_format = db.Column(db.String(50))
    image_size_bytes = db.Column(db.Integer)
    image_type = db.Column(db.String(50), default='scene', index=True)
    analysis_result = db.Column(JSONB)
    name = db.Column(db.String(255))
    
    # Scene specific fields
    scene_type = db.Column(db.String(100))
    setting = db.Column(db.String(255))
    setting_description = db.Column(db.Text)
    story_fit = db.Column(JSONB)
    dramatic_moments = db.Column(JSONB)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.now())
    
    def __repr__(self):
        return f'<SceneImages {self.id}: {self.name}>'
