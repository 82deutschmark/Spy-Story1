"""
State Manager for Story Game
==============================

This module manages the game state across different interfaces (Web UI and Unity),
ensuring consistent state synchronization and proper event handling throughout
the spy story game.

Key Features:
------------
- Game state management and synchronization
- Observer pattern for state change notifications
- Multi-interface state consistency (Web/Unity)
- Player progress tracking
- Mission and story state management
- Character relationship state tracking

The service ensures:
1. Game state remains consistent across all interfaces
2. State changes are properly propagated to all listeners
3. Critical game data is properly persisted
4. State history is maintained for debugging
5. Efficient state updates and notifications

Dependencies:
------------
- Database models (UserProgress, Mission, Character)
- Web UI components
- Unity game client interface
- Story progression system
- Mission management system
"""

import logging
from typing import Dict, Any, Optional, List
import json
from models import UserProgress, StoryGeneration, StoryNode, Mission
from models.character_data import Character
from database import db
from utils.context_manager import OpenAIContextManager

logger = logging.getLogger(__name__)

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
        self._context_manager = OpenAIContextManager()
        self.reload_state()

    def get_context_manager(self) -> OpenAIContextManager:
        """Get the OpenAIContextManager for this story."""
        return self._context_manager

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
            user_progress = UserProgress(user_id=self.user_id)
            db.session.add(user_progress)
            db.session.commit()
        return user_progress

    def reload_state(self):
        """Refresh game state from database"""
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

class GameStateManager:
    """
    Manages the game state for the Spy Story game across different interfaces (Web UI and Unity).
    
    This class follows the Observer pattern to notify listeners of state changes and maintains
    the current game state including:
    - Player's current mission status
    - Character stats and progression
    - Story progression and choices made
    - Game world state and consequences
    
    The state manager ensures consistent state synchronization between the web interface
    and Unity game client.
    """
    
    def __init__(self):
        self._listeners = []
        self._current_state = {}
    
    def add_listener(self, listener):
        """Add a listener to be notified of state changes."""
        if listener not in self._listeners:
            self._listeners.append(listener)
    
    def remove_listener(self, listener):
        """Remove a listener from receiving state updates."""
        if listener in self._listeners:
            self._listeners.remove(listener)
    
    def update_state(self, state_update: Dict[str, Any]):
        """Update the current game state and notify all listeners."""
        self._current_state.update(state_update)
        self._notify_listeners()
    
    def get_state(self) -> Dict[str, Any]:
        """Get a copy of the current game state."""
        return self._current_state.copy()
    
    def _notify_listeners(self):
        """Notify all registered listeners of state changes."""
        for listener in self._listeners:
            listener.on_state_changed(self._current_state)
    
    def serialize_state(self) -> str:
        """Serialize the current game state to JSON string."""
        return json.dumps(self._current_state)
    
    def load_state(self, state_json: str):
        """Load a previously saved game state from JSON string."""
        self._current_state = json.loads(state_json)
        self._notify_listeners()

# Create a singleton instance
state_manager = GameStateManager()

class WebUIStateListener:
    """Updates the web-based game interface when the game state changes."""
    
    def on_state_changed(self, new_state: Dict[str, Any]):
        """Handle state change for web UI by updating relevant UI components."""
        logger.debug(f"Web UI state updated: {new_state.keys()}")

class UnityStateListener:
    """Manages state synchronization with the Unity game client."""
    
    def __init__(self, connection_id: Optional[str] = None):
        self.connection_id = connection_id
    
    def on_state_changed(self, new_state: Dict[str, Any]):
        """Handle state changes for Unity client."""
        if not self.connection_id:
            logger.debug("No Unity connection ID, skipping state update")
            return
        logger.debug(f"Unity state update for connection {self.connection_id}: {new_state.keys()}")

# Register web UI listener by default
web_listener = WebUIStateListener()
state_manager.add_listener(web_listener)
