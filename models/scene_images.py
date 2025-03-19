"""
Scene Images Model
================

This model manages background scene images for the application.
It is intentionally kept simple and focused only on scene image management.
"""

from models.base import db

class SceneImages(db.Model):
    """Model for storing scene images and their metadata."""
    __tablename__ = 'scene_images'
    
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(255), nullable=False)
    image_type = db.Column(db.String(50))  # 'scene', 'character', etc.
    
    def __repr__(self):
        return f'<SceneImages {self.id}: {self.image_url}>'
