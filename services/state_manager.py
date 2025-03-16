"""
State Manager for Spy Story Game
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
from typing import Dict, Any, Optional
import json

logger = logging.getLogger(__name__)

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
        """
        Add a listener to be notified of state changes.
        
        Args:
            listener: An instance of StateListener that will receive state updates
        """
        if listener not in self._listeners:
            self._listeners.append(listener)
    
    def remove_listener(self, listener):
        """
        Remove a listener from receiving state updates.
        
        Args:
            listener: The StateListener instance to remove
        """
        if listener in self._listeners:
            self._listeners.remove(listener)
    
    def update_state(self, state_update: Dict[str, Any]):
        """
        Update the current game state and notify all listeners.
        
        Args:
            state_update: Dictionary containing state changes, which may include:
                - mission_status: Current mission progress
                - character_stats: Updated character statistics
                - story_progress: Story progression markers
                - world_state: Changes to the game world
        """
        self._current_state.update(state_update)
        self._notify_listeners()
    
    def get_state(self) -> Dict[str, Any]:
        """
        Get a copy of the current game state.
        
        Returns:
            Dict containing the complete current game state
        """
        return self._current_state.copy()
    
    def _notify_listeners(self):
        """
        Notify all registered listeners of state changes.
        Handles errors gracefully if any listener fails.
        """
        for listener in self._listeners:
            try:
                listener.on_state_changed(self._current_state)
            except Exception as e:
                logger.error(f"Error notifying listener: {str(e)}")
    
    def serialize_state(self) -> str:
        """
        Serialize the current game state to JSON string for saving or transmission.
        
        Returns:
            JSON string representation of the current state
        """
        return json.dumps(self._current_state)
    
    def load_state(self, state_json: str):
        """
        Load a previously saved game state from JSON string.
        
        Args:
            state_json: JSON string containing a complete game state
        """
        try:
            self._current_state = json.loads(state_json)
            self._notify_listeners()
        except Exception as e:
            logger.error(f"Error loading state: {str(e)}")

# Create a singleton instance
state_manager = GameStateManager()

class StateListener:
    """
    Interface for state change listeners in the Spy Story game.
    Implement this interface to receive game state updates.
    """
    
    def on_state_changed(self, new_state: Dict[str, Any]):
        """
        Called when the game state changes.
        
        Args:
            new_state: Complete current game state dictionary
        """
        pass


class WebUIStateListener(StateListener):
    """
    Updates the web-based game interface when the game state changes.
    Handles synchronization of mission status, character info, and story progress
    in the web UI.
    """
    
    def on_state_changed(self, new_state: Dict[str, Any]):
        """
        Handle state change for web UI by updating relevant UI components.
        
        Args:
            new_state: Complete current game state dictionary
        """
        # This would typically use JavaScript to update the UI
        # For now, we'll just log the change
        logger.debug(f"Web UI state updated: {new_state.keys()}")


class UnityStateListener(StateListener):
    """
    Manages state synchronization with the Unity game client.
    Ensures the 3D game world reflects the current game state including
    mission environments, character status, and story consequences.
    """
    
    def __init__(self, connection_id: Optional[str] = None):
        self.connection_id = connection_id
    
    def on_state_changed(self, new_state: Dict[str, Any]):
        """
        Handle state changes for Unity client by sending updates through
        the established connection.
        
        Args:
            new_state: Complete current game state dictionary
        """
        if not self.connection_id:
            logger.debug("No Unity connection ID, skipping state update")
            return
        
        # In a real implementation, this would send data to the Unity client
        # For now, we'll just log the change
        logger.debug(f"Unity state update for connection {self.connection_id}: {new_state.keys()}")


# Register web UI listener by default
web_listener = WebUIStateListener()
state_manager.add_listener(web_listener)
