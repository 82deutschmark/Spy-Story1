"""
Game Engine for Spy Story Game
===========================

This module serves as the core game engine for the spy story game, orchestrating:
1. Story progression and branching
2. Mission management
3. Character interactions and relationships (NPCs)
4. Game state tracking

The engine maintains game consistency and provides the main interface for:
- Starting new stories
- Processing player choices
- Managing mission states
- Tracking player progress
- Handling character relationships

Key Components:
-------------
- GameState: Tracks current game state for each user/protagonist
- GameEngine: Provides core game logic and state transitions
- Story Generation: Creates dynamic, branching narratives
- Mission System: Manages spy missions and objectives
- Character System: Handles character interactions and evolution

Dependencies:
-----------
- Database models (UserProgress, StoryGeneration, etc.)
- Story generation service
- Mission management service
- Character evolution system
- Currency management system
"""

import os
import logging
import json
from typing import Dict, List, Any, Optional, Tuple
from models import UserProgress, StoryGeneration, StoryNode, StoryChoice, Mission
from models.character_data import Character  # NPCs are stored in character_data
from services.story_maker import generate_story
from services.segment_maker import generate_continuation
from services.mission_generator import generate_mission, complete_mission, fail_mission, update_mission_progress
from database import db

logger = logging.getLogger(__name__)

# Add debug log for OpenAI API key presence
if os.environ.get("OPENAI_API_KEY"):
    logger.info("OpenAI API key is present for gpt-4o-mini")
else:
    logger.warning("OpenAI API key is missing - required for gpt-4o-mini story generation")

class GameState:
    """
    Represents the current state of a user's game session.
    
    The user is the protagonist - all other characters are NPCs.
    This class maintains:
    1. Current story progress
    2. Active missions
    3. NPC relationships
    4. Player resources
    """

    def __init__(self, user_id: str):
        """
        Initialize game state for a user/protagonist.
        
        Args:
            user_id (str): Unique identifier for the user/protagonist
        """
        self.user_id = user_id
        self.user_progress = self._load_user_progress()
        self.current_story = None
        self.current_node = None
        self.active_missions = []
        self._context_manager = None
        self.reload_state()

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert the game state to a dictionary for API responses.
        
        Returns:
            Dict[str, Any]: Dictionary containing:
                - user_id: User's unique identifier
                - current_story: Current story details if any
                - current_node: Current story node details if any
                - active_missions: List of active mission details
                - user_progress: User's progress details
        """
        return {
            "user_id": self.user_id,
            "current_story": {
                "id": self.current_story.id,
                "title": self.current_story.title,
                "conflict": self.current_story.primary_conflict,
                "setting": self.current_story.setting,
                "narrative_style": self.current_story.narrative_style,
                "mood": self.current_story.mood
            } if self.current_story else None,
            "current_node": {
                "id": self.current_node.id,
                "narrative_text": self.current_node.narrative_text,
                "is_endpoint": self.current_node.is_endpoint,
                "branch_metadata": self.current_node.branch_metadata
            } if self.current_node else None,
            "active_missions": [
                {
                    "id": mission.id,
                    "title": mission.title,
                    "description": mission.description,
                    "objective": mission.objective,
                    "progress": mission.progress,
                    "reward_currency": mission.reward_currency,
                    "reward_amount": mission.reward_amount,
                    "difficulty": mission.difficulty
                } for mission in self.active_missions
            ],
            "user_progress": {
                "level": self.user_progress.level,
                "experience_points": self.user_progress.experience_points,
                "currency_balances": self.user_progress.currency_balances,
                "active_missions": self.user_progress.active_missions,
                "completed_missions": self.user_progress.completed_missions,
                "failed_missions": self.user_progress.failed_missions,
                "choice_history": self.user_progress.choice_history,
                "encountered_characters": self.user_progress.encountered_characters
            }
        }

    def _load_user_progress(self) -> UserProgress:
        """Load or create user/protagonist progress record"""
        user_progress = UserProgress.query.filter_by(user_id=self.user_id).first()
        if not user_progress:
            logger.info(f"Creating new user progress for {self.user_id}")
            user_progress = UserProgress(user_id=self.user_id)
            db.session.add(user_progress)
            db.session.commit()
        return user_progress

    def reload_state(self):
        """Refresh game state from database"""
        try:
            db.session.refresh(self.user_progress)

            if self.user_progress.current_story_id:
                self.current_story = StoryGeneration.query.get(self.user_progress.current_story_id)

            if self.user_progress.current_node_id:
                self.current_node = StoryNode.query.get(self.user_progress.current_node_id)

            if self.user_progress.active_missions:
                self.active_missions = Mission.query.filter(
                    Mission.id.in_(self.user_progress.active_missions),
                    Mission.user_id == self.user_id
                ).all()
        except Exception as e:
            logger.error(f"Error reloading game state: {str(e)}", exc_info=True)
            raise

class GameEngine:
    """
    Core game engine that manages game logic and state transitions.
    
    This class provides the main interface for:
    1. Starting new spy stories
    2. Processing player choices
    3. Managing mission states
    4. Handling NPC interactions
    """

    @staticmethod
    def get_game_state(user_id: str) -> GameState:
        """Get current game state for a user/protagonist"""
        return GameState(user_id)

    @staticmethod
    def start_new_story(
        user_id: str, 
        conflict: str, 
        setting: str, 
        narrative_style: str, 
        mood: str,
        character_id: Optional[int] = None,  # ID of a character to feature in the story
        custom_conflict: Optional[str] = None,
        custom_setting: Optional[str] = None,
        custom_narrative: Optional[str] = None,
        custom_mood: Optional[str] = None
    ) -> Tuple[Dict[str, Any], GameState]:
        """Initialize a new spy story"""
        logger.info(f"Starting new story for user/protagonist {user_id} with character {character_id}")

        try:
            # Get character info if provided
            character_info = None
            if character_id:
                character = Character.query.get(character_id)
                if character:
                    logger.debug(f"Found character: {character.name}")
                    character_info = {
                        "id": character.id,  # Include ID for character evolution
                        "name": character.name,
                        "role": character.character_role,
                        "character_traits": character.character_traits,
                        "plot_lines": character.plot_lines,
                        "description": character.description
                    }
                else:
                    logger.warning(f"Character not found with ID: {character_id}")

            # Get user progress for story generation
            game_state = GameState(user_id)
            protagonist_level = game_state.user_progress.level

            # Generate story using story maker service
            story_result = generate_story(
                conflict=conflict,
                setting=setting,
                narrative_style=narrative_style,
                mood=mood,
                character_info=character_info,  # Renamed from npc_info
                custom_conflict=custom_conflict,
                custom_setting=custom_setting,
                custom_narrative=custom_narrative,
                custom_mood=custom_mood,
                protagonist_level=protagonist_level,
                user_id=user_id  # Pass user_id for character evolution
            )

            # Create story record
            story = StoryGeneration(
                primary_conflict=story_result["conflict"],
                setting=story_result["setting"],
                narrative_style=story_result["narrative_style"],
                mood=story_result["mood"],
                generated_story=story_result["stories"]
            )
            db.session.add(story)
            db.session.commit()

            # Parse story JSON
            story_data = json.loads(story_result["stories"]["story"])

            # Create initial story node
            node = StoryNode(
                narrative_text=story_data.get("story", ""),
                is_endpoint=False,
                generated_by_ai=True,
                character_id=character_id,  # Renamed from npc_id
                branch_metadata={
                    "mission": story_result["stories"]["mission"]
                }
            )
            db.session.add(node)
            db.session.commit()

            # Create choices
            for choice_data in story_data.get("choices", []):
                choice = StoryChoice(
                    node_id=node.id,
                    choice_text=choice_data.get("text", ""),
                    choice_metadata={
                        "consequence": choice_data.get("consequence", ""),
                        "type": choice_data.get("type", "")
                    }
                )
                db.session.add(choice)

            db.session.commit()

            # Update user progress
            game_state.user_progress.current_story_id = story.id
            game_state.user_progress.current_node_id = node.id
            db.session.commit()

            # Generate mission
            generate_mission(user_id, story.id)

            # If character provided, add to story relationships
            if character_id and character:
                story.characters.append(character)  # Renamed from npcs
                db.session.commit()

            # Reload game state
            game_state.reload_state()

            logger.info(f"Successfully created new story {story.id} for user {user_id}")
            return story_data, game_state

        except Exception as e:
            logger.error(f"Error starting new story: {str(e)}", exc_info=True)
            db.session.rollback()
            raise

    @staticmethod
    def make_choice(
        user_id: str, 
        choice_id: int,
        custom_choice_text: Optional[str] = None
    ) -> Tuple[Dict[str, Any], GameState]:
        """Process a user's story choice and advance the game"""
        logger.info(f"Processing choice {choice_id} for user {user_id}")
        
        # Load game state
        game_state = GameState(user_id)
        
        # Get the choice
        choice = StoryChoice.query.get(choice_id)
        if not choice:
            raise ValueError(f"Choice {choice_id} not found")
        
        # Check if user can afford this choice
        if not game_state.user_progress.can_afford(choice.currency_requirements):
            raise ValueError("User cannot afford this choice")
        
        # Record the choice
        choice_text = custom_choice_text if custom_choice_text else choice.choice_text
        game_state.user_progress.record_choice(
            choice_text=choice_text,
            choice_id=choice_id,
            node_id=choice.node_id,
            story_id=game_state.current_story.id if game_state.current_story else None
        )
        
        # Spend currency if required
        if choice.currency_requirements:
            game_state.user_progress.spend_currency(
                currency_requirements=choice.currency_requirements,
                transaction_type="story_choice",
                description=f"Chose: {choice_text}",
                story_node_id=choice.node_id
            )
        
        # Check for existing next node
        if choice.next_node_id:
            next_node = StoryNode.query.get(choice.next_node_id)
            game_state.user_progress.current_node_id = next_node.id
            db.session.commit()
            
            game_state.reload_state()
            return {"story": next_node.narrative_text}, game_state
        
        # Get mission info for continuation
        mission_info = game_state.current_node.branch_metadata.get("mission", {})
        
        # Generate continuation
        continuation_data = generate_continuation(
            previous_story=game_state.current_node.narrative_text,
            chosen_choice=choice_text,
            mission_info=mission_info
        )
        
        # Create new story node
        node = StoryNode(
            narrative_text=continuation_data["story"],
            is_endpoint=False,
            generated_by_ai=True,
            parent_node_id=game_state.current_node.id,
            branch_metadata={
                "mission": mission_info,
                "mission_update": continuation_data["mission_update"]
            }
        )
        db.session.add(node)
        db.session.commit()
        
        # Link choice to new node
        choice.next_node_id = node.id
        db.session.commit()
        
        # Create new choices
        for choice_data in continuation_data["choices"]:
            new_choice = StoryChoice(
                node_id=node.id,
                choice_text=choice_data["text"],
                choice_metadata={
                    "consequence": choice_data["consequence"],
                    "type": choice_data["type"]
                }
            )
            db.session.add(new_choice)
        
        db.session.commit()
        
        # Update user progress
        game_state.user_progress.current_node_id = node.id
        db.session.commit()
        
        # Handle mission updates
        mission_update = continuation_data.get("mission_update", {})
        if mission_update:
            mission_id = mission_update.get("mission_id")
            progress = mission_update.get("progress")
            if mission_id and progress:
                update_mission_progress(mission_id, progress, "Story progression")
        
        # Award experience
        game_state.user_progress.add_experience_points(15, "Story advancement")
        
        # Reload state
        game_state.reload_state()
        
        return continuation_data, game_state
    
    @staticmethod
    def update_mission_status(user_id: str, mission_id: int, status: str, reason: Optional[str] = None) -> GameState:
        """Update a mission's status"""
        logger.info(f"Updating mission {mission_id} to status {status} for user {user_id}")
        
        if status == "complete":
            complete_mission(mission_id, user_id)
        elif status == "fail":
            fail_mission(mission_id, user_id, reason)
        
        return GameState(user_id)