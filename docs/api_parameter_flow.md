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

### 3. OpenAI Context Building
The context manager:
1. Takes parameters from story record
2. Updates system message with fresh parameters
3. Maintains conversational context
4. Builds the API request

## Key Files & Responsibilities

### main_routes.py
- Receives form data
- Creates GameEngine instance
- Routes requests to appropriate handlers

### game_engine.py
- Manages story state
- Retrieves parameters from database
- Updates OpenAI context manager

### context_manager.py
- Builds OpenAI API requests
- Maintains conversation history
- Updates system message with parameters

## Common Issues

1. Parameter Loss
   - Parameters stored in StoryGeneration table
   - Must be explicitly retrieved for each continuation
   - Should not rely on form/request data

2. Context Management
   - System message must be updated with fresh parameters
   - Conversation history should be maintained
   - Parameters come from database, not request

3. State Synchronization
   - Always reload state before processing
   - Use transaction boundaries
   - Commit changes atomically

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
