# Spy Story Game Engine

## Overview
An interactive thriller game engine that generates dynamic narratives with branching storylines, character relationships, and mission-based gameplay in a world of high-stakes espionage.

### Key Features
- Dynamic story generation powered by OpenAI's advanced language models
- Branching storylines with consistent character and mission tracking
- Rich character integration with traits, backstories, and plot lines
- Mission-based gameplay with progress tracking and story integration
- Multi-node story persistence with comprehensive state management
- Context preservation between story segments for narrative coherence

## Architecture

### Core Components
1. **Story Generation System**
   - **Initial Story Creation** (`services/story_maker.py`)
     - `StoryGenerator` class creates new stories via OpenAI
     - `StoryPromptBuilder` constructs comprehensive prompts with character context
     - `CharacterPromptBuilder` formats character information for prompts
   
   - **Story Continuation** (`services/segment_maker.py`)
     - `StoryContinuationHandler` generates new segments based on player choices
     - Maintains narrative coherence with rich context preservation
     - Processes mission updates and character interactions
   
   - **Game Engine** (`services/game_engine.py`)
     - `GameEngine` class coordinates the entire game flow
     - `start_new_story()` method initiates new narratives
     - `make_choice()` method processes player decisions
     - Handles database transactions and state updates

2. **Character System**
   - **Character Model** (`models/character_data.py`)
     - Role-based characters (mission-giver, villain, neutral, undetermined)
     - Comprehensive character profiles with traits, backstory, plot lines
   
   - **Character Manager** (`utils/character_manager.py`)
     - `extract_character_role()` standardizes role field handling
     - `extract_character_traits()` processes various trait formats
     - `get_random_characters()` selects appropriate characters for stories
   
   - **Role Enforcement**
     - System enforces consistent character behaviors based on roles
     - Mission-givers must assign missions, villains must oppose player
     - Character ID tracking maintains consistency across story segments

3. **State Management**
   - **GameState** (`services/state_manager.py`)
     - Tracks current story position and player progress
     - Resolves current node with priority-based approach
     - Provides rich context for story continuation
   
   - **StoryNode Model** (`models/stories.py`)
     - Stores narrative text and branch metadata
     - `branch_metadata` field preserves character data, mission state, and choices
     - Forms tree structure of narrative with parent-child relationships
   
   - **UserProgress Model** (`models/user.py`)
     - Tracks player state, choices, and relationships
     - Manages currency, experience, and mission progress

4. **Web & API Interface**
   - **Web Routes** (`routes/main_routes.py`)
     - `generate_story_route()` initiates story creation
     - `make_choice()` processes player choices
     - `storyboard()` renders story display
   
   - **API Routes** (`api/game_api.py` and `routes/api_routes.py`)
     - Stateless JSON endpoints for programmatic access
     - Same core functionality as web interface
     - Structured error responses and validation

## Data Flow

### Story Generation Process
1. User selects parameters and characters (via `routes/main_routes.py`)
2. `GameEngine.start_new_story()` coordinates story creation
3. `StoryGenerator.generate_story()` builds prompts and calls OpenAI
4. `OpenAIContextManager.generate_initial_story()` manages API communication
5. Response is processed and stored in database models
6. `GameState` is updated with references to new story

### Choice Processing Flow
1. User makes choice via web or API
2. `GameEngine.make_choice()` retrieves state and current node
3. `StoryContinuationHandler.generate_continuation()` calls OpenAI with context
4. New `StoryNode` is created with comprehensive metadata
5. State transitions atomically to new node
6. Response is returned to user interface

## Database Schema

- **StoryGeneration**: Stores story parameters (conflict, setting, style, mood)
- **StoryNode**: Contains narrative text and rich branch_metadata
- **Character**: Stores character details with traits as JSONB
- **UserProgress**: Tracks user state with game_state JSONB field
- **Mission**: Tracks mission objectives, progress, and rewards

## Documentation
- [System Documentation](docs/Updated_System_Documentation.md) - Comprehensive system overview
- [Story Node System](docs/story_node_system.md) - Details of node structure and relationships
- [Story Flow](docs/story_flow.md) - Narrative progression and state transitions
- [ChatGPT API Call Chain](docs/ChatGPT%20API%20Call%20Chain%20Documentation.md) - Details of API integration
- [API Parameter Flow](docs/api_parameter_flow.md) - Story parameter handling
- [OpenAI API Logging](docs/OpenAI_API_Logging.md) - Detailed API request/response logging and debugging

## Technical Stack
- Python 3.8+ with Flask web framework
- PostgreSQL for robust data persistence
- OpenAI API for advanced narrative generation
- Modern front-end with responsive design

## Debugging & Development

### OpenAI API Debugging
The system includes enhanced logging capabilities for OpenAI API interactions:

- **Complete API Request Logging**: All requests to the OpenAI API are thoroughly logged, including full message content and parameters
- **Request/Response Inspection**: Track exactly what's being sent to and received from the API
- **Dedicated Testing Script**: Use `test_api_logging.py` to quickly verify API connectivity and logging
- **Centralized Logging Configuration**: All logging is configured through `utils/context_manager.py`

To test the API logging:
```bash
# Set your OpenAI API key
export OPENAI_API_KEY=your_key_here  # Linux/Mac
set OPENAI_API_KEY=your_key_here     # Windows CMD
$env:OPENAI_API_KEY='your_key_here'  # Windows PowerShell

# Run the test script
python test_api_logging.py
```

## Narrative Analysis Migration

This release includes a migration from the deprecated narrative functionality in `segment_maker.py` to a more robust and stateless system. Key changes include:

- **Narrative Analyzer Module**: Introduced `narrative_analyzer.py` to handle:
  - Extraction of character interactions
  - Extraction of previous choices
  - Processing of mission updates
  - Cleaning of story responses

- **Context Manager Enhancements**: The `context_manager.py` has been updated with new methods such as `extract_story_elements` and `process_story_response` to better support narrative continuity.

- **GameState Update**: The `GameState` class now includes a `get_enhanced_context` method, which provides enriched narrative context incorporating detailed character interactions and previous choices.

- **Backward Compatibility**: The deprecated `segment_maker.py` now includes adapter functions with deprecation warnings to forward calls to the new modules.
