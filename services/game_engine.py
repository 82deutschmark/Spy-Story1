"""
Game Engine for Spy Story Game
===========================

This module serves as the core game engine for the spy story game, orchestrating:
1. Story progression and branching
2. Mission management
3. Character interactions
4. Game state tracking
5. Currency and resource management

The engine maintains game consistency and provides the main interface for:
- Starting new stories
- Processing player choices
- Managing mission states
- Tracking player progress
- Handling character relationships

Key Components:
-------------
- GameState: Tracks current game state for each player
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
from models.scene_images import SceneImages  # Use SceneImages for character data
from services.story_maker import generate_story
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
    Represents the current state of a player's game session.
    
    This class maintains:
    1. Current story progress
    2. Active missions
    3. Character relationships
    4. Player resources and currencies
    5. Story choices and consequences
    
    The state is persisted in the database and can be reloaded
    between sessions to maintain game continuity.
    """

    def __init__(self, user_id: str):
        """
        Initialize game state for a player.
        
        Args:
            user_id (str): Unique identifier for the player
        """
        self.user_id = user_id
        self.user_progress = self._load_user_progress()
        self.current_story = None
        self.current_node = None
        self.active_missions = []
        self.reload_state()

    def _load_user_progress(self) -> UserProgress:
        """
        Load or create user progress record from database.
        
        Returns:
            UserProgress: Player's progress record
            
        Note:
            Creates a new progress record if none exists
        """
        user_progress = UserProgress.query.filter_by(user_id=self.user_id).first()
        if not user_progress:
            logger.info(f"Creating new user progress for {self.user_id}")
            user_progress = UserProgress(user_id=self.user_id)
            db.session.add(user_progress)
            db.session.commit()
        return user_progress

    def reload_state(self):
        """
        Refresh game state from database.
        
        Updates:
        - Current story
        - Story node
        - Active missions
        - Character relationships
        - Player resources
        
        Raises:
            Exception: If state reload fails
        """
        try:
            # Refresh user progress
            db.session.refresh(self.user_progress)

            # Load current story if exists
            if self.user_progress.current_story_id:
                self.current_story = StoryGeneration.query.get(self.user_progress.current_story_id)

            # Load current node if exists
            if self.user_progress.current_node_id:
                self.current_node = StoryNode.query.get(self.user_progress.current_node_id)

            # Load active missions
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
    4. Handling character interactions
    5. Tracking game progression
    
    The engine ensures consistency between:
    - Story progression
    - Mission objectives
    - Character relationships
    - Player resources
    """

    @staticmethod
    def get_game_state(user_id: str) -> GameState:
        """
        Retrieve current game state for a player.
        
        Args:
            user_id (str): Player's unique identifier
            
        Returns:
            GameState: Current state of the player's game
        """
        return GameState(user_id)

    @staticmethod
    def start_new_story(
        user_id: str, 
        conflict: str, 
        setting: str, 
        narrative_style: str, 
        mood: str,
        character_id: Optional[int] = None,
        custom_conflict: Optional[str] = None,
        custom_setting: Optional[str] = None,
        custom_narrative: Optional[str] = None,
        custom_mood: Optional[str] = None
    ) -> Tuple[Dict[str, Any], GameState]:
        """
        Initialize a new spy story with the given parameters.
        
        This function:
        1. Generates a new story branch
        2. Creates initial story node
        3. Sets up mission objectives
        4. Establishes character relationships
        5. Initializes story choices
        
        Args:
            user_id (str): Player's unique identifier
            conflict (str): Main story conflict type
            setting (str): Story location/environment
            narrative_style (str): Storytelling style
            mood (str): Story atmosphere
            character_id (Optional[int]): Key character to include
            custom_conflict (Optional[str]): Custom conflict override
            custom_setting (Optional[str]): Custom setting override
            custom_narrative (Optional[str]): Custom narrative style
            custom_mood (Optional[str]): Custom mood override
            
        Returns:
            Tuple[Dict[str, Any], GameState]: Story data and updated game state
            
        Raises:
            Exception: If story creation fails
        """
        logger.info(f"Starting new story for user {user_id} with character_id {character_id}")

        try:
            # Get character info if provided
            character_info = None
            if character_id:
                character = SceneImages.query.get(character_id)  # Use SceneImages model
                if character:
                    logger.debug(f"Found character: {character.name}")
                    character_info = {
                        "name": character.name,
                        "role": getattr(character, 'character_role', ''),
                        "character_traits": getattr(character, 'character_traits', []),
                        "plot_lines": getattr(character, 'plot_lines', []),
                        "description": getattr(character, 'setting_description', '')
                    }
                else:
                    logger.warning(f"Character not found with ID: {character_id}")

            # Get user progress and level for dynamic story generation
            game_state = GameState(user_id)
            protagonist_level = game_state.user_progress.level

            # Generate a story using the story maker service
            story_result = generate_story(
                conflict=conflict,
                setting=setting,
                narrative_style=narrative_style,
                mood=mood,
                character_info=character_info,
                custom_conflict=custom_conflict,
                custom_setting=custom_setting,
                custom_narrative=custom_narrative,
                custom_mood=custom_mood,
                protagonist_level=protagonist_level
            )

            # Create a new story record
            story = StoryGeneration(
                primary_conflict=story_result["conflict"],
                setting=story_result["setting"],
                narrative_style=story_result["narrative_style"],
                mood=story_result["mood"],
                generated_story=story_result["story"]
            )
            db.session.add(story)
            db.session.commit()

            # Parse story JSON
            story_data = json.loads(story_result["story"])

            # Create initial story node
            node = StoryNode(
                narrative_text=story_data.get("story", ""),
                is_endpoint=False,
                generated_by_ai=True,
                character_id=character_id  # Link to new Character model
            )
            db.session.add(node)
            db.session.commit()

            # Create choices for the node
            for choice_data in story_data.get("choices", []):
                choice = StoryChoice(
                    node_id=node.id,
                    choice_text=choice_data.get("text", ""),
                    currency_requirements=choice_data.get("currency_requirements", {})
                )
                db.session.add(choice)

            db.session.commit()

            # Update user progress
            game_state.user_progress.current_story_id = story.id
            game_state.user_progress.current_node_id = node.id
            db.session.commit()

            # Generate mission from story
            generate_mission(user_id, story.id)

            # If character provided, add to story relationships
            if character_id and character:
                # Make sure we're using the Character model from character_data.py
                from models.character_data import Character
                character_obj = Character.query.get(character_id)
                if character_obj:
                    story.characters.append(character_obj)
                    db.session.commit()

            # Reload game state with new data
            game_state.reload_state()

            logger.info(f"Successfully created new story {story.id} for user {user_id}")

            # Return story data and updated game state
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
        """
        Process a player's story choice and advance the game.
        
        This function:
        1. Validates choice requirements
        2. Applies choice consequences
        3. Generates story continuation
        4. Updates character relationships
        5. Modifies mission progress
        
        Args:
            user_id (str): Player's unique identifier
            choice_id (int): Selected choice ID
            custom_choice_text (Optional[str]): Custom choice text
            
        Returns:
            Tuple[Dict[str, Any], GameState]: New story state and game state
            
        Raises:
            ValueError: If choice is invalid or requirements not met
        """
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
        
        # Record the user's choice
        choice_text = custom_choice_text if custom_choice_text else choice.choice_text
        game_state.user_progress.record_choice(
            choice_text=choice_text,
            choice_id=choice_id,
            node_id=choice.node_id,
            story_id=game_state.current_story.id if game_state.current_story else None
        )
        
        # Spend currency
        if choice.currency_requirements:
            game_state.user_progress.spend_currency(
                currency_requirements=choice.currency_requirements,
                transaction_type="story_choice",
                description=f"Chose: {choice_text}",
                story_node_id=choice.node_id
            )
        
        # Check if this choice already has a next node
        if choice.next_node_id:
            # Use existing next node
            next_node = StoryNode.query.get(choice.next_node_id)
            game_state.user_progress.current_node_id = next_node.id
            db.session.commit()
            
            # Reload game state and return existing node data
            game_state.reload_state()
            
            # Parse the existing node data
            return {"narrative_text": next_node.narrative_text}, game_state
        
        # Generate new story continuation based on choice
        # First, get the previous story context
        story_context = game_state.current_node.narrative_text if game_state.current_node else ""
        
        # Generate continuation with the story maker service
        story_result = generate_story(
            conflict=game_state.current_story.primary_conflict if game_state.current_story else "",
            setting=game_state.current_story.setting if game_state.current_story else "",
            narrative_style=game_state.current_story.narrative_style if game_state.current_story else "",
            mood=game_state.current_story.mood if game_state.current_story else "",
            previous_choice=choice_text,
            story_context=story_context,
            protagonist_level=game_state.user_progress.level
        )
        
        # Parse story JSON
        story_data = json.loads(story_result["story"])
        
        # Create new story node
        node = StoryNode(
            narrative_text=story_data.get("story", ""),
            is_endpoint=False,
            generated_by_ai=True,
            parent_node_id=game_state.current_node.id if game_state.current_node else None
        )
        db.session.add(node)
        db.session.commit()
        
        # Update the choice to link to this new node
        choice.next_node_id = node.id
        db.session.commit()
        
        # Create choices for the new node
        for choice_data in story_data.get("choices", []):
            new_choice = StoryChoice(
                node_id=node.id,
                choice_text=choice_data.get("text", ""),
                currency_requirements=choice_data.get("currency_requirements", {})
            )
            db.session.add(new_choice)
        
        db.session.commit()
        
        # Update user progress
        game_state.user_progress.current_node_id = node.id
        db.session.commit()
        
        # Check if there's a mission update in the story data
        mission_update = story_data.get("mission_update", {})
        if mission_update:
            mission_id = mission_update.get("mission_id")
            progress = mission_update.get("progress")
            if mission_id and progress:
                update_mission_progress(mission_id, progress, "Story progression")
        
        # Award experience points for story advancement
        game_state.user_progress.add_experience_points(15, "Story advancement")
        
        # Reload game state with new data
        game_state.reload_state()
        
        # Return story data and updated game state
        return story_data, game_state
    
    @staticmethod
    def update_mission_status(user_id: str, mission_id: int, status: str, reason: Optional[str] = None) -> GameState:
        """Update a mission's status"""
        logger.info(f"Updating mission {mission_id} to status {status} for user {user_id}")
        
        if status == "complete":
            complete_mission(mission_id, user_id)
        elif status == "fail":
            fail_mission(mission_id, user_id, reason)
        
        # Return updated game state
        return GameState(user_id)