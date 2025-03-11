
import logging
from datetime import datetime
from database import db
from models import CharacterEvolution, ImageAnalysis

logger = logging.getLogger(__name__)

def evolve_character_traits(char_evolution_id, story_context):
    """
    Update character traits based on story context
    
    Args:
        char_evolution_id: ID of the character evolution record
        story_context: Text describing the current story context
    
    Returns:
        Boolean indicating success
    """
    try:
        char_evolution = CharacterEvolution.query.get(char_evolution_id)
        if not char_evolution:
            logger.error(f"Character evolution record {char_evolution_id} not found")
            return False
            
        # This is where we could use AI to analyze the story context and
        # determine what new traits might emerge based on the narrative
        # For now, just track that this story interaction happened
        if not char_evolution.evolution_log:
            char_evolution.evolution_log = []
            
        char_evolution.evolution_log.append({
            "type": "story_interaction",
            "context": story_context[:100] + "...",  # first 100 chars of context
            "timestamp": datetime.utcnow().isoformat()
        })
        
        # Update the last_updated timestamp
        char_evolution.last_updated = datetime.utcnow()
        
        db.session.commit()
        return True
    except Exception as e:
        logger.error(f"Error evolving character traits: {str(e)}")
        db.session.rollback()
        return False
        
def update_character_relationships(user_id, story_id, protagonist_id, relationship_changes):
    """
    Update relationship network between characters
    
    Args:
        user_id: User ID
        story_id: Current story ID
        protagonist_id: Character ID of the protagonist
        relationship_changes: Dict mapping character IDs to relationship change values
    
    Returns:
        Boolean indicating success
    """
    try:
        # Get all character evolutions for this user and story
        char_evolutions = CharacterEvolution.query.filter_by(
            user_id=user_id,
            story_id=story_id
        ).all()
        
        # Create a map of character ID to evolution record for easy lookup
        char_map = {str(ce.character_id): ce for ce in char_evolutions}
        
        # Update relationships
        for target_id, change_data in relationship_changes.items():
            # Skip if we don't have an evolution record for this character
            if target_id not in char_map:
                continue
                
            target_ce = char_map[target_id]
            
            # Default values
            change_amount = change_data.get('amount', 0)
            relationship_type = change_data.get('type', 'neutral')
            
            # Update protagonist's relationship with this character
            if str(protagonist_id) in char_map:
                protag_ce = char_map[str(protagonist_id)]
                protag_ce.add_relationship(
                    target_character_id=target_id,
                    relationship_type=relationship_type,
                    strength=change_amount
                )
            
            # Also update this character's relationship with the protagonist
            target_ce.add_relationship(
                target_character_id=protagonist_id,
                relationship_type=relationship_type,
                strength=change_amount
            )
            
        db.session.commit()
        return True
    except Exception as e:
        logger.error(f"Error updating character relationships: {str(e)}")
        db.session.rollback()
        return False
