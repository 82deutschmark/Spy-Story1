
from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

class Achievement(db.Model):
    """Model for story achievements"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    criteria = db.Column(JSONB)  # Achievement unlock conditions
    points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
