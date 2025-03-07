from database import db
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from typing import List, Dict, Any, Optional

# Association table for the many-to-many relationship between StoryGeneration and ImageAnalysis
story_images = Table(
    'story_images',
    db.metadata,
    Column('story_id', Integer, ForeignKey('story_generation.id'), primary_key=True),
    Column('image_id', Integer, ForeignKey('image_analysis.id'), primary_key=True)
)

class ImageAnalysis(db.Model):
    """Model for storing image analysis results"""
    __tablename__ = 'image_analysis'

    id = Column(Integer, primary_key=True)
    image_url = Column(String(500), nullable=False)
    image_type = Column(String(50), default='unknown')  # 'character', 'scene', etc.
    analysis_result = Column(JSON)

    # Character-specific fields
    character_name = Column(String(100))
    character_role = Column(String(50))  # 'protagonist', 'antagonist', 'neutral', etc.
    character_traits = Column(JSON)
    plot_lines = Column(JSON)

    # Scene-specific fields
    scene_type = Column(String(50))  # 'action', 'narrative', 'choice', 'conclusion', etc.
    setting = Column(String(100))
    dramatic_moments = Column(JSON)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    stories = relationship('StoryGeneration', secondary=story_images, back_populates='images')
    story_nodes = relationship('StoryNode', back_populates='image')

    def __repr__(self):
        return f'<ImageAnalysis id={self.id}, type={self.image_type}>'

class StoryNode(db.Model):
    """Model for storing nodes in a branching story"""
    __tablename__ = 'story_node'

    id = Column(Integer, primary_key=True)
    narrative_text = Column(Text, nullable=False)
    is_endpoint = Column(Boolean, default=False)
    generated_by_ai = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    achievement_id = Column(Integer, ForeignKey('achievement.id'))  # Link to achievement
    branch_metadata = Column(JSON)  # Store branch-specific metadata
    parent_node_id = Column(Integer, ForeignKey('story_node.id'))  # Track story hierarchy

    # Relationship with ImageAnalysis
    image_id = Column(Integer, ForeignKey('image_analysis.id'))
    image = relationship('ImageAnalysis', back_populates='story_nodes')

    # Relationship with Achievement
    achievement = relationship('Achievement', backref='story_nodes')

    # Self-referential relationship for story hierarchy
    parent_node = relationship('StoryNode', remote_side=[id],
                            backref=db.backref('child_nodes', lazy='dynamic'))

    # Relationship with choices that originate from this node
    choices = relationship('StoryChoice', 
                        backref='source_node',
                        lazy=True,
                        primaryjoin="StoryNode.id == StoryChoice.node_id")

class StoryChoice(db.Model):
    """Model for storing choices between story nodes"""
    __tablename__ = 'story_choice'

    id = Column(Integer, primary_key=True)
    node_id = Column(Integer, ForeignKey('story_node.id'), nullable=False)
    choice_text = Column(String(500), nullable=False)
    next_node_id = Column(Integer, ForeignKey('story_node.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    choice_metadata = Column(JSON)  # Store choice-specific metadata

    # Simple relationship with the next node
    next_node = relationship('StoryNode',
                          foreign_keys=[next_node_id],
                          remote_side=[StoryNode.id])

class UserProgress(db.Model):
    """Model for tracking user progress in stories"""
    __tablename__ = 'user_progress'

    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), nullable=False)  # Can be session ID for anonymous users
    current_node_id = Column(Integer, ForeignKey('story_node.id'))
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    choice_history = Column(JSON)  # Track user's choice history
    achievements_earned = Column(JSON)  # Track earned achievements
    game_state = Column(JSON)  # Store additional game state data

    # Relationship with current node
    current_node = relationship('StoryNode')

class Achievement(db.Model):
    """Model for story achievements"""
    __tablename__ = 'achievement'

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    criteria = Column(JSON)  # Achievement unlock conditions
    points = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class StoryGeneration(db.Model):
    """Model for storing generated stories"""
    __tablename__ = 'story_generation'

    id = Column(Integer, primary_key=True)
    primary_conflict = Column(String(200))
    setting = Column(String(200))
    narrative_style = Column(String(100))
    mood = Column(String(100))
    story_text = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    images = relationship('ImageAnalysis', secondary=story_images, back_populates='stories')

    def __repr__(self):
        return f'<StoryGeneration id={self.id}>'

class AIInstruction(db.Model):
    """Model for storing AI generation instructions"""
    __tablename__ = 'ai_instruction'

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    instruction_text = Column(Text, nullable=False)
    instruction_type = Column(String(50))  # 'character_analysis', 'scene_analysis', 'story_generation', etc.

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f'<AIInstruction id={self.id}, name={self.name}>'