# Story Node System Documentation

## Current Architecture

### Core Models
1. `StoryGeneration`
   - Main container for story content
   - Contains metadata (conflict, setting, style, mood)
   - Has `generated_story` JSONB field storing story text and choices
   - Links to characters via many-to-many relationship

2. `StoryNode`
   - Represents individual story segments
   - Contains `narrative_text`, `branch_metadata`
   - Links to parent nodes via `parent_node_id`
   - Forms tree structure of narrative
   - Implements `to_dict()` for state serialization with fields:
     - Basic information (id, story_id, narrative_text)
     - Status flags (is_endpoint, generated_by_ai)
     - Timestamps (created_at)
     - Metadata (branch_metadata)
     - Relationships (parent_node_id, character_id, achievement_id)

3. `StoryChoice`
   - Connects story nodes
   - Contains `node_id` (source) and `next_node_id` (target)
   - Has `choice_text` and `currency_requirements`
   - Includes `character_id` for character-specific choices

## Enhanced Branch Metadata Structure
The `branch_metadata` JSONB field is critical for story continuity and should contain:

```python
# Complete branch_metadata structure
branch_metadata = {
    # Story context
    "story_id": 123,
    "choice_id": "choice_1",  # If derived from a choice
    "branch_id": "unique_branch_id",
    
    # Character information
    "characters": [1, 2, 3],  # Character IDs involved in this node
    "character_details": [
        {
            "id": 1,
            "name": "Character Name",
            "character_role": "mission-giver",
            "character_traits": {"trait1": 5, "trait2": 3},
            "backstory": "Character backstory text",
            "plot_lines": ["Plot line 1", "Plot line 2"]
        }
    ],
    "character_relationships": {
        "1": {"relationship_level": 3, "trust": 75},
        "2": {"relationship_level": 2, "trust": 45}
    },
    
    # Mission information
    "mission_info": {
        "id": 1,
        "title": "Mission Title",
        "objective": "Mission objective description",
        "status": "in_progress",
        "progress": 35
    },
    
    # Player choice context
    "choices": [
        {
            "choice_id": "unique_id",
            "text": "Choice description",
            "consequence": "Outcome description",
            "type": "direct/risky/social",
            "character_id": 1  # Character involved in choice (if any)
        }
    ],
    
    # Protagonist information
    "protagonist": {
        "name": "Protagonist Name",
        "gender": "Protagonist Gender",
        "level": 2
    },
    
    # State tracking
    "timestamp": "ISO datetime",
    "story_context": "Brief context from previous nodes"
}
```

## Initial StoryNode Requirements
For the first node in a story:

1. **Complete Character Context**: Must include all selected characters with full details
2. **Protagonist Information**: Name, gender, level, and other relevant attributes
3. **Initial Choices**: All available choices with proper IDs and metadata
4. **Mission Foundation**: Initial mission state or setup information
5. **Story Parameters**: Conflict, setting, style, and mood should be accessible

## Node Resolution System
The system uses a priority-based approach to resolve the current story node:

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

## Implementation Best Practices

### Character Persistence
1. Always store complete character details in initial node
2. Include character IDs in all nodes where they appear
3. Update character relationship data with each node
4. Preserve character traits, backstory, and plot lines

### Mission Tracking
1. Include complete mission information in branch_metadata
2. Update mission progress with each node
3. Record mission-critical events
4. Link characters to their relevant missions

### Context Continuity
1. Maintain references to previous node and choices
2. Preserve protagonist information across nodes
3. Include timestamp for chronological tracking
4. Store narrative context for AI coherence

### State Management Improvements
1. **Transaction Safety**: All state changes use database transactions
2. **Character Enrichment**: Characters should carry full context
3. **Mission Integration**: Missions should be directly linked to nodes
4. **Node Validation**: Validate branch_metadata structure consistency

## Implementation Plan

### Phase 1: StoryNode Enhancement
- Update GameEngine.start_new_story to store comprehensive branch_metadata
- Ensure all character details are included in initial node
- Add proper mission context to branch_metadata
- Standardize choice structure

### Phase 2: Context Continuity
- Improve character data transfer between segments
- Standardize protagonist info persistence
- Enhance mission tracking across nodes
- Implement better error recovery

### Phase 3: Query Optimization
- Add indexes for efficient node retrieval
- Optimize parent-child node traversal
- Improve node resolution performance
- Add monitoring for state transitions

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
