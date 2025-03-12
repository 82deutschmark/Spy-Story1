
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

def get_or_create_user_progress(session_user_id: str, protagonist_name: str = None) -> UserProgress:
    """
    Get an existing user progress record or create a new one.
    Can look up by both session ID and protagonist name.
    
    Args:
        session_user_id: User ID from session
        protagonist_name: Optional protagonist name to lookup existing users
        
    Returns:
        UserProgress object
    """
    user_progress = None
    
    # First try to find by session ID
    user_progress = UserProgress.query.filter_by(user_id=session_user_id).first()
    
    # If protagonist name provided and no user found by session ID, try finding by name
    if protagonist_name and (not user_progress or not user_progress.game_state or 
                          user_progress.game_state.get("protagonist_name") != protagonist_name):
        # Look in the game_state JSONB field for protagonist_name
        existing_user = UserProgress.query.filter(
            UserProgress.game_state.contains({"protagonist_name": protagonist_name})
        ).first()
        
        if existing_user and existing_user.id != (user_progress.id if user_progress else None):
            logger.info(f"Found existing user by protagonist name: {protagonist_name}")
            # Update the user_id to match the current session
            # This allows the user to continue their story on a different device/browser
            existing_user.user_id = session_user_id
            if safe_commit():
                return existing_user
    
    # If still no user progress found, create a new one
    if not user_progress:
        logger.debug(f"Creating new user progress for ID: {session_user_id}")
        
        # Initialize game_state with protagonist name if provided
        game_state = {}
        if protagonist_name:
            game_state["protagonist_name"] = protagonist_name
        
        user_progress = UserProgress(
            user_id=session_user_id,
            currency_balances={
                "💎": 500,  # Diamonds
                "💷": 5000,  # Pounds
                "💶": 5000,  # Euros
                "💴": 5000,  # Yen
                "💵": 5000,  # Dollars
            },
            choice_history=[],           # Use choice_history instead of choices_made
            completed_plot_arcs=[],      # Use completed_plot_arcs instead of completed_stories
            active_plot_arcs=[],         # Initialize active_plot_arcs
            game_state=game_state        # Set game_state with protagonist name if available
        )
        db.session.add(user_progress)
        safe_commit()
        logger.debug(f"Created user progress with initial balances: {user_progress.currency_balances}")
    else:
        logger.debug(f"Found existing user progress for ID: {session_user_id}")
        
        # Update protagonist name in game_state if provided and different from current
        if protagonist_name:
            if not user_progress.game_state:
                user_progress.game_state = {}
            user_progress.game_state["protagonist_name"] = protagonist_name
            safe_commit()
        
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
