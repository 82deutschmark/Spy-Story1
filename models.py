
from database import db
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, ForeignKey, Table
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
