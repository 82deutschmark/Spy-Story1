# Updated System Documentation Sections

Below are the updated sections for the "System_Documentation.md" document to reflect the architectural changes to the OpenAIContextManager:

## API Integration

- **OpenAIContextManager Class** (`utils/context_manager.py`)
  - Stateless service for formatting requests to the OpenAI API
  - Key methods:
    - `build_initial_system_message(mood, narrative_style)`: Creates system messages for initial stories
    - `build_continuation_system_message(mood, narrative_style, node_count)`: Creates system messages for continuations
    - `build_story_context(conflict, setting, mission_info, characters)`: Formats story context
    - `generate_initial_story(client, user_message, conflict, ...)`: Formats and sends initial story requests
    - `generate_continuation(client, user_message, conflict, ...)`: Formats and sends continuation requests
    - `process_api_call(client, messages, model, temperature)`: Generic API call handler
  - Accepts all parameters explicitly for each operation
  - Does not maintain state between calls

- **Route Handlers**
  - **Web Routes** (`routes/main_routes.py`):
    - `generate_story_route()`: Passes explicit parameters to story generation
    - `make_choice()`: Gets state from database and passes to GameEngine
  
  - **API Routes** (`api/game_api.py` and `routes/api_routes.py`):
    - Parameters flow explicitly from request to GameEngine to context manager
    - State is fetched from database before each operation

## State System

### Key Features
- GameState is the single source of truth for game state
- OpenAIContextManager is a stateless service for API interaction
- Unidirectional data flow: Database → GameState → OpenAIContextManager → API
- Explicit parameter passing rather than implicit state changes

### Node Resolution Strategy
In `GameState.resolve_current_node()` (`services/state_manager.py`):
1. First try user's current node (`UserProgress.current_node_id`)
2. If not found, use latest node for the story by creation timestamp
3. If still not found, use the root node (node with no parent)

### State Management
The `GameState` class in `services/state_manager.py`:
- Loads state from database via `reload_state()`
- Tracks current story and node
- Provides story parameters via `get_story_parameters()`
- Manages node count via `get_node_count()` and `increment_node_count()`
- Provides context with `get_node_context()`
- Handles transitions with `transition_to_node()`

## Dependencies and Relationships

### Primary Dependencies
1. **GameEngine** (`services/game_engine.py`) depends on:
   - GameState for state management and parameter retrieval
   - StoryGenerator for initial story creation
   - StoryContinuationHandler for story continuations
   - OpenAIContextManager as a stateless service

2. **GameState** (`services/state_manager.py`) depends on:
   - Database models for state persistence
   - OpenAIContextManager as a stateless service

3. **StoryGenerator** (`services/story_maker.py`) depends on:
   - OpenAIContextManager as a stateless service for API calls
   - Character utilities for data formatting

4. **StoryContinuationHandler** (`services/segment_maker.py`) depends on:
   - OpenAIContextManager as a stateless service for API calls
   - Character utilities for data formatting

### Critical Workflows
1. **Story Generation**:
   - Parameters flow from database → GameState → StoryGenerator → OpenAIContextManager → API
   - Response flows from API → OpenAIContextManager → StoryGenerator → Database → GameState

2. **Choice Processing**:
   - Parameters flow from database → GameState → GameEngine → StoryContinuationHandler → OpenAIContextManager → API
   - Response flows from API → OpenAIContextManager → StoryContinuationHandler → GameEngine → Database → GameState

## Improvements from Refactoring

### Before:
- Context manager stored state, duplicating what was in GameState
- Unclear source of truth for parameters like node count
- Bidirectional dependencies between GameState and OpenAIContextManager
- Testing was difficult due to stateful behavior

### After:
- Context manager is stateless, only providing API formatting services
- Clear source of truth: GameState for game state, database for persistence
- Unidirectional dependencies and data flow
- Easier testing due to explicit parameter passing
- Better separation of concerns

This refactoring follows software engineering best practices:
1. **Single Responsibility Principle**: Each component has one job
2. **Dependency Inversion**: High-level modules don't depend on low-level details
3. **Explicit Dependencies**: All dependencies are passed explicitly
4. **Stateless Services**: Services don't maintain state between calls 