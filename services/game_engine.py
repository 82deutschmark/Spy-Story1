"""
Game Engine for Spy Story Game
=============================

This module implements the core game engine that drives the spy story game.
It handles story progression, mission management, and player interactions.

Key Features:
------------
- Story generation and progression
- Mission management and updates
- Character interaction handling
- Resource management
- State persistence

The engine ensures:
1. Story continuity and coherence
2. Mission progression and rewards
3. Character relationship development
4. Resource balance
5. State consistency

Dependencies:
------------
- Story generation service (story_maker)
- Story continuation service (segment_maker)
- Mission generator service
- Character interaction service
- State manager
- Database models
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from models import UserProgress, StoryGeneration, StoryNode, Mission
from models.character_data import Character
from database import db
from services.story_maker import generate_story, get_openai_client
from services.segment_maker import generate_continuation
from services.mission_generator import (
    generate_mission,
    create_mission_from_story,
    get_user_active_missions,
    update_mission_progress,
    complete_mission,
    fail_mission
)
from services.character_interaction import CharacterInteractionService
from services.state_manager import GameState, state_manager
from utils.context_manager import OpenAIContextManager
import json

logger = logging.getLogger(__name__)

class GameEngine:
    """
    Core game engine that drives the spy story game.
    
    This class manages:
    1. Story progression and generation
    2. Mission management and updates
    3. Character interactions
    4. Resource management
    5. State persistence
    """

    def __init__(self, user_id: str):
        """
        Initialize the game engine for a user.
        
        Args:
            user_id (str): Unique identifier for the user
        """
        self.user_id = user_id
        self.state = GameState(user_id)
        self.character_service = CharacterInteractionService()

    def format_character_data(self, character: Character) -> Dict[str, Any]:
        """
        Format character data with proper role information and NPC marking.
        
        Args:
            character (Character): The character to format
            
        Returns:
            Dict[str, Any]: Formatted character data with role information
        """
        # Get standardized role value
        role = character.character_role or 'neutral'
        if role.lower() not in ['villain', 'neutral', 'mission-giver', 'undetermined']:
            role = 'neutral'
            
        return {
            "character_traits": character.character_traits or {},
            "backstory": character.backstory or "",
            "plot_lines": character.plot_lines or [],
            "role": role,
            "is_npc": True,  # Explicitly mark as NPC
            "id": character.id,
            "name": character.character_name,
            "role_requirements": {
                "mission-giver": "This NPC MUST be the one giving the mission to the player character. They should be authoritative and knowledgeable about the mission details.",
                "villain": "This NPC MUST be the primary antagonist or villain of the story. They should be threatening and pose a significant challenge to the player character.",
                "neutral": "This NPC can be used in any supporting role, but their actions should align with their traits and backstory.",
                "undetermined": "This NPC's role is flexible, but they must be used in a way that makes sense given their traits and backstory."
            }.get(role, "This NPC should be used in a way that makes sense given their traits and backstory.")
        }

    def start_new_story(self, form_data=None) -> Dict[str, Any]:
        """
        Start a new story for the user.
        
        Args:
            form_data (Optional[Dict]): Form data containing story parameters
            
        Returns:
            Dict[str, Any]: Initial story state including:
                - story_id: Unique identifier for the story
                - primary_conflict: Main conflict of the story
                - setting: Story setting
                - narrative_style: Style of the narrative
                - mood: Story mood
                - initial_node: First story node
                - available_missions: List of available missions
        """
        try:
            # Get story parameters from form data
            story_params = {
                'conflict': form_data.get('conflict', 'Mysterious adventure'),
                'setting': form_data.get('setting', 'Unknown location'),
                'narrative_style': form_data.get('narrative_style', 'Engaging modern style'),
                'mood': form_data.get('mood', 'Exciting and adventurous'),
                'protagonist_name': form_data.get('protagonist_name'),
                'protagonist_gender': form_data.get('protagonist_gender'),
                'protagonist_level': form_data.get('protagonist_level', 1)
            }
            
            # Get selected characters
            selected_character_ids = form_data.get('selected_characters', [])
            if selected_character_ids:
                # Query selected characters
                selected_characters = Character.query.filter(
                    Character.id.in_(selected_character_ids)
                ).all()
                
                if selected_characters:
                    # Use the first character as the main character_info
                    main_character = selected_characters[0]
                    
                    # Format the main character info with proper role handling
                    story_params['character_info'] = self.format_character_data(main_character)
                    
                    # Add any additional characters to additional_characters
                    if len(selected_characters) > 1:
                        story_params['additional_characters'] = [
                            self.format_character_data(char)
                            for char in selected_characters[1:]
                        ]
            
            try:
                # Get OpenAI client
                client = get_openai_client()
                if client is None:
                    raise ValueError("Failed to initialize OpenAI client")
                
                # Add client to story parameters
                story_params['client'] = client
                
                # Generate new story using story_maker
                story_data = generate_story(**story_params)
                
                # Start database transaction
                db.session.begin_nested()
                
                # Create story in database
                story = StoryGeneration(
                    user_id=self.user_id,
                    primary_conflict=story_data["conflict"],
                    setting=story_data["setting"],
                    narrative_style=story_data["narrative_style"],
                    mood=story_data["mood"],
                    generated_story=story_data  # Store data directly, let PostgreSQL handle JSONB conversion
                )
                db.session.add(story)
                
                # Associate selected characters with the story
                if selected_character_ids:
                    story.characters = selected_characters
                
                db.session.flush()  # Flush to get story.id
                
                # Create initial story node
                initial_node = StoryNode(
                    story_id=story.id,
                    narrative_text=story_data["stories"]["story"],  # Access story from nested structure
                    is_endpoint=False,
                    branch_metadata={
                        "choices": story_data["choices"],  # Use choices from root level
                        "characters": [char.id for char in selected_characters] if selected_character_ids else [],
                        "protagonist": {
                            "name": form_data.get('protagonist_name'),
                            "gender": form_data.get('protagonist_gender'),
                            "level": form_data.get('protagonist_level', 1)
                        }
                    }
                )
                db.session.add(initial_node)
                db.session.flush()  # Flush to get initial_node.id
                
                # Update user progress
                self.state.user_progress.current_story_id = story.id
                self.state.user_progress.current_node_id = initial_node.id
                self.state.user_progress.last_active = datetime.utcnow()
                
                # Generate initial missions
                missions = generate_mission(self.user_id, story.id)
                
                # Update state
                self.state.current_story = story
                self.state.current_node = initial_node
                self.state.active_missions = [missions] if missions else []
                
                # Commit all changes
                db.session.commit()
                
                # Notify state manager
                state_manager.update_state(self.state.to_dict())
                
                return {
                    "story_id": story.id,
                    "primary_conflict": story.primary_conflict,
                    "setting": story.setting,
                    "narrative_style": story.narrative_style,
                    "mood": story.mood,
                    "initial_node": {
                        "id": initial_node.id,
                        "narrative_text": initial_node.narrative_text,
                        "is_endpoint": initial_node.is_endpoint,
                        "branch_metadata": {
                            "choices": story_data["choices"],  # Use choices from root level
                            "characters": [char.id for char in selected_characters] if selected_character_ids else [],
                            "protagonist": {
                                "name": form_data.get('protagonist_name'),
                                "gender": form_data.get('protagonist_gender'),
                                "level": form_data.get('protagonist_level', 1)
                            }
                        }
                    },
                    "available_missions": [
                        {
                            "id": mission.id,
                            "title": mission.title,
                            "description": mission.description,
                            "objective": mission.objective,
                            "progress": mission.progress,
                            "reward_currency": mission.reward_currency,
                            "reward_amount": mission.reward_amount,
                            "difficulty": mission.difficulty
                        } for mission in self.state.active_missions
                    ]
                }
                
            except Exception as e:
                # Rollback transaction on any error
                db.session.rollback()
                raise RuntimeError(f"Story generation failed: {str(e)}")
                
        except Exception as e:
            logger.error(f"Error starting new story: {str(e)}", exc_info=True)
            # Ensure any open transaction is rolled back
            db.session.rollback()
            raise RuntimeError(f"Failed to start new story: {str(e)}")

    def make_choice(
        self,
        choice_id: str,
        custom_choice_text: Optional[str] = None,
        story_context: Optional[str] = None,
        characters: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Process a user's story choice and update game state.
        """
        try:
            # Start transaction
            db.session.begin_nested()
            
            # Get context manager for story continuation
            context_manager = self.state.get_context_manager()
            
            # Get current story and node
            story = self.state.current_story
            if not story:
                raise ValueError("No active story found")
                
            # Resolve current node
            current_node = self.state.resolve_current_node(story.id)
            if not current_node:
                raise ValueError("Could not resolve current node")
            
            # Get node context for story continuation
            node_context = self.state.get_node_context(current_node.id)
            
            # Safely get mission info, using a default empty mission if none exists
            active_missions = node_context.get("active_missions", [])
            mission_info = active_missions[0] if active_missions else {
                "title": "Unknown Mission",
                "objective": "Continue the story",
                "status": "in_progress"
            }
            
            # Generate next story segment using segment_maker
            next_segment = generate_continuation(
                previous_story=current_node.narrative_text,
                chosen_choice=custom_choice_text or choice_id,
                mission_info=mission_info,
                context_manager=context_manager,
                mood=story.mood,
                narrative_style=story.narrative_style,
                story_context=story_context
            )
            
            # Log the continuation data
            logger.debug(f"Generated continuation data: {json.dumps(next_segment, indent=2)}")
            
            # Create new node with the generated content
            next_node = StoryNode(
                story_id=story.id,
                narrative_text=next_segment["stories"]["story"],
                parent_node_id=current_node.id,
                generated_by_ai=True,
                branch_metadata={
                    "choice_id": choice_id,
                    "branch_id": choice_id,
                    "choice_text": custom_choice_text or choice_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "choices": next_segment["choices"]  # Use choices from root level
                }
            )
            
            # Maintain character relationships from the story
            if characters:
                # Convert character IDs to integers
                character_ids = [int(char["id"]) for char in characters]
                # Query the characters
                story_characters = Character.query.filter(Character.id.in_(character_ids)).all()
                # Add character IDs to branch_metadata
                next_node.branch_metadata["characters"] = [char.id for char in story_characters]
                # Set the first character as the primary character for this node
                if story_characters:
                    next_node.character_id = story_characters[0].id
                    
            # Add mission update to branch_metadata if present
            if "mission_update" in next_segment["stories"]:
                next_node.branch_metadata["mission_update"] = next_segment["stories"]["mission_update"]
            
            # Add node to session and flush to get ID
            db.session.add(next_node)
            db.session.flush()
            
            # Log the node data before transition
            logger.debug(f"Node data before transition: {json.dumps(next_node.branch_metadata, indent=2)}")
            
            try:
                # Transition to new node
                if not self.state.transition_to_node(next_node.id):
                    raise RuntimeError("Failed to transition to new node")
            except Exception as e:
                logger.error(f"Error during node transition: {str(e)}")
                raise RuntimeError(f"Failed to transition to new node: {str(e)}")
            
            # Update missions based on choice
            mission_updates = []
            for mission in self.state.active_missions:
                if update_mission_progress(mission.id, int(mission.progress + 10)):
                    mission_updates.append(mission)
            
            # Update character relationships
            character_updates = []
            if characters:
                # Ensure characters are associated with the story
                if story_characters:
                    # Properly maintain the many-to-many relationship
                    for char in story_characters:
                        if char not in story.characters:
                            story.characters.append(char)
                    
                # Update relationship tracking
                updates = self.character_service.update_relationships(
                    self.user_id,
                    story.id,
                    current_node.id,
                    next_node.id
                )
                if updates:
                    character_updates.extend(updates)
            
            # Commit all changes
            db.session.commit()
            
            # Log the final node state after commit
            logger.debug(f"Final node state after commit: {json.dumps(next_node.to_dict(), indent=2)}")
            
            # Update state manager
            state_manager.update_state(self.state.to_dict())
            
            # Return updated game state
            return {
                "current_node": next_node.to_dict(),
                "available_choices": next_segment["choices"],  # Use choices from root level
                "mission_updates": mission_updates,
                "character_updates": character_updates
            }
            
        except Exception as e:
            logger.error(f"Error in make_choice: {str(e)}", exc_info=True)
            db.session.rollback()
            raise RuntimeError(f"Failed to process choice: {str(e)}")

    def update_mission(self, mission_id: str, progress: float) -> Dict[str, Any]:
        """
        Update mission progress and handle completion.
        
        Args:
            mission_id (str): ID of the mission to update
            progress (float): New progress value (0-1)
            
        Returns:
            Dict[str, Any]: Updated mission state
        """
        mission = Mission.query.get(mission_id)
        if not mission or mission.user_id != self.user_id:
            return None
            
        # Update progress
        if update_mission_progress(mission.id, int(progress * 100)):
            # Check completion
            if mission.progress >= 100:
                if complete_mission(mission.id, self.user_id):
                    self.state.user_progress.completed_missions.append(mission_id)
        
        # Update state manager
        state_manager.update_state(self.state.to_dict())
        
        return {
            "id": mission.id,
            "title": mission.title,
            "progress": mission.progress / 100.0,  # Convert back to 0-1 range
            "status": mission.status,
            "rewards": mission.reward_currency if mission.status == "completed" else None
        }

    def interact_with_character(self, character_id: str, interaction_type: str) -> Dict[str, Any]:
        """
        Handle character interaction and update relationships.
        
        Args:
            character_id (str): ID of the character to interact with
            interaction_type (str): Type of interaction to perform
            
        Returns:
            Dict[str, Any]: Updated character relationship state
        """
        # Get character
        character = Character.query.get(character_id)
        if not character:
            return None
            
        # Process interaction
        result = self.character_service.process_interaction(
            self.user_id,
            character_id,
            interaction_type
        )
        
        # Update state manager
        state_manager.update_state(self.state.to_dict())
        
        return {
            "character_id": character_id,
            "name": character.name,
            "relationship": result.relationship_level,
            "trust": result.trust_level,
            "loyalty": result.loyalty_level,
            "interaction_effects": result.effects
        }