# Story Parameter Flow Documentation

## Initial Story Creation

### 1. Form Data Received
When user creates a new story, these parameters are received from the form:
```json
{
  "protagonist_name": "Dave",
  "protagonist_gender": "male",
  "protagonist_level": 1,
  "selected_images": 8,
  "conflict": "Corporate espionage",
  "setting": "Modern Europe",
  "narrative_style": "Modern irreverence (e.g., Christopher Moore)",
  "mood": "High-octane, thrilling, and adventurous"
}
```

### 2. Database Storage
Parameters are stored in the `StoryGeneration` table:
- primary_conflict
- setting
- narrative_style
- mood
These become the persistent parameters for this story.

### 3. Story Node Creation
A root `StoryNode` is created with:
- Generated narrative text
- Branch metadata (including choices)
- Links to the StoryGeneration record

## Choice Processing Flow

### 1. User Makes Choice
When a choice is submitted:
```
POST /make_choice
{
    "story_id": "123",
    "node_id": "456",
    "choice_id": "choice_1"
}
```

### 2. Parameter Recovery
The game engine:
1. Reloads state from database
2. Retrieves story from `StoryGeneration` table using `story_id`
3. Gets fresh parameters:
   - story.primary_conflict
   - story.setting
   - story.narrative_style
   - story.mood
4. Retrieves node_count from UserProgress.node_count
5. Increments and persists node_count in database

### 3. Context Generation
The game engine generates enhanced context:
1. Gets key nodes from active PlotArcs in the database
2. Traverses the story tree to collect ancestor nodes
3. Retrieves mission information from current node
4. Combines these into an optimized context string

### 4. OpenAI Context Building
The context manager:
1. Takes parameters from story record
2. Updates system message with fresh parameters
3. Generates continuation system message with node_count
4. Combines the enhanced context with user message
5. Builds the API request with all context
6. Sends the combined context to OpenAI API

### 5. Context Flow Diagram
```
┌────────────┐        ┌─────────────┐        ┌───────────────┐
│ Database   │───────▶│ GameEngine  │───────▶│ ContextManager│
└────────────┘        └─────────────┘        └───────────────┘
      │                      │                       │
      │                      │                       │
      ▼                      ▼                       ▼
┌────────────┐        ┌─────────────┐        ┌───────────────┐
│ Parameters │        │ Enhanced    │        │ API Request   │
│ - conflict │        │ Context:    │        │ - System msg  │
│ - setting  │        │ - Key nodes │        │ - User msg    │
│ - style    │        │ - Ancestors │        │   with context│
│ - mood     │        │ - Mission   │        │ - Parameters  │
└────────────┘        └─────────────┘        └───────────────┘
```

## Node Count Tracking

### 1. Storage
- Dedicated `node_count` column in `UserProgress` table
- Indexed for efficient queries
- Type-safe integer field

### 2. Update Process
1. `GameState.increment_node_count()` increments in-memory counter
2. Updates `UserProgress.node_count` column
3. Uses proper ORM transactions
4. Commits to database

### 3. Usage in OpenAI Context
- `node_count` is passed to `build_continuation_system_message`
- Used to inform OpenAI of narrative depth 
- Helps maintain narrative coherence and progression

## Enhanced Context Management

### 1. Context Sources
- **Key plot nodes**: Important moments from `PlotArc`
- **Ancestor nodes**: Direct predecessors in story tree
- **Mission information**: Current objectives and progress
- **Character relationships**: Player's relationship with NPCs

### 2. Context Generation
```python
def get_enhanced_context(node_id, max_tokens=3000):
    # 1. Get key nodes from active plot arcs
    plot_arcs = PlotArc.query.filter_by(story_id=story_id, status='active')
    key_node_ids = [id for arc in plot_arcs for id in arc.key_nodes]
    
    # 2. Get ancestor nodes in story tree
    ancestor_nodes = []
    parent_id = current_node.parent_node_id
    while parent_id:
        parent = StoryNode.query.get(parent_id)
        ancestor_nodes.append(parent)
        parent_id = parent.parent_node_id
    
    # 3. Format and return combined context
    # ...
```

### 3. Optimization Techniques
- Token budget management
- Priority-based inclusion
- Content truncation for lengthy segments
- Pre-computed summaries at different detail levels

## Key Files & Responsibilities

### main_routes.py
- Receives form data
- Creates GameEngine instance
- Routes requests to appropriate handlers

### game_engine.py
- Manages story state
- Retrieves parameters from database
- Generates enhanced context
- Updates OpenAI context manager

### context_manager.py
- Builds OpenAI API requests
- Combines story parameters with enhanced context
- Ensures context is properly sent to OpenAI
- Maintains conversation history

### state_manager.py
- Tracks node count
- Generates enhanced context
- Maintains story history buffer
- Manages database interactions

## Common Issues

1. Parameter Loss
   - Parameters stored in StoryGeneration table
   - Must be explicitly retrieved for each continuation
   - Should not rely on form/request data

2. Context Management
   - System message must be updated with fresh parameters
   - Enhanced context must be properly combined with user message
   - Parameters come from database, not request

3. State Synchronization
   - Always reload state before processing
   - Use transaction boundaries
   - Commit changes atomically

4. Context Delivery
   - Ensure enhanced context is included in user message
   - Verify API requests contain the combined context
   - Monitor token usage to avoid limits

## Best Practices

1. Parameter Sources
   - Initial creation: Form data
   - Subsequent calls: Database only
   - Never mix sources

2. State Management
   - Always reload before processing
   - Use transaction boundaries
   - Update context manager with fresh data

3. Error Handling
   - Validate database records exist
   - Check for required parameters
   - Maintain atomic operations

4. Context Enhancement
   - Prioritize key narrative moments
   - Balance detail with token limits
   - Include essential character and mission information
