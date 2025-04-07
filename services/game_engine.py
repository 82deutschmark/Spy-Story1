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
from datetime import datetime, timedelta
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
from utils.context_manager import OpenAIContextManager, configure_logging
from utils.character_manager import format_character_info
import json
import sys

# Configure proper logging for game engine
def setup_game_engine_logging():
    """Configure game engine logging for visibility in console"""
    # Configure root logger if not already configured
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
        root_logger.setLevel(logging.INFO)
    
    # Configure httpx and openai for API debugging
    logging.getLogger("httpx").setLevel(logging.DEBUG)
    logging.getLogger("openai").setLevel(logging.DEBUG)
    
    logger = logging.getLogger(__name__)
    logger.info("Game engine logging configured")

# Set up logging
setup_game_engine_logging()
configure_logging()  # Configure OpenAI context manager logging

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
            # If form_data is a string, parse it to a dict
            if (form_data and isinstance(form_data, str)):
                form_data = json.loads(form_data)
            # Get story parameters from form data with defaults:
            story_params = {
                'conflict': form_data.get('conflict', 'GAME ENGINE ERROR DUMMY!!!'),
                'setting': form_data.get('setting', 'GAME ENGINE ERROR DUMMY!!!'),
                'narrative_style': form_data.get('narrative_style', 'GAME ENGINE ERROR DUMMY!!!'),
                'mood': form_data.get('mood', 'GAME ENGINE ERROR DUMMY!!!'),
                'protagonist_name': form_data.get('protagonist_name'),
                'protagonist_gender': form_data.get('protagonist_gender')
            }
            
            # --- BEGIN ADDED CHECK ---
            request_protagonist_name = story_params.get('protagonist_name')
            if self.state.user_progress and self.state.user_progress.current_node_id and request_protagonist_name:
                try:
                    existing_node = StoryNode.query.get(self.state.user_progress.current_node_id)
                    if existing_node and existing_node.branch_metadata:
                        stored_protagonist_info = existing_node.branch_metadata.get("protagonist", {})
                        stored_protagonist_name = stored_protagonist_info.get("name")

                        if stored_protagonist_name and stored_protagonist_name != request_protagonist_name:
                            logger.warning(f"Protagonist name mismatch for user {self.user_id}. Request: '{request_protagonist_name}', Stored: '{stored_protagonist_name}'. Resetting progress.")
                            # Reset progress fields
                            self.state.user_progress.current_story_id = None
                            self.state.user_progress.current_node_id = None
                            self.state.user_progress.node_count = 0
                            self.state.user_progress.active_missions = []
                            self.state.user_progress.completed_missions = []
                            self.state.user_progress.failed_missions = []
                            self.state.user_progress.choice_history = []
                            self.state.user_progress.encountered_characters = {}
                            self.state.user_progress.last_active = datetime.utcnow()
                            
                            # Commit the reset
                            db.session.add(self.state.user_progress)
                            db.session.commit()
                            
                            # Reload GameState internal state after reset
                            self.state.reload_state()
                            logger.info(f"User progress reset for {self.user_id} due to protagonist name mismatch.")
                            
                except Exception as e:
                     logger.error(f"Error checking protagonist name match for user {self.user_id}: {e}", exc_info=True)
                     # Don't block story creation, but log the error
                     db.session.rollback() # Rollback potential partial changes from check

            # --- END ADDED CHECK ---
            
            # Get selected characters from form data
            selected_character_ids = form_data.get('selected_characters', [])
            if selected_character_ids:
                # Query selected characters from DB
                selected_characters = Character.query.filter(
                    Character.id.in_(selected_character_ids)
                ).all()
                
                if selected_characters:
                    main_character = selected_characters[0]
                    # Replace format_character_info with an inline dict to ensure proper type
                    story_params['character_info'] = {
                        "id": main_character.id,
                        "character_name": main_character.character_name,
                        "character_traits": main_character.character_traits or {},
                        "backstory": getattr(main_character, 'backstory', ""),
                        "plot_lines": getattr(main_character, 'plot_lines', []),
                        "character_role": main_character.character_role
                    }
                    
                    # Add any additional characters to additional_characters
                    if len(selected_characters) > 1:
                        story_params['additional_characters'] = [
                            {
                                "id": char.id,
                                "name": char.character_name,
                                "character_traits": char.character_traits,
                                "backstory": getattr(char, 'backstory', ""),
                                "plot_lines": getattr(char, 'plot_lines', []),
                                "role": char.character_role,
                                "role_requirements": ""
                            }
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
                
                db.session.flush()
                
                # Create initial story node
                initial_node = StoryNode(
                    story_id=story.id,
                    narrative_text=story_data["narrative_text"],
                    is_endpoint=False,
                    branch_metadata={
                        # Story context
                        "story_id": story.id,
                        "timestamp": datetime.utcnow().isoformat(),
                        
                        # Character information
                        "characters": [char.id for char in selected_characters] if selected_character_ids else [],
                        "character_details": [
                            {
                                "id": char.id,
                                "name": char.character_name,
                                "character_name": char.character_name,
                                "character_role": char.character_role,
                                "character_traits": getattr(char, "character_traits", {}),
                                "plot_lines": getattr(char, "plot_lines", []),
                                "backstory": getattr(char, "backstory", ""),
                                "description": getattr(char, "description", "")
                            } for char in selected_characters
                        ] if selected_character_ids else [],
                        
                        # Player choices
                        "choices": story_data["choices"],
                        
                        # Protagonist information 
                        "protagonist": {
                            "name": form_data.get('protagonist_name'),
                            "gender": form_data.get('protagonist_gender')
                        },
                        
                        # Story parameters for context continuity
                        "story_parameters": {
                            "conflict": story.primary_conflict,
                            "setting": story.setting,
                            "narrative_style": story.narrative_style,
                            "mood": story.mood
                        }
                    }
                )
                db.session.add(initial_node)
                db.session.flush()  # Flush to get initial_node.id
                
                # Update user progress
                self.state.user_progress.current_story_id = story.id
                self.state.user_progress.current_node_id = initial_node.id
                self.state.user_progress.last_active = datetime.utcnow()
                
                # Create initial mission with proper parameters
                mission = Mission(
                    user_id=self.user_id,
                    title=f"Initial Mission: {story.primary_conflict}",
                    description=f"Investigate and resolve the {story.primary_conflict} in {story.setting}",
                    giver_id=selected_characters[0].id if selected_characters else None,  # First character is mission giver
                    target_id=selected_characters[1].id if len(selected_characters) > 1 else None,  # Second character is target
                    objective=f"Investigate and resolve the {story.primary_conflict}",
                    status='active',
                    difficulty='medium',  # Default difficulty for initial mission
                    reward_currency='💵',  # Default currency
                    reward_amount=1500,  # Default reward
                    deadline=datetime.utcnow() + timedelta(days=7),  # 7-day deadline
                    story_id=story.id,
                    progress=0,
                    progress_updates=[{
                        "progress": 0,
                        "status": "active",
                        "timestamp": datetime.utcnow().isoformat(),
                        "description": "Mission assigned"
                    }]
                )
                db.session.add(mission)
                
                # Update state
                self.state.current_story = story
                self.state.current_node = initial_node
                self.state.active_missions = [mission]
                
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
                            "choices": story_data["choices"],
                            "characters": [char.id for char in selected_characters] if selected_character_ids else [],
                            "protagonist": {
                                "name": form_data.get('protagonist_name'),
                                "gender": form_data.get('protagonist_gender')
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

    def get_active_missions(self, user_id: str) -> List[Mission]:
        """
        Get all active missions for a user
        
        Args:
            user_id (str): ID of the user
            
        Returns:
            List[Mission]: List of active Mission objects
        """
        try:
            # Get user progress
            user_progress = UserProgress.query.filter_by(user_id=user_id).first()
            if not user_progress:
                return []
                
            # Get active missions from database
            active_missions = Mission.query.filter(
                Mission.id.in_(user_progress.active_missions),
                Mission.is_completed == False
            ).all()
            
            return active_missions
            
        except Exception as e:
            logger.error(f"Error getting active missions: {str(e)}")
            raise

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
            logger.info("=== make_choice method called ===")
            logger.debug(f"Choice ID: {choice_id}")
            logger.debug(f"Custom choice text: {custom_choice_text}")
            logger.debug(f"Story context: {story_context}")
            logger.debug(f"Characters: {json.dumps(characters, default=str, indent=2) if characters else 'None'}")
            
            # Start transaction
            db.session.begin_nested()
            # Reload the game state from the database to ensure latest parameters
            logger.info("Reloading game state from database")
            self.state.reload_state()
            
            # Get context manager as a stateless service
            logger.info("Getting stateless context manager from GameState")
            context_manager = self.state.get_context_manager()
            
            # Get current story from DB using stored story id to ensure fresh parameters
            if not self.state.user_progress.current_story_id:
                raise ValueError("No active story ID found in user progress")
                
            story = StoryGeneration.query.get(self.state.user_progress.current_story_id)
            if not story:
                raise ValueError("No active story found")
            
            # Resolve current node
            logger.info("Resolving current node")
            current_node = self.state.resolve_current_node(story.id)
            if not current_node:
                raise ValueError("Could not resolve current node")
            
            # Get node context for story continuation
            logger.info("Getting node context")
            node_context = self.state.get_node_context(current_node.id)
            
            debug_info = {
                'active_missions_count': len(node_context.get('active_missions', [])), 
                'has_relationships': bool(node_context.get('character_relationships')),
                'has_story_context': bool(node_context.get('story_context'))
            }
            logger.debug(f"Node context: {json.dumps(debug_info, indent=2)}")
            
            # Get the active mission from the database
            active_mission = Mission.query.filter_by(
                user_id=self.user_id,
                status="active"  # Changed from "in_progress" to "active" to match model
            ).first()
            
            if not active_mission:
                logger.warning("No active mission found for user")
                # Create a new mission instead of using a dictionary
                active_mission = Mission(
                    user_id=self.user_id,
                    title="Unknown Mission",
                    description="Continue the story",
                    objective="Continue the story",
                    status="active",
                    difficulty="normal",
                    progress=0,
                    story_id=story.id
                )
                db.session.add(active_mission)
                db.session.flush()
            
            # Augment story_context with conflict and setting from the current story
            conflict = story.primary_conflict if hasattr(story, 'primary_conflict') else "Unknown conflict"
            setting = story.setting if hasattr(story, 'setting') else "Unknown setting"
            if story_context:
                story_context = f"CONFLICT: {conflict}\nSETTING: {setting}\n{story_context}"
            else:
                story_context = f"CONFLICT: {conflict}\nSETTING: {setting}"
            
            # Extract protagonist details from the branch metadata of the current node
            protagonist = current_node.branch_metadata.get("protagonist", {})
            
            # Increment node count in the game state
            logger.info("Incrementing node count in GameState")
            node_count = self.state.increment_node_count()
            logger.info(f"Node count is now: {node_count}")
            
            # Format characters for the context manager
            char_info = []
            if story.characters:
                char_info = [{
                    "id": char.id,
                    "name": char.character_name,
                    "character_name": char.character_name,
                    "character_role": char.character_role,
                    "character_traits": getattr(char, "character_traits", {}),
                    "plot_lines": getattr(char, "plot_lines", []),
                    "backstory": getattr(char, "backstory", ""),
                    "description": getattr(char, "description", ""),
                    "role": char.character_role  # Include both formats for compatibility
                } for char in story.characters]
            
            logger.debug(f"Formatted {len(char_info)} characters for context manager")
            
            # Build user message for continuation
            user_message = f"""
PLAYER'S CHOICE:
{custom_choice_text or choice_id}

CURRENT MISSION:
Title: {active_mission.title}
Objective: {active_mission.objective}
Status: {active_mission.status}
Progress: {active_mission.progress}%

STORY CONTEXT:
{story_context or ""}
"""
            logger.debug(f"User message for continuation: {user_message}")
            
            # Get enhanced context from state manager
            logger.info("Getting enhanced context from state manager")
            enhanced_context = node_context.get("enhanced_context", "")
            logger.debug(f"Enhanced context length: {len(enhanced_context)}")
            
            # Generate next story segment using segment_maker with stateless approach
            logger.info("Calling generate_continuation...")
            logger.info(f"Parameters being passed: conflict={conflict}, setting={setting}, mood={story.mood}, narrative_style={story.narrative_style}, node_count={node_count}")
            
            # --- Add Type Logging --- 
            logger.info(f"Type of 'active_mission' BEFORE calling generate_continuation: {type(active_mission)}")
            next_segment = generate_continuation(
                previous_story=current_node.narrative_text,
                chosen_choice=custom_choice_text or choice_id,
                mission=active_mission,  # Now passing the Mission model instance
                mood=story.mood,
                narrative_style=story.narrative_style,
                conflict=conflict,
                setting=setting,
                story_context=story_context or "",
                existing_characters=char_info,
                node_count=node_count,
                narrative_history=node_context.get("narrative_history", ""),
                enhanced_context=enhanced_context
            )
            
            # Log the continuation data
            logger.debug(f"Generated continuation data: {json.dumps(next_segment, indent=2)}")
            
            # Process mission updates from the continuation
            mission_updates = []
            if "mission_update" in next_segment:
                mission_update = next_segment["mission_update"]
                if mission_update.get("status") in ["progressed", "completed", "failed"]:
                    # Calculate new progress
                    current_progress = active_mission.progress
                    if mission_update["status"] == "progressed":
                        new_progress = min(100, current_progress + 25)  # 25% progress per story segment
                    elif mission_update["status"] == "completed":
                        new_progress = 100
                    else:  # failed
                        new_progress = current_progress
                        
                    # Update mission in database
                    mission_updates.append(self.update_mission(active_mission.id, new_progress / 100.0))
                    logger.info(f"Updated mission {active_mission.id} to progress {new_progress}%")
            
            # Create new node using updated continuation data from branch_metadata
            next_node = StoryNode(
                story_id=story.id,
                narrative_text=next_segment["narrative_text"],  # Use the clean narrative text
                parent_node_id=current_node.id,
                generated_by_ai=True,
                branch_metadata={
                    # Story context
                    "story_id": story.id,
                    "choice_id": choice_id,
                    "branch_id": choice_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    
                    # Choice context
                    "choice_text": custom_choice_text or choice_id,
                    "choices": next_segment["choices"],
                    
                    # Character information
                    "characters": [char.id for char in story.characters] if story.characters else [],
                    "character_details": [
                        {
                            "id": char.id,
                            "name": char.character_name,
                            "character_name": char.character_name,
                            "character_role": char.character_role,
                            "character_traits": getattr(char, "character_traits", {}),
                            "plot_lines": getattr(char, "plot_lines", []),
                            "backstory": getattr(char, "backstory", ""),
                            "description": getattr(char, "description", "")
                        } for char in story.characters
                    ] if story.characters else [],
                    
                    # Mission information
                    "mission_info": {
                        "id": active_mission.id,
                        "title": active_mission.title,
                        "objective": active_mission.objective,
                        "status": active_mission.status,
                        "progress": active_mission.progress,
                        "difficulty": active_mission.difficulty,
                        "reward_currency": active_mission.reward_currency,
                        "reward_amount": active_mission.reward_amount
                    },
                    "mission_update": next_segment.get("mission_update", {}),
                    
                    # Protagonist information - carry over from current node
                    "protagonist": current_node.branch_metadata.get("protagonist", {}),
                    
                    # Story parameters - ensure continuity
                    "story_parameters": {
                        "conflict": story.primary_conflict,
                        "setting": story.setting,
                        "narrative_style": story.narrative_style,
                        "mood": story.mood,
                        "node_count": node_count  # Store current node count
                    },
                    
                    # Previous node reference for context
                    "previous_node_id": current_node.id,
                    "previous_choice": choice_id
                }
            )
            
            # Maintain character relationships from the story
            if characters:
                # Convert character IDs to integers and query the characters
                character_ids = [int(char["id"]) for char in characters]
                story_characters = Character.query.filter(Character.id.in_(character_ids)).all()
                next_node.branch_metadata["characters"] = [char.id for char in story_characters]
                # NEW: Save encountered character details in branch metadata
                next_node.branch_metadata["encountered_characters"] = [
                    {
                        "id": char.id,
                        "name": char.character_name,
                        "backstory": getattr(char, "backstory", ""),
                        "plot_lines": getattr(char, "plot_lines", [])
                    } for char in story_characters
                ]
                if story_characters:
                    next_node.character_id = story_characters[0].id
                    
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
            
            # NEW: Log the complete outgoing response from make_choice
            final_response = {
                "success": True,
                "current_node": next_node.to_dict(),
                "story_id": story.id,
                "redirect": f"/storyboard/{story.id}",  
                "available_choices": next_segment["choices"],
                "mission_updates": mission_updates,
                "character_updates": character_updates
            }
            logger.debug("Final response from make_choice: %s", json.dumps(final_response, indent=2))
            
            # Return updated game state
            return final_response
            
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