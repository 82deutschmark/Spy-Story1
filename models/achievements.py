"""
achievements.py - Achievement System Model
====================================

This module defines the Achievement model for tracking player accomplishments
and rewards in the interactive spy story system.

Key Features:
-----------
1. Achievement tracking and criteria
2. Point-based reward system
3. Flexible achievement conditions
4. Story node integration
5. Progress tracking

Database Schema:
-------------
Table: achievement
- Primary key: id
- Required fields: name
- JSON fields: criteria
- Metadata: points, created_at
- Text fields: description

Achievement Types:
--------------
- Story Progression: Complete story arcs
- Character Development: Build relationships
- Mission Success: Complete missions
- Collection: Gather items/currency
- Special Events: Unique accomplishments

Usage Notes:
----------
1. Define clear achievement criteria
2. Balance point rewards
3. Track achievement progress
4. Integrate with story nodes
"""

from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

class Achievement(db.Model):
    """
    Model for tracking player achievements and rewards.
    
    This model represents individual achievements that players can unlock
    through various actions and progress in the game.
    
    Attributes:
        id (int): Primary key
        name (str): Achievement name/title
        description (str): Detailed achievement description
        criteria (JSONB): Conditions required to unlock achievement
        points (int): Points awarded for unlocking
        created_at (datetime): Achievement creation timestamp
        story_nodes (relationship): Story nodes that can trigger this achievement
    
    Relationships:
        - One-to-Many with StoryNode (through achievement_id)
        
    Notes:
        - Criteria should be clearly defined in JSONB format
        - Points should be balanced with achievement difficulty
        - Track unlock conditions through story progression
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    criteria = db.Column(JSONB)  # Achievement unlock conditions
    points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
