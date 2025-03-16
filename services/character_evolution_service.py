"""
Character Evolution Service for Spy Story Game
===========================================

This module manages the dynamic evolution of characters in the spy story game,
handling character relationships, trait development, and story-driven changes.
It ensures characters feel alive and responsive to player actions and story events.

Key Features:
------------
- Dynamic character trait evolution based on story events
- Complex relationship network management
- Character role progression tracking
- Story-driven personality development
- Interaction history logging

The service ensures:
1. Characters evolve meaningfully based on story choices
2. Relationships between characters are realistic and consequential
3. Character development affects future missions and story options
4. All changes are properly tracked and persisted

Character Roles:
-------------
- villain: Antagonist characters
- neutral: Supporting characters
- mission-giver: Quest/mission providers
- undetermined: Role not yet assigned

Dependencies:
------------
- Database models (CharacterEvolution, Character)
- Story progression system
- Mission system for character roles
"""

import logging
from datetime import datetime
from typing import Dict, Any
from database import db
from models import CharacterEvolution

logger = logging.getLogger(__name__)


def evolve_character_traits(char_evolution_id: int, story_context: str) -> bool:
    """
    Evolve a character's traits based on story events and player interactions.
    
    This function:
    1. Updates character traits based on story decisions
    2. Logs character development history
    3. Ensures consistent character progression
    4. Maintains character authenticity in the spy narrative

    Args:
        char_evolution_id (int): ID of the character evolution record
        story_context (str): Recent story events affecting the character

    Returns:
        bool: True if character evolution was successful

    Example:
        >>> evolve_character_traits(42, "Agent showed mercy to the target")
        True  # Character might become more compassionate
    """
    try:
        char_evolution = CharacterEvolution.query.get(char_evolution_id)
        if not char_evolution:
            logger.error(f"[Evolve] Character evolution record {char_evolution_id} not found.")
            return False

        # Verify character exists in characters table
        from models.character_data import Character
        character = Character.query.get(char_evolution.character_id)
        if not character:
            logger.error(f"[Evolve] Character with ID {char_evolution.character_id} not found in characters table.")
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
    Update the complex web of relationships between characters in the spy story.
    
    This function manages:
    1. Bilateral relationship changes (both characters are affected)
    2. Relationship strength tracking (-10 to 10 scale)
    3. Impact on future story options and missions
    4. Relationship history logging

    Args:
        user_id (int): ID of the player
        story_id (int): Current story segment ID
        protagonist_id (int): Player character's ID
        relationship_changes (dict): Mapping of character IDs to relationship changes:
            {
                "character_id": {
                    "strength": float,  # -10 to 10 scale
                    "inverse_strength": Optional[float],  # How they feel about protagonist
                }
            }

    Returns:
        bool: True if relationships were successfully updated

    Example:
        >>> changes = {"42": {"strength": 5}}  # Positive relationship change
        >>> update_character_relationships(1, 1, 1, changes)
        True  # Character 42 becomes more friendly
    """
    try:
        char_evolutions = CharacterEvolution.query.filter_by(
            user_id=user_id,
            story_id=story_id
        ).all()

        char_map = {str(ce.character_id): ce for ce in char_evolutions}
        logger.debug(f"[Relationships] Found {len(char_map)} character evolution records for user {user_id}, story {story_id}.")

        # Helper to update both sides of the relationship
        def _update_relationship(from_ce, to_id, strength):
            from_ce.add_relationship(
                target_character_id=to_id,
                strength=strength
            )
            logger.debug(f"[Relationships] Updated {from_ce.character_id} -> {to_id} with strength {strength}.")

        # Update relationships
        for target_id, change_data in relationship_changes.items():
            if target_id not in char_map:
                logger.warning(f"[Relationships] Target character {target_id} not found in evolution records.")
                continue

            target_ce = char_map[target_id]

            # Get relationship details
            strength = change_data.get('strength', 0)

            # Update relationship from protagonist to target
            if str(protagonist_id) in char_map:
                protag_ce = char_map[str(protagonist_id)]
                _update_relationship(protag_ce, target_id, strength)

            # Update relationship from target to protagonist (may be different)
            inverse_strength = change_data.get('inverse_strength', strength)
            _update_relationship(target_ce, protagonist_id, inverse_strength)

        db.session.commit()
        logger.info(f"[Relationships] Successfully updated relationships for user {user_id}, story {story_id}.")
        return True

    except Exception as e:
        logger.error(f"[Relationships] Error updating character relationships: {str(e)}", exc_info=True)
        db.session.rollback()
        return False

def create_character_evolution(user_id: int, character_id: int, story_id: int, role: str = None, traits: Dict[str, Any] = None):
    """
    Initialize character evolution tracking for a new character in the story.
    
    This function:
    1. Sets up initial character state
    2. Establishes baseline relationships
    3. Initializes trait tracking
    4. Prepares evolution history logging

    Args:
        user_id (int): ID of the player
        character_id (int): ID of the character to track
        story_id (int): Current story segment ID
        role (str, optional): Initial character role ('villain', 'neutral', 'mission-giver', 'undetermined')
        traits (Dict[str, Any], optional): Initial character traits and values

    Returns:
        CharacterEvolution: New character evolution record

    Raises:
        ValueError: If character_id is invalid or character doesn't exist
    """
    if not character_id:
        raise ValueError("Missing required character_id")

    # Check if character exists using the Character model
    from models.character import Character
    character = Character.query.get(character_id)
    if not character:
        raise ValueError(f"Character with ID {character_id} not found")