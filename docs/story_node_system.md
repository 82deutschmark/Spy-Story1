# Story Node System Documentation

## Current Architecture

### Core Models
1. `StoryGeneration`
   - Main container for story content
   - Contains metadata (conflict, setting, style, mood)
   - Has `generated_story` JSONB field storing story text and choices
   - Links to current node via `current_node_id`

2. `StoryNode`
   - Represents individual story segments
   - Contains `narrative_text`, `branch_metadata`
   - Links to parent nodes via `parent_node_id`
   - Contains `branch_metadata` with:
     - story_id
     - choice_id
     - character_ids: List of character IDs involved in this node
     - character_relationships: Character relationship states
   - Forms tree structure of narrative
   - Implements `to_dict()` for state serialization with fields:
     - Basic information (id, story_id, narrative_text)
     - Status flags (is_endpoint, generated_by_ai)
     - Timestamps (created_at)
     - Metadata (branch_metadata)
     - Relationships (parent_node_id, character_id, achievement_id)
     - Branch information (branch_id, choice_id)
     - Character tracking (character_ids, character_relationships)

3. `StoryChoice`
   - Connects story nodes
   - Contains `node_id` (source) and `next_node_id` (target)
   - Has `choice_text` and `currency_requirements`
   - Now includes `character_id` for character-specific choices

### Character Integration
```python
# Example branch_metadata structure
branch_metadata = {
    "story_id": 123,
    "choice_id": "choice_1",
    "character_ids": [1, 2, 3],  # All characters involved in this node
    "character_relationships": {
        "1": {"relationship_level": 3, "trust": 75},
        "2": {"relationship_level": 2, "trust": 45}
    },
    "choices": [
        {
            "choice_id": "unique_id",
            "text": "Ask for help",
            "character_id": 1  # Character involved in this choice
        }
    ]
}
```

### Node Resolution System
The system now uses a priority-based approach to resolve the current story node:

1. Priority Order:
   ```
   1. User's current node for this story
   2. Story's latest node
   3. Root node for this story
   ```

2. State Transitions:
   ```python
   GameState
   ├── resolve_current_node()
   │   └── Priority-based node resolution
   ├── transition_to_node()
   │   └── Atomic state updates
   └── get_node_context()
       └── Rich context retrieval
   ```

3. Node Context:
   ```
   NodeContext
   ├── Parent Chain
   │   └── Narrative history
   ├── Character Relationships
   │   └── Current state
   ├── Active Missions
   │   └── Progress tracking
   └── Story Metadata
       └── Branch information
   ```

### State Management
- User progress tracks both `current_story_id` and `current_node_id`
- Node transitions are handled atomically with proper transaction management
- State changes trigger notifications to all registered listeners
- Rich context is maintained for story continuity

### Error Handling
```python
try:
    # Resolve node with priority system
    current_node = game_state.resolve_current_node(story_id)
    if not current_node:
        handle_missing_node()
        
    # Atomic transition
    if not game_state.transition_to_node(current_node.id):
        handle_transition_failure()
        
    # Get full context
    node_context = game_state.get_node_context(current_node.id)
except Exception as e:
    handle_error(e)
```

## Implementation Notes

### State Transitions
1. All state changes use database transactions
2. State consistency is maintained across models
3. Changes are logged for debugging
4. Rollback mechanisms are in place

### Performance Considerations
- Node resolution uses efficient database queries
- Context retrieval is optimized
- State updates are batched where possible
- Proper indexing on key fields

### Security Measures
- All state transitions are validated
- Node access is verified
- Transaction boundaries are properly maintained
- Error states are handled gracefully

## Future Tasks

### High Priority
1. Implement node caching for frequently accessed paths
2. Add state validation middleware
3. Enhance error recovery mechanisms
4. Improve state synchronization with Unity client

### Medium Priority
1. Add node archiving system
2. Implement state history tracking
3. Add performance monitoring
4. Enhance debugging tools

### Low Priority
1. Add node visualization tools
2. Implement state export/import
3. Add state comparison tools
4. Create node relationship graphs

## Identified Issues

### 1. Node ID Resolution
- `storyboard` route fails to properly resolve node_id
- Checking `hasattr(story, 'node_id')` is incorrect
- No direct link between StoryGeneration and current node

### 2. State Management
- User progress tracks `current_story_id` but not consistently `current_node_id`
- Node transitions not properly tracked in user state
- Missing validation in ChoiceHandler initialization

### 3. Frontend Issues
- Choice forms missing required node_id
- JavaScript initialization fails due to missing state
- Form submission falls back to regular POST

## Required Changes

### 1. Database/Model Changes
```python
class StoryGeneration:
    # Add relationship to current node
    current_node_id = Column(Integer, ForeignKey('story_node.id'))
    current_node = relationship('StoryNode', foreign_keys=[current_node_id])

class UserProgress:
    # Ensure these fields exist
    current_node_id = Column(Integer, ForeignKey('story_node.id'))
    current_story_id = Column(Integer, ForeignKey('story_generation.id'))
```

### 2. Route Changes
```python
@main_bp.route('/storyboard/<int:story_id>')
def storyboard(story_id):
    # Get story and user progress
    story = StoryGeneration.query.get_or_404(story_id)
    user_progress = get_or_create_user_progress()
    
    # Node ID Resolution Priority:
    # 1. User's current_node_id for this story
    # 2. Story's current_node_id
    # 3. Most recent node for this story
    # 4. Create new root node
    
    node_id = resolve_current_node_id(story_id, user_progress)
    
    # Update template context
    template_context = {
        'story': story_data,
        'story_id': story_id,
        'node_id': node_id,  # Now guaranteed to exist
        # ... other context ...
    }
```

### 3. JavaScript Changes
```javascript
// ChoiceHandler.js
class ChoiceHandler {
    initializeState() {
        // Add robust validation
        const requiredInputs = [
            'story_id',
            'node_id',
            'story_context'
        ];
        
        const missingInputs = requiredInputs.filter(input => {
            const element = document.querySelector(`input[name="${input}"]`);
            return !element || !element.value;
        });
        
        if (missingInputs.length > 0) {
            throw new Error(`Missing required inputs: ${missingInputs.join(', ')}`);
        }
        
        // Set state with validated values
        this.currentState = {
            story_id: document.querySelector('input[name="story_id"]').value,
            node_id: document.querySelector('input[name="node_id"]').value,
            story_context: document.querySelector('input[name="story_context"]').value,
            characters: Array.from(document.querySelectorAll('input[name="characters[]"]'))
                .map(input => input.value)
        };
    }
}
```

### 4. Template Changes
```html
<!-- storyboard.html -->
<form method="POST" action="{{ url_for('main.make_choice') }}" 
      class="choice-form" data-form-type="choice">
    <!-- Required fields -->
    <input type="hidden" name="story_id" value="{{ story_id }}" required>
    <input type="hidden" name="node_id" value="{{ node_id }}" required>
    <input type="hidden" name="story_context" value="{{ story.story }}" required>
    <!-- ... other fields ... -->
</form>
```

## Implementation Plan

### Phase 1: Model Updates
1. Add current_node relationship to StoryGeneration
2. Ensure UserProgress has required fields
3. Create migration script

### Phase 2: Backend Logic
1. Implement node_id resolution logic
2. Update storyboard route
3. Add validation middleware

### Phase 3: Frontend Updates
1. Update ChoiceHandler initialization
2. Add error recovery logic
3. Improve form validation

### Phase 4: Testing
1. Test node resolution logic
2. Verify state persistence
3. Test error handling
4. Validate choice submission flow

## Notes
- All changes must maintain backward compatibility
- Consider adding database constraints
- Add logging for state transitions
- Consider adding node validation middleware
- Document all state transitions 