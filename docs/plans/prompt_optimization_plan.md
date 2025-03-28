# Prompt Optimization Plan: Reducing Redundancy Between Story Maker and Segment Maker

## Problem Statement

We've identified significant redundancy in how story parameters are passed to OpenAI. The same immutable parameters (mood, narrative style, protagonist info) are being duplicated across:

1. System messages in both `story_maker.py` and `segment_maker.py`
2. User messages in both modules
3. Multiple utility functions building similar prompts

This redundancy:
- Wastes tokens in OpenAI API calls
- Creates confusion about the source of truth
- Increases risk of inconsistency between initial story and continuations
- Makes code maintenance more difficult

## Current Flow Analysis

### Initial Story Creation (`story_maker.py`)

1. `GameEngine.start_new_story()` calls `generate_story()`
2. `generate_story()` creates a `StoryGenerator` and calls `generate_story()`
3. `StoryGenerator.generate_story()` builds:
   - System message via `StoryPromptBuilder.build_system_message(mood, narrative_style)`
   - User message via `StoryPromptBuilder.build_story_prompt(conflict, setting, narrative_style, mood, ...)`
4. Both messages contain the same mood, narrative style and other immutable parameters
5. `OpenAIContextManager` sends both redundant messages to the API

### Story Continuation (`segment_maker.py`)

1. `GameEngine.make_choice()` calls `generate_continuation()`
2. `generate_continuation()` creates a `StoryContinuationHandler` and calls `generate_continuation()`
3. `StoryContinuationHandler.generate_continuation()` builds:
   - System message via `StoryPromptBuilder.build_system_message(mood, narrative_style)`
   - User message via `_build_prompt()` which includes the same immutable parameters
4. A similar duplication occurs as in initial story creation

## Key Findings

1. **Context Manager Underutilization**: `OpenAIContextManager` should maintain immutable parameters but doesn't effectively track them.
2. **System/User Message Confusion**: System messages should set global parameters and style, while user messages should focus on specific requests.
3. **No Continuation Tracking**: No clear tracking of "page number" or story progression to inform segment_maker.
4. **Shared Builder Classes**: The same `StoryPromptBuilder` is being used differently in both modules without clear separation of concerns.

## Solution Proposal

### 1. Clear Separation of Concerns

- **System Messages**: Should ONLY contain immutable parameters and global instructions
- **User Messages**: Should ONLY contain request-specific details

### 2. Enhanced Context Manager

Enhance `OpenAIContextManager` to:
- Store immutable parameters (mood, narrative style, protagonist info) centrally
- Track node count/"page number" for story progression
- Provide distinct system message templates for initial vs. continuation states

### 3. Distinct Message Builders

Create clear distinctions between:
- `InitialStoryPromptBuilder`: For creating new stories
- `ContinuationPromptBuilder`: For continuing existing stories

### 4. Implementation Plan

1. **Modify `OpenAIContextManager`**:
   - Add `story_state` dictionary to track immutable parameters
   - Add `node_count` tracking
   - Add method to get appropriate system message template

2. **Update `story_maker.py`**:
   - Move immutable parameters to system message only
   - Keep only story-specific details in user message
   - Send immutable parameters to context manager

3. **Update `segment_maker.py`**:
   - Ensure it gets immutable parameters from context manager
   - Focus user message on choice context and mission info
   - Clear indication of continuation vs. new story

4. **Update `GameEngine`**:
   - Ensure proper state transfer between story creation and continuation
   - Increment node counter when advancing story

## Code Changes Outline

### 1. `OpenAIContextManager` Changes:

```python
def __init__(self, system_prompt: str = ""):
    # Add story state tracking
    self.story_state = {
        "mood": None,
        "narrative_style": None, 
        "protagonist_name": None,
        "protagonist_gender": None,
        "node_count": 0
    }
    # Existing code...

def update_story_state(self, **kwargs):
    """Update the story state with new parameters."""
    self.story_state.update(kwargs)
    
    # Auto-rebuild system message when state changes
    self._rebuild_system_message()

def increment_node_count(self):
    """Increment the node counter for story progression."""
    self.story_state["node_count"] = self.story_state.get("node_count", 0) + 1
    
def get_appropriate_system_message(self, is_continuation=False):
    """Get the appropriate system message based on state."""
    if is_continuation:
        return self._build_continuation_system_message()
    else:
        return self._build_initial_system_message()
```

### 2. Removal of Duplicate Parameters

From `story_maker.py`:
```python
# BEFORE
story_prompt = StoryPromptBuilder.build_story_prompt(
    conflict=final_conflict,
    setting=final_setting,
    narrative_style=final_narrative,  # DUPLICATE
    mood=final_mood,  # DUPLICATE
    character_info=character_info,
    # ...
)

# AFTER
story_prompt = StoryPromptBuilder.build_story_prompt(
    conflict=final_conflict,
    setting=final_setting,
    character_info=character_info,
    # No mood or narrative_style here
)

# Update context manager with immutable parameters
context_manager.update_story_state(
    mood=final_mood,
    narrative_style=final_narrative,
    protagonist_name=protagonist_name,
    protagonist_gender=protagonist_gender
)
```

### 3. Distinct System Messages

```python
def _build_initial_system_message(self):
    """Build initial story generation system message."""
    mood = self.story_state.get("mood", "default mood")
    style = self.story_state.get("narrative_style", "default style")
    
    return f"""You are creating a NEW spy thriller story with a {mood} tone and {style} style.
    This is the first segment of the adventure. Create an engaging opening with character introductions.
    [Rest of initial story instructions...]
    """

def _build_continuation_system_message(self):
    """Build story continuation system message."""
    mood = self.story_state.get("mood", "default mood")
    style = self.story_state.get("narrative_style", "default style")
    node_count = self.story_state.get("node_count", 0)
    
    return f"""You are CONTINUING an existing spy thriller story (segment #{node_count}) with a {mood} tone and {style} style.
    Build on previous events and advance the plot based on the player's choice.
    [Rest of continuation instructions...]
    """
```

## Benefits

1. **Reduced Token Usage**: Eliminating duplication reduces API costs
2. **Clear Source of Truth**: Immutable parameters stored in one place
3. **Better State Tracking**: Node counting provides story progression awareness
4. **Cleaner Code**: Clear separation between initial story and continuation logic
5. **Improved Maintainability**: Changes to immutable parameters only need to be made in one place

## Next Steps

1. Implement `OpenAIContextManager` enhancements
2. Update `story_maker.py` to use the enhanced context manager
3. Update `segment_maker.py` to use the enhanced context manager
4. Test with simple story creation and continuation scenarios
5. Measure token usage before and after changes 