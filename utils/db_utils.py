import logging
from typing import List, Dict, Any, Optional, Tuple, Union
from database import db
from models import ImageAnalysis, StoryGeneration, UserProgress, Transaction

# Configure logging
logger = logging.getLogger(__name__)

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

def get_or_create_user_progress(user_id: str, protagonist_name: str = None) -> UserProgress:
    """
    Get an existing user progress record or create a new one.

    Args:
        user_id: The session or user identifier
        protagonist_name: Optional name of the protagonist to associate with this user

    Returns:
        UserProgress object for the user
    """
    from models import UserProgress
    import logging

    logger = logging.getLogger(__name__)

    # Try to find existing user progress
    user_progress = UserProgress.query.filter_by(user_id=user_id).first()

    # If user progress exists, update protagonist name if needed
    if user_progress:
        logger.debug(f"Found existing user progress for ID: {user_id}")

        # Update protagonist name if provided and it's different
        if protagonist_name and user_progress.protagonist_name != protagonist_name:
            user_progress.protagonist_name = protagonist_name
            from database import db
            db.session.commit()
            logger.debug(f"Updated protagonist name to: {protagonist_name}")

        return user_progress

    # Create new user progress with default values
    logger.debug(f"Creating new user progress for ID: {user_id}")
    user_progress = UserProgress(
        user_id=user_id,
        currency_balances={
            "💎": 500,  # Diamonds
            "💷": 5000,  # Pounds
            "💶": 5000,  # Euros
            "💴": 5000,  # Yen
            "💵": 5000,  # Dollars
        }
    )

    # If protagonist name is provided, record it
    if protagonist_name:
        user_progress.protagonist_name = protagonist_name
        logger.debug(f"Set protagonist name to: {protagonist_name}")

    # Save to database
    from database import db
    db.session.add(user_progress)
    db.session.commit()
    logger.debug(f"Created user progress with initial balances: {user_progress.currency_balances}")

    return user_progress

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

def get_image_by_id(image_id: int, with_stories: bool = False) -> Optional[ImageAnalysis]:
    """
    Get an image by ID with option to load related stories.

    Args:
        image_id: Image ID
        with_stories: Whether to eagerly load related stories

    Returns:
        ImageAnalysis object or None if not found
    """
    try:
        if with_stories:
            return ImageAnalysis.query.options(db.joinedload(ImageAnalysis.stories)).get(image_id)
        else:
            return ImageAnalysis.query.get(image_id)
    except Exception as e:
        logger.error(f"Error getting image {image_id}: {str(e)}")
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
        entity_type: Type of entity ('image', 'story', etc.)
        entity_id: Entity ID

    Returns:
        Tuple of (success, message)
    """
    try:
        if entity_type == 'image':
            image = ImageAnalysis.query.get(entity_id)
            if not image:
                return False, f"Image with ID {entity_id} not found"

            # Remove associations with stories
            for story in image.stories:
                story.images.remove(image)

            db.session.delete(image)
            if safe_commit():
                return True, f"Image {entity_id} deleted successfully"
            else:
                return False, f"Error deleting image {entity_id}"

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