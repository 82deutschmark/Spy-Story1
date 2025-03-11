
from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

class PlotArc(db.Model):
    """Model for tracking story plot arcs"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    arc_type = db.Column(db.String(32))  # main, side, character, etc.
    story_id = db.Column(db.Integer, db.ForeignKey('story_generation.id', ondelete='CASCADE'))
    
    # Plot arc status and progress
    status = db.Column(db.String(32), default='active')  # active, completed, failed
    completion_criteria = db.Column(JSONB)  # Criteria to complete this arc
    progress_markers = db.Column(JSONB, default=[])  # Key points in the arc's progress
    
    # Key nodes and choices in this arc
    key_nodes = db.Column(JSONB, default=[])  # List of important node IDs in this arc
    branching_choices = db.Column(JSONB, default=[])  # Important choice points
    
    # Involved characters
    primary_characters = db.Column(JSONB, default=[])  # Character IDs central to this arc
    
    # Rewards for completion
    rewards = db.Column(JSONB)  # Currency, items, achievements, etc.
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    story = db.relationship('StoryGeneration')
