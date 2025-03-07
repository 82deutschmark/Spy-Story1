
from database import db
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, ForeignKey, Table, Boolean, ARRAY
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
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    stories = relationship('StoryGeneration', secondary=story_images, back_populates='images')
    story_nodes = relationship('StoryNode', back_populates='image')
    
    def __repr__(self):
        return f'<ImageAnalysis id={self.id}, type={self.image_type}>'

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
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
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
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f'<AIInstruction id={self.id}, name={self.name}>'

# Add the missing models required by unity_routes.py
class StoryNode(db.Model):
    """Model for storing nodes in a branching story"""
    __tablename__ = 'story_node'
    
    id = Column(Integer, primary_key=True)
    narrative_text = Column(Text, nullable=False)
    branch_metadata = Column(JSON)
    is_endpoint = Column(Boolean, default=False)
    
    # Foreign keys
    parent_node_id = Column(Integer, ForeignKey('story_node.id'), nullable=True)
    image_id = Column(Integer, ForeignKey('image_analysis.id'), nullable=True)
    
    # Relationships
    parent_node = relationship('StoryNode', remote_side=[id], backref='child_nodes')
    image = relationship('ImageAnalysis', back_populates='story_nodes')
    choices = relationship('StoryChoice', back_populates='node', cascade='all, delete-orphan')
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f'<StoryNode id={self.id}>'

class StoryChoice(db.Model):
    """Model for storing choices between story nodes"""
    __tablename__ = 'story_choice'
    
    id = Column(Integer, primary_key=True)
    choice_text = Column(String(500), nullable=False)
    consequence = Column(String(500))
    
    # Foreign keys
    node_id = Column(Integer, ForeignKey('story_node.id'), nullable=False)
    next_node_id = Column(Integer, ForeignKey('story_node.id'), nullable=True)
    character_id = Column(Integer, ForeignKey('image_analysis.id'), nullable=True)
    
    # Relationships
    node = relationship('StoryNode', foreign_keys=[node_id], back_populates='choices')
    next_node = relationship('StoryNode', foreign_keys=[next_node_id])
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f'<StoryChoice id={self.id}, node_id={self.node_id}>'

class UserProgress(db.Model):
    """Model for storing user progress through the story"""
    __tablename__ = 'user_progress'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(100), nullable=False, unique=True)
    current_node_id = Column(Integer, ForeignKey('story_node.id'), nullable=True)
    choice_history = Column(JSON, default=list)
    achievements_earned = Column(JSON, default=list)
    game_state = Column(JSON)
    
    # Relationships
    current_node = relationship('StoryNode')
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    last_updated = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f'<UserProgress user_id={self.user_id}>'

class Achievement(db.Model):
    """Model for storing achievements that can be unlocked"""
    __tablename__ = 'achievement'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    points = Column(Integer, default=10)
    criteria = Column(JSON)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f'<Achievement id={self.id}, name={self.name}>'
