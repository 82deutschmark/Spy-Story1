# Story Context Enhancement Plan

## Problem Statement
Currently, when generating story continuations, OpenAI doesn't have access to the full history of previous story events. It only has access to the most recent node's information, which limits narrative coherence and continuity.

## Solution Overview
Implement a history buffer system that maintains recent story nodes and includes them in the context sent to OpenAI for story generation/continuation.

## Implementation Steps

### 1. Add Story History Buffer to GameState ✅
Add a buffer to maintain the most recent story nodes for context.

```python
# In services/state_manager.py
class GameState:
    def __init__(self, user_id: str):
        # Existing initialization
        self.user_id = user_id
        self.user_progress = self._load_user_progress()
        self.current_story = None
        self.current_node = None
        self.active_missions = []
        self._context_manager = OpenAIContextManager()
        
        # New: Add story history buffer
        self._story_history_buffer = []
        self._max_history_nodes = 3  # Keep last 3 nodes
        
        self.reload_state()
```

### 2. Update History on Node Transitions ✅
Modify the `transition_to_node` method to store the previous node in the history buffer.

```python
# In services/state_manager.py
def transition_to_node(self, node_id: int, update_progress: bool = True) -> bool:
    try:
        # Get and validate node
        new_node = StoryNode.query.get(node_id)
        if not new_node:
            logger.error(f"Invalid node ID: {node_id}")
            raise ValueError(f"Invalid node ID: {node_id}")
        
        # New: Add current node to history before transitioning
        if self.current_node:
            self._update_story_history(self.current_node)
            
        # Update current node
        self.current_node = new_node
        
        # Continue with existing code...
        return True
                
    except Exception as e:
        logger.error(f"Error transitioning to node {node_id}: {str(e)}")
        raise

def _update_story_history(self, node):
    """Update story history buffer with current node information."""
    history_entry = {
        "id": node.id,
        "narrative_text": node.narrative_text,
        "timestamp": datetime.utcnow()
    }
    
    # Add to history buffer and maintain size limit
    self._story_history_buffer.append(history_entry)
    if len(self._story_history_buffer) > self._max_history_nodes:
        self._story_history_buffer.pop(0)  # Remove oldest entry
```

### 3. Enhance get_node_context Method ✅
Modify the method to include narrative history in the returned context.

```python
# In services/state_manager.py
def get_node_context(self, node_id: int) -> Dict[str, Any]:
    try:
        # Existing code to get node and character relationships
        
        # New: Add narrative history to the context
        narrative_history = ""
        if self._story_history_buffer:
            narrative_history = "\n\n".join([
                f"SCENE {i+1}:\n{entry['narrative_text']}"
                for i, entry in enumerate(self._story_history_buffer)
            ])
        
        context = {
            "character_relationships": character_relationships,
            "active_missions": active_missions,
            "story_context": story_context,
            "narrative_history": narrative_history  # New field
        }
        
        return context
        
    except Exception as e:
        logger.error(f"Error getting node context: {str(e)}")
        return {
            "character_relationships": {},
            "active_missions": [],
            "story_context": {},
            "narrative_history": ""
        }
```

### 4. Update Prompt Building in segment_maker.py ✅
Modify the prompt building logic to include the narrative history in the user message.

```python
# In services/segment_maker.py
def _build_prompt(
    self,
    chosen_choice: str,
    mission_info: Dict[str, Any],
    help_instruction: str,
    story_context: Optional[str] = "",
    existing_characters: Optional[List[Dict[str, Any]]] = None,
    narrative_history: Optional[str] = None  # New parameter
) -> str:
    """Build a consolidated prompt for story continuation."""
    prompt_parts = [
        "Continue the story based on the following details:",
        "",
        "PLAYER'S CHOICE:",
        chosen_choice,
        ""
    ]
    
    # Add narrative history if available
    if narrative_history:
        prompt_parts.extend([
            "PREVIOUS EVENTS:",
            narrative_history,
            ""
        ])
    
    # Continue with existing prompt sections
    prompt_parts.extend([
        "CURRENT MISSION:",
        f"Title: {mission_info.get('title', 'Unknown')}",
        # Other mission info...
    ])
    
    # Rest of the existing prompt building logic
    
    return "\n".join(prompt_parts)
```

### 5. Update the Game Engine ✅
Modify the make_choice method in game_engine.py to pass the narrative history to generate_continuation.

```python
# In services/game_engine.py
# In make_choice method
next_segment = generate_continuation(
    previous_story=current_node.narrative_text,
    chosen_choice=custom_choice_text or choice_id,
    mission_info=mission_info,
    mood=story.mood,
    narrative_style=story.narrative_style,
    conflict=conflict,
    setting=setting,
    story_context=story_context or "",
    existing_characters=char_info,
    node_count=node_count,
    narrative_history=node_context.get("narrative_history", "")  # New parameter
)
```

### 6. Update StoryContinuationHandler.generate_continuation ✅
Modify the method to accept and pass along the narrative history.

```python
# In services/segment_maker.py
def generate_continuation(
    self,
    previous_story: str,
    chosen_choice: str,
    mission_info: Dict[str, Any],
    mood: Optional[str] = None,
    narrative_style: Optional[str] = None,
    # Other parameters...
    narrative_history: Optional[str] = None  # New parameter
) -> Dict[str, Any]:
    # Existing code...
    
    # Build prompt
    prompt = self._build_prompt(
        chosen_choice=chosen_choice,
        mission_info=mission_info,
        help_instruction=help_instruction,
        story_context="\n".join(context_additions),
        existing_characters=formatted_characters,
        narrative_history=narrative_history  # Pass to prompt builder
    )
    
    # Rest of the existing method...
```

## Implementation Considerations

### Token Management
- Monitor token usage carefully, as adding narrative history will increase the context length
- The 3-node history buffer is a balance, but can be adjusted based on token limit observations
- If needed, implement a summarization step for longer narratives

### Testing Strategy
1. Test with a simple chain of 3-4 nodes to verify history is preserved
2. Check that story continuations reference events from previous nodes
3. Verify that OpenAI responses maintain narrative continuity 

### Fallback Mechanism
- If token limits are exceeded, implement a fallback mechanism to reduce history
- Possibly implement a system to summarize longer history entries

## Potential Future Improvements

1. Implement a more sophisticated history storage system with summarization
2. Add feature toggles to enable/disable history based on story complexity
3. Explore using embeddings to maintain a more semantic representation of story history

## Implementation Status
All steps have been completed! The story context enhancement system is now fully implemented. 