"""
db_utils.py - Database Utility Functions
===================================

!!! IMPORTANT - READ BEFORE MODIFYING !!!
This module provides critical database operations and utilities.
Changes here affect data integrity and persistence across all features.

Key Features:
------------
- User progress management
- Transaction processing
- Character data operations
- Story state persistence
- Mission tracking
- Relationship management

Database Models:
-------------
- UserProgress: User state and progress
- Character: Character information
- StoryGeneration: Story content
- Transaction: Currency operations
- PlotArc: Story progression
- Mission: Mission tracking
- CharacterEvolution: Character development

Operation Types:
-------------
1. User Operations:
   - Progress tracking
   - State management
   - Session handling

2. Story Operations:
   - Content storage
   - State persistence
   - Choice tracking

3. Character Operations:
   - Data management
   - Relationship tracking
   - Evolution handling

Usage Guidelines:
---------------
1. ALWAYS use transactions
2. Handle concurrent access
3. Validate before writes
4. Maintain referential integrity
5. Log database operations

Error Handling:
------------
1. Connection failures
2. Transaction rollbacks
3. Constraint violations
4. Deadlock detection
5. Timeout handling

Integration Points:
----------------
- SQLAlchemy ORM
- Flask application
- Story generation
- User management
- Mission system

Performance Notes:
---------------
1. Use appropriate indexes
2. Optimize queries
3. Handle large datasets
4. Manage connection pool
5. Monitor query times
"""

import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from flask import session
import uuid
from sqlalchemy.exc import SQLAlchemyError

from database import db
from models import Character, SceneImages, StoryGeneration, Transaction, UserProgress #UserProgress added here

# Configure logging
logger = logging.getLogger(__name__)

def get_or_create_user_progress(user_id=None, protagonist_name=None):
    """
    Get or create user progress record for the current session.
    Uses user_id from session and protagonist_name for identification.
    """
    if not user_id and 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        logger.debug(f"Created new user session with ID: {session['user_id']}")
        user_id = session['user_id']
    elif not user_id:
        user_id = session['user_id']

    # Find user by user_id first
    user_progress = UserProgress.query.filter_by(user_id=user_id).first()

    # If no user found and protagonist name is provided, try to find by protagonist name
    if not user_progress and protagonist_name:
        # Find user progress with matching protagonist name from game_state
        user_progress = UserProgress.query.filter(
            UserProgress.game_state.has_key('protagonist_name')
        ).filter(
            UserProgress.game_state['protagonist_name'].astext == protagonist_name
        ).first()

        # If found by protagonist name, update the user_id to the session user_id
        if user_progress:
            logger.info(f"Found user progress by protagonist name: {protagonist_name}")
            # Update user_id to match current session
            user_progress.user_id = user_id
            db.session.commit()

    # If still no user progress, create a new one
    if not user_progress:
        logger.debug(f"Creating new user progress for ID: {user_id}")
        user_progress = UserProgress(
            user_id=user_id,
            currency_balances={
                "💎": 550,  # Diamonds
                "💷": 5000,  # Pounds
                "💶": 5000,  # Euros
                "💴": 5000,  # Yen
                "💵": 5000,  # Dollars
            }
        )

        # If protagonist name is provided, add it to game_state
        if protagonist_name:
            if not user_progress.game_state:
                user_progress.game_state = {}
            user_progress.game_state['protagonist_name'] = protagonist_name

        db.session.add(user_progress)
        db.session.commit()
        logger.debug(f"Created user progress with initial balances: {user_progress.currency_balances}")
    else:
        logger.debug(f"Found existing user progress for ID: {user_id}")

    return user_progress

def safe_commit() -> bool:
    """
    Safely commit database changes with error handling and rollback.

    Returns:
        True if commit succeeded, False otherwise
    """
    try:
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        logger.error(f"Database commit error: {str(e)}")
        return False

def record_currency_transaction(
    user_id: str,
    transaction_type: str,
    from_currency: Optional[str] = None,
    to_currency: Optional[str] = None,
    amount: int = 0,
    description: str = "",
    related_id: Optional[int] = None
) -> bool:
    """
    Record a currency transaction in the database.

    Args:
        user_id: User ID
        transaction_type: Type of transaction (trade, purchase, reward, etc.)
        from_currency: Source currency (if applicable)
        to_currency: Destination currency (if applicable)
        amount: Amount of currency
        description: Transaction description
        related_id: ID of related entity (mission, story, etc.)

    Returns:
        True if transaction was recorded successfully, False otherwise
    """
    try:
        transaction = Transaction(
            user_id=user_id,
            transaction_type=transaction_type,
            from_currency=from_currency,
            to_currency=to_currency,
            amount=amount,
            description=description,
            related_id=related_id
        )
        db.session.add(transaction)
        return safe_commit()
    except Exception as e:
        logger.error(f"Error recording transaction: {str(e)}")
        return False

def get_character_by_id(image_id: int, with_stories: bool = False) -> Optional[Character]:
    """
    Get a character by ID with option to load related stories.

    Args:
        image_id: Character ID
        with_stories: Whether to eagerly load related stories

    Returns:
        Character object or None if not found
    """
    try:
        if with_stories:
            return Character.query.options(db.joinedload(Character.stories)).get(image_id)
        else:
            return Character.query.get(image_id)
    except Exception as e:
        logger.error(f"Error getting character {image_id}: {str(e)}")
        return None

def get_scene_by_id(image_id: int, with_stories: bool = False) -> Optional[SceneImages]:
    """
    Get a scene image by ID with option to load related stories.

    Args:
        image_id: Scene image ID
        with_stories: Whether to eagerly load related stories

    Returns:
        SceneImages object or None if not found
    """
    try:
        if with_stories:
            return SceneImages.query.options(db.joinedload(SceneImages.stories)).get(image_id)
        else:
            return SceneImages.query.get(image_id)
    except Exception as e:
        logger.error(f"Error getting scene {image_id}: {str(e)}")
        return None

def get_story_by_id(story_id: int, with_images: bool = False) -> Optional[StoryGeneration]:
    """
    Get a story by ID with option to load related images.

    Args:
        story_id: Story ID
        with_images: Whether to eagerly load related images

    Returns:
        StoryGeneration object or None if not found
    """
    try:
        if with_images:
            return StoryGeneration.query.options(db.joinedload(StoryGeneration.images)).get(story_id)
        else:
            return StoryGeneration.query.get(story_id)
    except Exception as e:
        logger.error(f"Error getting story {story_id}: {str(e)}")
        return None

def delete_entity(entity_type: str, entity_id: int) -> Tuple[bool, str]:
    """
    Safely delete an entity from the database with appropriate relationship handling.

    Args:
        entity_type: Type of entity ('character', 'scene', 'story', etc.)
        entity_id: Entity ID

    Returns:
        Tuple of (success, message)
    """
    try:
        if entity_type == 'character':
            character = Character.query.get(entity_id)
            if not character:
                return False, f"Character with ID {entity_id} not found"

            # Remove associations with stories
            for story in character.stories:
                story.characters.remove(character)

            db.session.delete(character)
            if safe_commit():
                return True, f"Character {entity_id} deleted successfully"
            else:
                return False, f"Error deleting character {entity_id}"

        elif entity_type == 'scene':
            scene = SceneImages.query.get(entity_id)
            if not scene:
                return False, f"Scene with ID {entity_id} not found"

            # Remove associations with stories
            for story in scene.stories:
                story.images.remove(scene)

            db.session.delete(scene)
            if safe_commit():
                return True, f"Scene {entity_id} deleted successfully"
            else:
                return False, f"Error deleting scene {entity_id}"

        elif entity_type == 'story':
            story = StoryGeneration.query.get(entity_id)
            if not story:
                return False, f"Story with ID {entity_id} not found"

            db.session.delete(story)
            if safe_commit():
                return True, f"Story {entity_id} deleted successfully"
            else:
                return False, f"Error deleting story {entity_id}"

        else:
            return False, f"Unsupported entity type: {entity_type}"

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting {entity_type} {entity_id}: {str(e)}")
        return False, str(e)