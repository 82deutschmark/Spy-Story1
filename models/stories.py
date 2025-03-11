
from datetime import datetime
from .base import db
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

class StoryNode(db.Model):
    """Model for storing individual story nodes in the branching narrative"""
    id = db.Column(db.Integer, primary_key=True)
    narrative_text = db.Column(db.Text, nullable=False)
    image_id = db.Column(db.Integer, db.ForeignKey('image_analysis.id'))
    is_endpoint = db.Column(db.Boolean, default=False)
    generated_by_ai = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'))  # Link to achievement
    branch_metadata = db.Column(JSONB)  # Store branch-specific metadata
    parent_node_id = db.Column(db.Integer, db.ForeignKey('story_node.id'))  # Track story hierarchy

    # Relationship with ImageAnalysis
    image = db.relationship('ImageAnalysis')

    # Relationship with Achievement
    achievement = db.relationship('Achievement', backref='story_nodes')  # 

    # Self-referential relationship for story hierarchy
    parent_node = db.relationship('StoryNode', remote_side=[id],
                                backref=db.backref('child_nodes', lazy='dynamic'))

    # Relationship with choices that originate from this node
    choices = db.relationship('StoryChoice', 
                            backref='source_node',
                            lazy=True,
                            primaryjoin="StoryNode.id == StoryChoice.node_id")

class StoryChoice(db.Model):
    """Model for storing choices that connect story nodes"""
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('story_node.id'), nullable=False)
    choice_text = db.Column(db.String(500), nullable=False)
    next_node_id = db.Column(db.Integer, db.ForeignKey('story_node.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    choice_metadata = db.Column(JSONB)  # Store choice-specific metadata

    # Currency costs for this choice
    currency_requirements = db.Column(JSONB, default={})  # e.g. {"💎": 50, "💷": 1000}

    # Simple relationship with the next node
    next_node = db.relationship('StoryNode',
                              foreign_keys=[next_node_id],
                              remote_side=[StoryNode.id])
