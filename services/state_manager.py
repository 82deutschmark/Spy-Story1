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
from models import UserProgress, StoryGeneration, StoryNode, Mission, PlotArc
from models.character_data import Character
from database import db
from utils.context_manager import OpenAIContextManager
from datetime import datetime

logger = logging.getLogger(__name__)
# Configure detailed logging
logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.DEBUG)

class GameState:
    """
    Represents the current state of a user's game session.
    
    The user is the protagonist - all other characters are NPCs.
    This class maintains:
    1. Current story progress
    2. Active missions
    3. NPC relationships
    4. Player resources
    5. Story history buffer for narrative continuity
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
        # Create a stateless context manager for API interactions
        self._context_manager = OpenAIContextManager()
        # Track story node count separately (not in context manager)
        self._node_count = 0
        # NEW: Add story history buffer to maintain recent nodes for context
        self._story_history_buffer = []
        self._max_history_nodes = 3  # Keep last 3 nodes
        self.reload_state()
        # After reload, try to get the node count from the dedicated column
        if self.user_progress and self.user_progress.node_count:
            self._node_count = self.user_progress.node_count
            logger.info(f"=== Loaded persistent node count: {self._node_count} ===")
        logger.info(f"=== GameState initialized for user {user_id} ===")
        logger.debug(f"Initial state: story_id={self.user_progress.current_story_id}, node_id={self.user_progress.current_node_id}, node_count={self._node_count}")

    def get_context_manager(self) -> OpenAIContextManager:
        """Get the OpenAIContextManager for this story."""
        logger.debug("=== Getting stateless context manager ===")
        return self._context_manager
        
    def get_node_count(self) -> int:
        """Get the current node count in the story."""
        logger.debug(f"Getting node count: {self._node_count}")
        return self._node_count
        
    def increment_node_count(self) -> int:
        """Increment and return the node count."""
        self._node_count += 1
        logger.info(f"=== Node count incremented to {self._node_count} ===")
        
        # Update the dedicated node_count column using ORM
        try:
            # Use the dedicated column instead of extra_data
            self.user_progress.node_count = self._node_count
            
            # Add the user_progress object to the session and commit the change
            db.session.add(self.user_progress)
            db.session.commit()
            
            logger.info(f"Persisted node_count {self._node_count} to database for user {self.user_id}")
            
        except Exception as e:
            logger.error(f"Failed to persist node count: {str(e)}", exc_info=True)
            db.session.rollback()
            # Don't rollback, we still want to return the incremented count
            
        return self._node_count

    def get_story_parameters(self) -> dict:
        """
        Get parameters needed for story continuation from the current state.
        
        Returns:
            dict: Dictionary containing:
                - mood: Story mood
                - narrative_style: Narrative style
                - conflict: Story conflict
                - setting: Story setting
                - protagonist_name: Name of protagonist
                - protagonist_gender: Gender of protagonist
                - node_count: Current depth in story
        """
        if not self.current_story:
            logger.warning("Cannot get story parameters: no current story")
            return {}
            
        protagonist = {}
        if self.current_node and self.current_node.branch_metadata:
            protagonist = self.current_node.branch_metadata.get("protagonist", {})
            
        parameters = {
            "mood": self.current_story.mood if self.current_story else None,
            "narrative_style": self.current_story.narrative_style if self.current_story else None,
            "conflict": self.current_story.primary_conflict if self.current_story else None,
            "setting": self.current_story.setting if self.current_story else None,
            "protagonist_name": protagonist.get("name"),
            "protagonist_gender": protagonist.get("gender"),
            "node_count": self._node_count
        }
        
        logger.info("=== Retrieved story parameters ===")
        logger.debug(f"Story parameters: {json.dumps(parameters, default=str, indent=2)}")
        return parameters

    def get_enhanced_context(self, node_id: int, max_tokens: int = 3000) -> str:
        """
        Generate optimized context using key plot points and ancestor nodes.
        
        This method prioritizes important narrative moments by combining:
        1. Key nodes from active plot arcs (major plot points)
        2. Direct ancestor nodes in the story tree (recent history)
        3. Additional context from branch metadata
        
        Args:
            node_id (int): Current node ID to generate context for
            max_tokens (int): Approximate maximum tokens to include in context
            
        Returns:
            str: Formatted context text optimized for OpenAI
        """
        try:
            logger.info(f"=== Generating enhanced context for node {node_id} ===")
            
            # Get the current node
            current_node = StoryNode.query.get(node_id)
            if not current_node:
                logger.error(f"Node {node_id} not found")
                return ""
            
            # 1. Get key nodes from active plot arcs
            key_node_ids = []
            plot_arcs = PlotArc.query.filter(
                PlotArc.story_id == current_node.story_id,
                PlotArc.status == 'active'
            ).all()
            
            for arc in plot_arcs:
                if arc.key_nodes:
                    # key_nodes is a JSONB array, so we need to extract the IDs
                    key_node_ids.extend(arc.key_nodes)
            
            # 2. Get ancestors in the node tree path (limit to 5 ancestors)
            ancestor_nodes = []
            parent_id = current_node.parent_node_id
            ancestor_count = 0
            
            while parent_id and ancestor_count < 5:
                parent = StoryNode.query.get(parent_id)
                if parent:
                    ancestor_nodes.append(parent)
                    parent_id = parent.parent_node_id
                    ancestor_count += 1
                else:
                    break
            
            # Reverse the ancestors to get chronological order
            ancestor_nodes.reverse()
            
            # 3. Format context sections
            context_parts = []
            
            # Add key plot points if available
            if key_node_ids:
                key_nodes = StoryNode.query.filter(StoryNode.id.in_(key_node_ids)).all()
                
                if key_nodes:
                    context_parts.append("KEY PLOT POINTS:")
                    for i, node in enumerate(key_nodes, 1):
                        # Limit text to ~300 characters to manage token count
                        truncated_text = node.narrative_text[:300]
                        if len(node.narrative_text) > 300:
                            truncated_text += "..."
                        context_parts.append(f"MOMENT {i}: {truncated_text}")
                    context_parts.append("")  # Empty line for separation
            
            # Add story ancestors for recent history
            if ancestor_nodes:
                context_parts.append("RECENT STORY HISTORY:")
                for i, node in enumerate(ancestor_nodes, 1):
                    # Limit text to ~200 characters to manage token count
                    truncated_text = node.narrative_text[:200]
                    if len(node.narrative_text) > 200:
                        truncated_text += "..."
                    context_parts.append(f"SCENE {i}: {truncated_text}")
                context_parts.append("")  # Empty line for separation
            
            # Add current mission information if available
            if current_node.branch_metadata and "mission_info" in current_node.branch_metadata:
                mission_info = current_node.branch_metadata["mission_info"]
                context_parts.append("CURRENT MISSION:")
                context_parts.append(f"Title: {mission_info.get('title', 'Unknown')}")
                context_parts.append(f"Objective: {mission_info.get('objective', 'Unknown')}")
                context_parts.append(f"Status: {mission_info.get('status', 'Unknown')}")
                context_parts.append(f"Progress: {mission_info.get('progress', 0)}%")
                context_parts.append("")  # Empty line for separation
            
            # Combine all parts into a single context string
            combined_context = "\n".join(context_parts)
            
            # Log context generation info
            logger.info(f"Generated enhanced context with {len(key_node_ids)} key nodes and {len(ancestor_nodes)} ancestor nodes")
            logger.debug(f"Context length: {len(combined_context)} characters")
            
            return combined_context
            
        except Exception as e:
            logger.error(f"Error generating enhanced context: {str(e)}", exc_info=True)
            return ""  # Return empty string on error

    def get_node_context(self, node_id: int) -> Dict[str, Any]:
        """
        Get additional context information for a story node.
        
        Args:
            node_id (int): ID of the node to get context for
            
        Returns:
            Dict[str, Any]: Dictionary containing:
                - character_relationships: Dict of character IDs to relationship info
                - active_missions: List of active mission details
                - story_context: Additional story-specific context
                - narrative_history: History of recent story nodes for continuity
                - enhanced_context: Optimized context using key plot points
        """
        try:
            logger.info(f"=== Getting context for node {node_id} ===")
            
            # Get the node
            node = StoryNode.query.get(node_id)
            if not node:
                logger.error(f"Node {node_id} not found")
                return {
                    "character_relationships": {},
                    "active_missions": [],
                    "story_context": {},
                    "narrative_history": "",
                    "enhanced_context": ""  # New field
                }

            # Get character relationships from user progress
            character_relationships = {}
            if self.user_progress.encountered_characters:
                for char_id, char_info in self.user_progress.encountered_characters.items():
                    character_relationships[char_id] = {
                        "relationship_level": char_info.get("relationship_level", 0),
                        "last_interaction": char_info.get("last_interaction")
                    }

            # Get active missions for this story
            active_missions = []
            if self.user_progress.active_missions:
                missions = Mission.query.filter(
                    Mission.id.in_(self.user_progress.active_missions),
                    Mission.story_id == node.story_id
                ).all()
                
                for mission in missions:
                    active_missions.append({
                        "id": mission.id,
                        "title": mission.title,
                        "description": mission.description,
                        "status": mission.status,
                        "progress": mission.progress,
                        "reward_currency": mission.reward_currency,
                        "reward_amount": mission.reward_amount
                    })

            # Get any additional context from node metadata
            story_context = {}
            if node.branch_metadata:
                story_context = node.branch_metadata.get("story_context", {})
                
            # NEW: Add narrative history to the context
            narrative_history = ""
            if self._story_history_buffer:
                # Format the narrative history with scene numbers
                narrative_history = "\n\n".join([
                    f"SCENE {i+1}:\n{entry['narrative_text']}"
                    for i, entry in enumerate(self._story_history_buffer)
                ])
                logger.info(f"Added narrative history from {len(self._story_history_buffer)} previous nodes")
            
            # NEW: Get enhanced context using key plot points and ancestors
            enhanced_context = self.get_enhanced_context(node_id)

            # Add all context information to the context object
            context = {
                "character_relationships": character_relationships,
                "active_missions": active_missions,
                "story_context": story_context,
                "narrative_history": narrative_history,
                "enhanced_context": enhanced_context  # NEW field
            }
            
            debug_info = {
                'active_missions_count': len(active_missions),
                'character_relationships_count': len(character_relationships),
                'has_story_context': bool(story_context),
                'narrative_history_node_count': len(self._story_history_buffer),
                'enhanced_context_length': len(enhanced_context)  # NEW debug info
            }
            logger.debug(f"Node context: {json.dumps(debug_info, indent=2)}")
            
            return context

        except Exception as e:
            logger.error(f"Error getting node context: {str(e)}")
            return {
                "character_relationships": {},
                "active_missions": [],
                "story_context": {},
                "narrative_history": "",
                "enhanced_context": ""  # Include empty enhanced_context on error
            }

    def to_dict(self) -> Dict[str, Any]:
        """Convert the current state to a dictionary."""
        return {
            "user_id": self.user_id,
            "current_story": {
                "id": self.current_story.id if self.current_story else None,
                "primary_conflict": self.current_story.primary_conflict if self.current_story else None,
                "setting": self.current_story.setting if self.current_story else None,
                "narrative_style": self.current_story.narrative_style if self.current_story else None,
                "mood": self.current_story.mood if self.current_story else None,
                "generated_story": self.current_story.generated_story if self.current_story else None,
                "narrative_text": self.current_node.narrative_text if self.current_node else None
            } if self.current_story else None,
            "current_node": {
                "id": self.current_node.id if self.current_node else None,
                "narrative_text": self.current_node.narrative_text if self.current_node else None,
                "is_endpoint": self.current_node.is_endpoint if self.current_node else None,
                "branch_metadata": self.current_node.branch_metadata if self.current_node else None
            } if self.current_node else None,
            "active_missions": [
                mission.to_dict() for mission in self.active_missions
            ] if self.active_missions else [],
            "user_progress": {
                "user_id": self.user_progress.user_id if self.user_progress else None,
                "current_story_id": self.user_progress.current_story_id if self.user_progress else None,
                "current_node_id": self.user_progress.current_node_id if self.user_progress else None,
                "level": self.user_progress.level if self.user_progress else None,
                "experience_points": self.user_progress.experience_points if self.user_progress else None,
                "currency_balances": self.user_progress.currency_balances if self.user_progress else None,
                "active_missions": self.user_progress.active_missions if self.user_progress else None,
                "completed_missions": self.user_progress.completed_missions if self.user_progress else None,
                "failed_missions": self.user_progress.failed_missions if self.user_progress else None,
                "choice_history": self.user_progress.choice_history if self.user_progress else None,
                "encountered_characters": self.user_progress.encountered_characters if self.user_progress else None
            } if self.user_progress else None
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
        logger.info(f"=== Reloading state for user {self.user_id} ===")
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
            
        # Restore node count from dedicated column
        self._node_count = self.user_progress.node_count
        logger.debug(f"Restored node_count from database: {self._node_count}")
            
        # Debug log to confirm state reload
        logger.debug(f"Reloaded state: Story ID={self.current_story.id if self.current_story else None}, " +
                     f"Node ID={self.current_node.id if self.current_node else None}, " +
                     f"Active Missions={len(self.active_missions)}, " +
                     f"Node Count={self._node_count}")

    def resolve_current_node(self, story_id: Optional[int] = None) -> Optional[StoryNode]:
        """
        Resolve the current story node using a priority-based approach.
        
        Priority order:
        1. User's current node for this story
        2. Story's latest node
        3. Root node for this story
        
        Args:
            story_id (Optional[int]): Story ID to resolve node for, defaults to current story
            
        Returns:
            Optional[StoryNode]: Resolved story node or None if no valid node found
            
        Raises:
            ValueError: If story_id is invalid or story not found
        """
        try:
            logger.info(f"=== Resolving current node for story {story_id or 'current'} ===")
            
            # Use provided story_id or current story
            target_story_id = story_id or (self.current_story.id if self.current_story else None)
            if not target_story_id:
                logger.error("No valid story ID for node resolution")
                raise ValueError("No valid story ID for node resolution")
                
            # Verify the story exists
            story = StoryGeneration.query.get(target_story_id)
            if not story:
                logger.error(f"Story with ID {target_story_id} not found")
                raise ValueError(f"Story with ID {target_story_id} not found")
                
            # Priority 1: User's current node
            if self.user_progress.current_node_id:
                node = StoryNode.query.get(self.user_progress.current_node_id)
                if node:
                    # Validate node belongs to the correct story
                    if node.story_id == target_story_id:
                        logger.info(f"Resolved node from user progress: {node.id} for story {target_story_id}")
                        return node
                    else:
                        logger.warning(f"Current node {node.id} belongs to story {node.story_id}, not target story {target_story_id}. Attempting to find correct node.")
                        # Node exists but belongs to wrong story, continue to next resolution method
                else:
                    logger.warning(f"Current node ID {self.user_progress.current_node_id} is invalid. Attempting to find valid node.")
                    
            # Priority 2: Latest node for story
            latest_node = StoryNode.query.filter_by(story_id=target_story_id)\
                .order_by(StoryNode.created_at.desc())\
                .first()
            if latest_node:
                logger.info(f"Resolved latest node for story: {latest_node.id}")
                return latest_node
                
            # Priority 3: Root node
            root_node = StoryNode.query.filter_by(
                story_id=target_story_id,
                parent_node_id=None
            ).first()
            if root_node:
                logger.info(f"Resolved root node: {root_node.id}")
                return root_node
                
            logger.error(f"No valid node found for story {target_story_id}")
            raise ValueError(f"No valid nodes found for story {target_story_id}")
            
        except Exception as e:
            logger.error(f"Error resolving current node: {str(e)}")
            return None

    def transition_to_node(self, node_id: int, update_progress: bool = True) -> bool:
        """
        Transition the game state to a new node atomically.
        
        This method ensures that all state updates related to a node transition
        happen in a single transaction, maintaining state consistency.
        
        Args:
            node_id (int): ID of the node to transition to
            update_progress (bool): Whether to update user progress
            
        Returns:
            bool: True if transition successful, False otherwise
            
        Raises:
            ValueError: If node_id is invalid or node not found
        """
        try:
            logger.info(f"=== Transitioning to node {node_id} ===")
            
            # Get and validate node
            new_node = StoryNode.query.get(node_id)
            if not new_node:
                logger.error(f"Invalid node ID: {node_id}")
                raise ValueError(f"Invalid node ID: {node_id}")
            
            # NEW: Add current node to history before transitioning to new node
            if self.current_node:
                self._update_story_history(self.current_node)
                logger.debug(f"Added node {self.current_node.id} to history buffer")
            
            # Update current node
            self.current_node = new_node
            
            # Update user progress if requested
            if update_progress:
                self.user_progress.current_node_id = node_id
                self.user_progress.last_active = datetime.utcnow()
                if not self.user_progress.choice_history:
                    self.user_progress.choice_history = []
                if node_id not in self.user_progress.choice_history:
                    self.user_progress.choice_history.append(node_id)
                # NEW: Merge encountered characters into user progress
                if self.current_node and self.current_node.branch_metadata:
                    new_chars = self.current_node.branch_metadata.get("encountered_characters", [])
                    if new_chars:
                        if not self.user_progress.encountered_characters:
                            self.user_progress.encountered_characters = {}
                        for char in new_chars:
                            cid = str(char.get("id"))
                            # Only add if not already present
                            if cid not in self.user_progress.encountered_characters:
                                self.user_progress.encountered_characters[cid] = {
                                    "name": char.get("name", "Unknown"),
                                    "backstory": char.get("backstory", ""),
                                    "plot_lines": char.get("plot_lines", [])
                                }
            
            # Log successful transition
            logger.debug(f"Successfully transitioned to node {node_id}")
            return True
                
        except Exception as e:
            logger.error(f"Error transitioning to node {node_id}: {str(e)}")
            raise  # Re-raise to let caller handle the error

    def _update_story_history(self, node):
        """
        Update story history buffer with current node information.
        
        This method adds the node to the history buffer and maintains the size limit
        by removing the oldest entries when necessary.
        
        Args:
            node: The StoryNode to add to history
        """
        if not node:
            return
            
        # Create history entry with essential information
        history_entry = {
            "id": node.id,
            "narrative_text": node.narrative_text,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Add to history buffer and maintain size limit
        self._story_history_buffer.append(history_entry)
        if len(self._story_history_buffer) > self._max_history_nodes:
            self._story_history_buffer.pop(0)  # Remove oldest entry
            
        logger.debug(f"Story history buffer updated, size: {len(self._story_history_buffer)}")

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

# Note: When handling character data in state transitions, use functions from utils/character_manager.py.
