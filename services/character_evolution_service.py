
import logging
from datetime import datetime
from typing import Dict, Any
from database import db
from models import CharacterEvolution

logger = logging.getLogger(__name__)


def evolve_character_traits(char_evolution_id: int, story_context: str) -> bool:
    """
    Update character traits based on the story context.

    Args:
        char_evolution_id (int): ID of the character evolution record.
        story_context (str): Text describing the current story context.

    Returns:
        bool: True if update was successful, False otherwise.
    """
    try:
        char_evolution = CharacterEvolution.query.get(char_evolution_id)
        if not char_evolution:
            logger.error(f"[Evolve] Character evolution record {char_evolution_id} not found.")
            return False

        # Ensure evolution_log is a list
        if not isinstance(char_evolution.evolution_log, list):
            char_evolution.evolution_log = []

        # Append new interaction log
        log_entry = {
            "type": "story_interaction",
            "context": story_context[:100] + "...",  # Truncate for preview
            "timestamp": datetime.utcnow().isoformat()
        }
        char_evolution.evolution_log.append(log_entry)
        logger.debug(f"[Evolve] Appended to evolution_log for CharacterEvolution {char_evolution_id}: {log_entry}")

        # Update timestamp
        char_evolution.last_updated = datetime.utcnow()
        db.session.commit()
        logger.info(f"[Evolve] CharacterEvolution {char_evolution_id} updated successfully.")
        return True

    except Exception as e:
        logger.error(f"[Evolve] Error evolving character traits for {char_evolution_id}: {str(e)}", exc_info=True)
        db.session.rollback()
        return False


def update_character_relationships(
    user_id: int,
    story_id: int,
    protagonist_id: int,
    relationship_changes: Dict[str, Dict[str, Any]]
) -> bool:
    """
    Update relationship network between characters.

    Args:
        user_id (int): User ID.
        story_id (int): Current story ID.
        protagonist_id (int): Character ID of the protagonist.
        relationship_changes (dict): Dict mapping character IDs to relationship change values.

    Returns:
        bool: True if relationships were updated successfully, False otherwise.
    """
    try:
        char_evolutions = CharacterEvolution.query.filter_by(
            user_id=user_id,
            story_id=story_id
        ).all()

        char_map = {str(ce.character_id): ce for ce in char_evolutions}
        logger.debug(f"[Relationships] Found {len(char_map)} character evolution records for user {user_id}, story {story_id}.")

        # Helper to update both sides of the relationship
        def _update_relationship(from_ce, to_id, rel_type, strength):
            from_ce.add_relationship(
                target_character_id=to_id,
                relationship_type=rel_type,
                strength=strength
            )
            logger.debug(f"[Relationships] Updated {from_ce.character_id} -> {to_id} with type '{rel_type}' and strength {strength}.")

        # Update relationships
        for target_id, change_data in relationship_changes.items():
            if target_id not in char_map:
                logger.warning(f"[Relationships] Target character {target_id} not found in evolution records.")
                continue

            target_ce = char_map[target_id]
            
            # Get relationship details
            rel_type = change_data.get('type', 'neutral')
            strength = change_data.get('amount', 0)
            
            # Update relationship from protagonist to target
            if str(protagonist_id) in char_map:
                protag_ce = char_map[str(protagonist_id)]
                _update_relationship(protag_ce, target_id, rel_type, strength)
            
            # Update relationship from target to protagonist (may be different)
            inverse_strength = change_data.get('inverse_amount', strength)
            inverse_type = change_data.get('inverse_type', rel_type)
            _update_relationship(target_ce, protagonist_id, inverse_type, inverse_strength)
            
        db.session.commit()
        logger.info(f"[Relationships] Successfully updated relationships for user {user_id}, story {story_id}.")
        return True
    
    except Exception as e:
        logger.error(f"[Relationships] Error updating character relationships: {str(e)}", exc_info=True)
        db.session.rollback()
        return False
