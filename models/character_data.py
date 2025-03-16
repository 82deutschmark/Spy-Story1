"""
character_data.py - Character Data Model
====================================

This module defines the base Character model for storing core character information
and attributes in the interactive spy story system. Character evolution and
progression are handled separately in the CharacterEvolution model (character.py).

Key Features:
-----------
1. Core character attributes storage
2. Image and visual representation
3. Character traits and roles
4. Plot line associations
5. Character backstory and description
6. Timestamp tracking

Database Schema:
-------------
Table: characters
- Primary key: id
- Required fields: image_url, character_name
- JSON fields: character_traits, plot_lines
- Text fields: backstory, description
- Timestamps: created_at, updated_at

Character Roles:
-------------
- villain: Antagonist characters
- neutral: Supporting characters
- mission-giver: Quest/mission providers
- undetermined: Role not yet assigned

Usage Notes:
----------
1. Always validate character_role against allowed values
2. Ensure image_url is accessible and valid
3. Use JSONB fields appropriately for traits and plot lines
4. Maintain proper relationship with stories through story_characters table
"""

from models.base import db
from sqlalchemy.dialects.postgresql import JSONB
from .stories import story_characters

class Character(db.Model):
    """
    Model for storing core character data and attributes.
    
    This model represents the static/base information about a character,
    while dynamic attributes and progression are handled by CharacterEvolution.
    
    Attributes:
        id (int): Primary key
        image_url (str): URL to character's visual representation
        character_name (str): Character's display name
        character_traits (JSONB): List of character's personality traits
        character_role (str): Role in story (villain/neutral/mission-giver/undetermined)
        plot_lines (JSONB): Associated plot lines and story arcs
        backstory (str): Character's background story
        description (str): Brief character description
        created_at (datetime): Character creation timestamp
        updated_at (datetime): Last update timestamp
        stories (relationship): Stories this character appears in (from story_characters)
    
    Relationships:
        - Many-to-Many with StoryGeneration through story_characters
        - One-to-Many with CharacterEvolution (defined in character.py)
        - One-to-Many with StoryNode (through character_id)
    """
    __tablename__ = 'characters'

    # Core fields
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(1024), nullable=False)
    character_name = db.Column(db.String(255), nullable=False)
    
    # Character attributes
    character_traits = db.Column(JSONB)  # List of personality traits
    character_role = db.Column(db.String(100))  # villain/neutral/mission-giver/undetermined
    plot_lines = db.Column(JSONB)  # Associated plot lines and story arcs
    
    # Descriptive fields
    backstory = db.Column(db.Text)
    description = db.Column(db.Text)

    # Timestamps
    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    def __repr__(self):
        """String representation of the character"""
        return f'<Character {self.id}: {self.character_name}>'