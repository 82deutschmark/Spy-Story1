"""
plot.py - Plot Arc Management System
================================

This module defines the PlotArc model for managing story arcs and narrative
progression in the interactive spy story system. It handles the branching
narrative structure and tracks player progress through different storylines.

Key Features:
-----------
1. Story arc tracking and management
2. Progress and completion criteria
3. Branching narrative support
4. Character involvement tracking
5. Reward management
6. Story integration

Database Schema:
-------------
Table: plot_arc
- Primary key: id
- Required fields: title, story_id
- Foreign keys: story_id
- Status tracking: status, completion_criteria, progress_markers
- Story structure: key_nodes, branching_choices
- Character tracking: primary_characters
- Reward tracking: rewards
- Timestamps: created_at, updated_at

Arc Types:
--------
- main: Primary story arcs
- side: Optional side quests
- character: Character-focused storylines
- mission: Mission-specific arcs

Arc Status Values:
---------------
- active: Currently in progress
- completed: Successfully finished
- failed: Failed or abandoned

Usage Notes:
----------
1. Maintain proper story relationships
2. Track progress through markers
3. Handle branching narratives
4. Manage character involvement
5. Process rewards on completion
"""

from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

class PlotArc(db.Model):
    """
    Model for tracking and managing story plot arcs.
    
    This model represents individual narrative arcs within the story,
    managing progression, branching paths, and character involvement.
    
    Attributes:
        id (int): Primary key
        title (str): Arc title/name
        description (str): Detailed arc description
        arc_type (str): Type of arc (main/side/character/mission)
        story_id (int): Associated story ID
        status (str): Current arc status (active/completed/failed)
        completion_criteria (JSONB): Conditions to complete the arc
        progress_markers (JSONB): Key progress points [default: []]
        key_nodes (JSONB): Important story node IDs [default: []]
        branching_choices (JSONB): Critical choice points [default: []]
        primary_characters (JSONB): Character IDs involved [default: []]
        rewards (JSONB): Completion rewards
        created_at (datetime): Arc creation timestamp
        updated_at (datetime): Last update timestamp
        
    Relationships:
        story (StoryGeneration): Associated story instance
        
    Notes:
        - Track progress through markers
        - Manage branching narrative paths
        - Handle character involvement
        - Process rewards on completion
    """
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
