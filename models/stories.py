"""
stories.py - Story Generation and Management Models
===============================================

This module defines the database models for managing story generation,
story nodes, and story choices in the interactive spy story system.

Key Components:
-------------
1. StoryGeneration: Main story container with metadata
2. StoryNode: Individual story segments forming the narrative
3. StoryChoice: Choices connecting different story nodes
4. Association Tables: Manage many-to-many relationships

Database Schema:
-------------
- story_characters: Links stories to characters
- story_generation: Main story table
- story_node: Story segment table
- story_choice: Choice connection table

Relationships:
------------
- Stories <-> Characters (Many-to-Many)
- Nodes -> Choices (One-to-Many)
- Nodes -> Nodes (Self-referential/Tree structure)
- Choices -> Nodes (Many-to-One)

Usage Notes:
----------
1. Always use transactions when creating related records
2. Maintain proper node hierarchy
3. Validate currency requirements
4. Handle JSONB fields appropriately
"""

from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

# Association table for stories and characters
story_characters = db.Table('story_characters',
    db.Column('story_id', db.Integer, db.ForeignKey('story_generation.id'), primary_key=True),
    db.Column('character_id', db.Integer, db.ForeignKey('characters.id'), primary_key=True)
)

class StoryGeneration(db.Model):
    """
    Model for storing generated story segments and their metadata.
    
    This is the main container for a story instance, holding the primary story content
    and associated metadata like conflict, setting, and style.
    
    Attributes:
        id (int): Primary key
        primary_conflict (str): Main conflict driving the story
        setting (str): Story's setting/location
        narrative_style (str): Writing style of the story
        mood (str): Emotional tone of the story
        generated_story (JSONB): Complete story text and choices
        created_at (datetime): Story creation timestamp
        characters (relationship): Characters involved in the story
    """
    id = db.Column(db.Integer, primary_key=True)
    primary_conflict = db.Column(db.String(255))
    setting = db.Column(db.String(255))
    narrative_style = db.Column(db.String(255))
    mood = db.Column(db.String(255))
    generated_story = db.Column(JSONB)  # Stores the story text and choices
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Many-to-many relationship with Character
    characters = db.relationship('Character', secondary=story_characters,
                               backref=db.backref('stories', lazy='dynamic'))

class StoryNode(db.Model):
    """
    Model for storing individual story nodes in the branching narrative.
    
    Each node represents a segment of the story and can be connected to other nodes
    through choices, forming a tree structure of narrative possibilities.
    
    Attributes:
        id (int): Primary key
        narrative_text (str): The actual story content
        image_id (int): Legacy reference to associated image
        character_id (int): Reference to primary character in this node
        is_endpoint (bool): Whether this node ends a story branch
        generated_by_ai (bool): Whether content was AI-generated
        created_at (datetime): Node creation timestamp
        achievement_id (int): Associated achievement if any
        branch_metadata (JSONB): Additional branch-specific data
        parent_node_id (int): Reference to parent node
        character (relationship): Associated character
        achievement (relationship): Associated achievement
        parent_node (relationship): Parent node in story tree
        choices (relationship): Choices leading from this node
        child_nodes (relationship): Nodes branching from this one
    """
    id = db.Column(db.Integer, primary_key=True)
    narrative_text = db.Column(db.Text, nullable=False)
    image_id = db.Column(db.Integer)  # Legacy column, should be phased out
    character_id = db.Column(db.Integer, db.ForeignKey('characters.id'))
    is_endpoint = db.Column(db.Boolean, default=False)
    generated_by_ai = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'))
    branch_metadata = db.Column(JSONB)  # Store branch-specific metadata
    parent_node_id = db.Column(db.Integer, db.ForeignKey('story_node.id'))

    # Relationships
    character = db.relationship('Character')
    achievement = db.relationship('Achievement', backref='story_nodes')
    parent_node = db.relationship('StoryNode', remote_side=[id],
                                backref=db.backref('child_nodes', lazy='dynamic'))
    choices = db.relationship('StoryChoice', 
                            backref='source_node',
                            lazy=True,
                            primaryjoin="StoryNode.id == StoryChoice.node_id")

class StoryChoice(db.Model):
    """
    Model for storing choices that connect story nodes.
    
    Represents the decision points in the story where users can choose
    different paths, potentially requiring currency to unlock.
    
    Attributes:
        id (int): Primary key
        node_id (int): Source node ID
        choice_text (str): The text of the choice
        next_node_id (int): Target node ID
        created_at (datetime): Choice creation timestamp
        choice_metadata (JSONB): Additional choice-specific data
        currency_requirements (JSONB): Required currency to select this choice
        next_node (relationship): The node this choice leads to
    """
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('story_node.id'), nullable=False)
    choice_text = db.Column(db.String(500), nullable=False)
    next_node_id = db.Column(db.Integer, db.ForeignKey('story_node.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    choice_metadata = db.Column(JSONB)  # Store choice-specific metadata
    currency_requirements = db.Column(JSONB, default={})  # e.g. {"💎": 50, "💷": 1000}

    # Relationship with the next node
    next_node = db.relationship('StoryNode',
                              foreign_keys=[next_node_id],
                              remote_side=[StoryNode.id])