"""
Main Web Routes Module
======================

This module handles all web UI routes and template rendering. It manages user sessions
and provides the interactive story experience through HTML templates.

Key Responsibilities:
- Web page rendering with templates
- Session management
- Form handling
- User progress tracking through sessions
- Story state management for web UI
- Character selection interface
- Story progression through web forms

Integration Points:
- Templates: Renders HTML templates from /templates
- Session: Manages Flask session data
- GameEngine: Core game logic but accessed through web context
- Database: Queries through SQLAlchemy models 

Note: This module should NOT be imported by API routes. All shared logic
should go through the GameEngine or other service classes.
"""

import os
import json
import uuid
import sys
from datetime import datetime
from typing import List

from flask import (Blueprint, render_template, request, jsonify, url_for,
                   redirect, flash, session, render_template_string)
import logging

from database import db
from models import (AIInstruction, StoryGeneration, StoryNode, 
                    StoryChoice, UserProgress, Transaction, PlotArc,
                    CharacterEvolution, Mission)
from models.character_data import Character
from models.scene_images import SceneImages
from services.story_maker import generate_story, get_story_options
from services.game_engine import GameEngine
from services.mission_generator import update_mission_progress
from services.state_manager import GameState
from utils.validation_utils import validate_story_parameters, validate_string_length
from utils.currency_utils import process_transaction
from utils.db_utils import get_or_create_user_progress as db_get_or_create_user_progress
from utils.character_manager import get_random_characters
from utils.context_manager import configure_logging

# Set up logging
logger = logging.getLogger(__name__)

def setup_logging() -> None:
    """Configure main routes logging to ensure console visibility."""
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
        root_logger.setLevel(logging.INFO)

    # Configure API libraries for debugging
    logging.getLogger("httpx").setLevel(logging.DEBUG)
    logging.getLogger("openai").setLevel(logging.DEBUG)
    logger.info("Main routes logging configured")

# Initialize logging
setup_logging()
configure_logging()

# Create Blueprint
main_bp = Blueprint('main', __name__)
REQUIRED_ROLES = ['mission-giver', 'villain']


def serialize_character(char: Character, include_backstory: bool = False) -> dict:
    """
    Convert a Character instance into a dictionary suitable for JSON responses or template context.
    """
    role = (char.character_role or 'neutral').lower()
    if role not in ['mission-giver', 'villain', 'neutral', 'undetermined']:
        role = 'neutral'
    data = {
        'id': char.id,
        'image_url': char.image_url,
        'name': char.character_name,
        'story': char.description or '',
        'character_traits': char.character_traits or [],
        'plot_lines': char.plot_lines or [],
        'character_role': role,
        'role': role
    }
    if include_backstory:
        data['backstory'] = getattr(char, 'backstory', "")
    return data


def ensure_branch_metadata(node: StoryNode) -> None:
    """
    Ensure that the current story node has all the default keys in its branch metadata.
    """
    if not node.branch_metadata:
        node.branch_metadata = {
            "choices": {},
            "timestamp": datetime.utcnow().isoformat(),
            "character_relationships": {},
            "active_missions": []
        }
    else:
        node.branch_metadata.setdefault("timestamp", datetime.utcnow().isoformat())
        node.branch_metadata.setdefault("character_relationships", {})
        node.branch_metadata.setdefault("active_missions", [])
        node.branch_metadata.setdefault("choices", {})
    db.session.commit()


def update_choice_character_ids(choices: list, character_images: list) -> None:
    """
    Iterate over branch metadata choices and convert character name to ID if needed.
    Also, append any missing character data to character_images.
    """
    for choice in choices:
        if choice.get('character_id'):
            try:
                character_id = choice['character_id']
                # If character_id is not a valid int, attempt conversion from name
                if not isinstance(character_id, int) and not (
                    isinstance(character_id, str) and character_id.isdigit()
                ):
                    logger.warning(f"Found character name instead of ID in choice: {character_id}")
                    character = Character.query.filter_by(character_name=character_id).first()
                    if character:
                        choice['character_id'] = character.id
                        db.session.commit()
                        logger.info(f"Converted character name '{character_id}' to ID: {character.id}")
                    else:
                        choice['character_id'] = None
                        db.session.commit()
                        logger.warning(f"Character name '{character_id}' not found, setting to None")
                        continue

                # Convert numeric string to integer if necessary
                if isinstance(choice['character_id'], str) and choice['character_id'].isdigit():
                    choice['character_id'] = int(choice['_
