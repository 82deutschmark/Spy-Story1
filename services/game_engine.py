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
from services.story_maker import generate_story
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

    def start_new_story(self) -> Dict[str, Any]:
        """
        Start a new story for the user.
        
        Returns:
            Dict[str, Any]: Initial story state including:
                - story_id: Unique identifier for the story
                - title: Story title
                - initial_node: First story node
                - available_missions: List of available missions
        """
        # Generate new story using story_maker
        story_data = generate_story(
            conflict="Default conflict",  # These will be overridden by UI choices
            setting="Default setting",
            narrative_style="Default style",
            mood="Default mood",
            user_id=self.user_id
        )
        
        # Create story in database
        story = StoryGeneration(
            primary_conflict=story_data["conflict"],
            setting=story_data["setting"],
            narrative_style=story_data["narrative_style"],
            mood=story_data["mood"],
            generated_story=story_data["story"]
        )
        db.session.add(story)
        db.session.commit()
        
        # Create initial story node
        initial_node = StoryNode(
            story_id=story.id,
            narrative_text=story_data["stories"]["story"],
            is_endpoint=False,
            branch_metadata={
                "choices": story_data["stories"]["choices"]
            }
        )
        db.session.add(initial_node)
        db.session.commit()
        
        # Update user progress
        self.state.user_progress.current_story_id = story.id
        self.state.user_progress.current_node_id = initial_node.id
        self.state.user_progress.last_active = datetime.utcnow()
        db.session.commit()
        
        # Generate initial missions
        missions = generate_mission(self.user_id, story.id)
        
        # Update state
        self.state.current_story = story
        self.state.current_node = initial_node
        self.state.active_missions = [missions] if missions else []
        
        # Notify state manager
        state_manager.update_state(self.state.to_dict())
        
        return {
            "story_id": story.id,
            "title": story_data["stories"]["title"],
            "initial_node": {
                "id": initial_node.id,
                "narrative_text": initial_node.narrative_text,
                "is_endpoint": initial_node.is_endpoint,
                "branch_metadata": initial_node.branch_metadata
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

    def make_choice(
        self,
        choice_id: str,
        custom_choice_text: Optional[str] = None,
        story_context: Optional[str] = None,
        characters: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Process a user's story choice and update game state.
        
        Args:
            choice_id (str): ID of the chosen story branch
            custom_choice_text (Optional[str]): Custom choice text if not using predefined choice
            story_context (Optional[str]): Additional context for story continuation
            characters (Optional[List[Dict[str, Any]]]): List of characters involved in the choice
            
        Returns:
            Dict[str, Any]: Updated game state including:
                - current_node: New story node
                - available_choices: List of available choices
                - mission_updates: List of mission updates
                - character_updates: List of character relationship updates
        """
        # Get context manager for story continuation
        context_manager = self.state.get_context_manager()
        
        # Get current story and node
        story = self.state.current_story
        current_node = self.state.current_node
        
        if not story or not current_node:
            raise ValueError("Missing required story or node information")
        
        # Find next node based on choice
        next_node = StoryNode.query.filter_by(
            story_id=story.id,
            parent_id=current_node.id,
            branch_id=choice_id
        ).first()
        
        # If no predefined node found and custom choice provided, create new node
        if not next_node and custom_choice_text:
            next_node = StoryNode(
                narrative_text=custom_choice_text,
                parent_node_id=current_node.id,
                generated_by_ai=True,
                branch_metadata={
                    "story_id": story.id,
                    "choice_id": choice_id,
                    "choice_text": custom_choice_text,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            db.session.add(next_node)
            db.session.commit()
        
        if not next_node:
            raise ValueError(f"No valid node found for choice_id: {choice_id}")
        
        # Update user progress
        self.state.user_progress.current_node_id = next_node.id
        self.state.user_progress.last_active = datetime.utcnow()
        db.session.commit()
        
        # Update missions based on choice
        mission_updates = []
        for mission in self.state.active_missions:
            if update_mission_progress(mission.id, int(mission.progress + 10)):
                mission_updates.append(mission)
        
        # Update character relationships
        character_updates = []
        if characters:
            for character in characters:
                update = self.character_service.update_relationships(
                    self.user_id,
                    story.id,
                    current_node.id,
                    next_node.id,
                    character_id=character.get('id')
                )
                if update:
                    character_updates.extend(update)
        
        # Update state
        self.state.current_node = next_node
        self.state.active_missions = [
            mission for mission in self.state.active_missions
            if mission.id in [m.id for m in mission_updates]
        ]
        
        # Generate next story segment using segment_maker
        next_segment = generate_continuation(
            previous_story=current_node.narrative_text,
            chosen_choice=custom_choice_text or choice_id,
            mission_info={
                "id": next_node.id,
                "title": next_node.narrative_text,
                "status": "in_progress",
                "progress_details": {}
            },
            context_manager=context_manager,
            mood=story.mood,
            narrative_style=story.narrative_style,
            story_context=story_context
        )
        
        # Update node with generated content
        next_node.narrative_text = next_segment["story"]
        next_node.branch_metadata["choices"] = next_segment["choices"]
        db.session.commit()
        
        # Update state manager
        state_manager.update_state(self.state.to_dict())
        
        return {
            "current_node": {
                "id": next_node.id,
                "narrative_text": next_node.narrative_text,
                "is_endpoint": next_node.is_endpoint,
                "branch_metadata": next_node.branch_metadata
            },
            "available_choices": [
                {
                    "id": choice.get("id", choice.get("text", "")),
                    "text": choice.get("text", ""),
                    "cost": choice.get("currency_requirements", {}),
                    "requirements": choice.get("requirements", {})
                } for choice in next_segment.get("choices", [])
            ],
            "mission_updates": [
                {
                    "id": mission.id,
                    "title": mission.title,
                    "progress": mission.progress,
                    "status": mission.status
                } for mission in mission_updates
            ],
            "character_updates": [
                {
                    "id": update.character_id,
                    "relationship": update.relationship_level,
                    "trust": update.trust_level,
                    "loyalty": update.loyalty_level
                } for update in character_updates
            ]
        }

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