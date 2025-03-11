
import logging
from typing import Dict, Any, Optional
import json

logger = logging.getLogger(__name__)

class GameStateManager:
    """
    Manages the game state across different interfaces (Web, Unity)
    This class follows the Observer pattern to notify listeners of state changes
    """
    
    def __init__(self):
        self._listeners = []
        self._current_state = {}
    
    def add_listener(self, listener):
        """Add a listener to be notified of state changes"""
        if listener not in self._listeners:
            self._listeners.append(listener)
    
    def remove_listener(self, listener):
        """Remove a listener"""
        if listener in self._listeners:
            self._listeners.remove(listener)
    
    def update_state(self, state_update: Dict[str, Any]):
        """Update the current state and notify listeners"""
        self._current_state.update(state_update)
        self._notify_listeners()
    
    def get_state(self) -> Dict[str, Any]:
        """Get the current state"""
        return self._current_state.copy()
    
    def _notify_listeners(self):
        """Notify all listeners of state change"""
        for listener in self._listeners:
            try:
                listener.on_state_changed(self._current_state)
            except Exception as e:
                logger.error(f"Error notifying listener: {str(e)}")
    
    def serialize_state(self) -> str:
        """Serialize the current state to JSON string"""
        return json.dumps(self._current_state)
    
    def load_state(self, state_json: str):
        """Load state from JSON string"""
        try:
            self._current_state = json.loads(state_json)
            self._notify_listeners()
        except Exception as e:
            logger.error(f"Error loading state: {str(e)}")

# Create a singleton instance
state_manager = GameStateManager()

class StateListener:
    """Interface for state change listeners"""
    
    def on_state_changed(self, new_state: Dict[str, Any]):
        """Called when the state changes"""
        pass


class WebUIStateListener(StateListener):
    """Updates the web UI when the game state changes"""
    
    def on_state_changed(self, new_state: Dict[str, Any]):
        """Handle state change for web UI"""
        # This would typically use JavaScript to update the UI
        # For now, we'll just log the change
        logger.debug(f"Web UI state updated: {new_state.keys()}")


class UnityStateListener(StateListener):
    """Sends state updates to Unity client"""
    
    def __init__(self, connection_id: Optional[str] = None):
        self.connection_id = connection_id
    
    def on_state_changed(self, new_state: Dict[str, Any]):
        """Handle state change for Unity client"""
        if not self.connection_id:
            logger.debug("No Unity connection ID, skipping state update")
            return
        
        # In a real implementation, this would send data to the Unity client
        # For now, we'll just log the change
        logger.debug(f"Unity state update for connection {self.connection_id}: {new_state.keys()}")


# Register web UI listener by default
web_listener = WebUIStateListener()
state_manager.add_listener(web_listener)
