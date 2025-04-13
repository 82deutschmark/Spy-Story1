# Spy Story Game Engine - Comprehensive Reference

## Architecture Overview

The Spy Story Engine is a Flask-based interactive narrative game focused on espionage themes with dynamic story generation powered by OpenAI. The system uses a sophisticated data model to track characters, missions, plot arcs, and narrative progression.

### Core Systems

#### 1. Data Models
- **Character System** (`models/character_data.py`)
  - Database-backed model with defined roles: villain, neutral, mission-giver, undetermined
  - Includes traits, backstory, plot lines, and visual representation
  - Related to stories through the story_characters junction table
  - Stores character roles that determine behavior in narratives

- **Mission System** (`models/missions.py`)
  - Tracks player objectives with progress, rewards, and completion status
  - Links missions to characters (giver/target)
  - Supports mission failure, completion, and progress updates
  - Integrates with narrative through detailed progress tracking

- **Plot Arc System** (`models/plot.py`)
  - Manages branching story arcs with completion criteria
  - Tracks key nodes, branching choices, and character involvement
  - Supports different arc types: main, side, character, mission
  - Integrates with the reward system

- **Context Management** (`models/context_summary.py`)
  - Stores pre-computed narrative summaries at various detail levels
  - Optimizes token usage with OpenAI by providing appropriately sized context
  - Supports three levels: short (~10000 tokens), medium (~30000), long (~150000)
  - Allows efficient retrieval based on token budget

- **Character Evolution** (`models/character_evolution.py`) - *Not Yet Implemented*
  - Designed to track how characters change through user stories
  - Will support trait evolution, relationship networks, and role progression
  - Includes hooks for recording plot contributions

#### 2. Service Layer

- **Game Engine** (`services/game_engine.py`)
  - Core coordinator that drives story progression
  - Main methods:
    - `start_new_story()`: Creates new stories with character selection
    - `make_choice()`: Processes user choices and continues narrative
    - `get_active_missions()`: Retrieves current player missions
  - Handles protagonist verification and database transactions
  - Coordinates with other services for story generation

- **Mission Generator** (`services/mission_generator.py`)
  - Creates structured missions from narrative content
  - Extracts mission details from character dialogue
  - Links missions to relevant characters
  - Processes mission updates, completion, and failure

- **Character Services**
  - **Character Manager** (`utils/character_manager.py`)
    - Provides utilities for character data handling
    - `get_random_characters()`: Selects characters with specified roles
    - Functions for extracting and formatting character data
  - **Character Evolution Service** (`services/character_evolution.py`) - *Not Yet Implemented*
    - Will handle dynamic character changes based on story events
  - **Character Interaction Service** (`services/character_interaction.py`) - *Not Yet Implemented*
    - Will manage character relationships and interaction outcomes

- **Context Management** (`utils/context_manager.py`)
  - Manages OpenAI API interactions for story generation
  - Stateless design that doesn't store context between requests
  - Handles prompt building and response processing
  - Optimizes token usage through context management

#### 3. Story Generation Flow

- **Initial Story Creation**
  - User selects parameters (conflict, setting, style, mood)
  - User selects characters (at least one mission-giver and villain)
  - `GameEngine.start_new_story()` processes the request
  - OpenAI generates initial narrative with choices
  - Story is saved to database with character associations

- **Story Continuation**
  - User selects a choice from previous narrative
  - `GameEngine.make_choice()` retrieves state and context
  - Character information and previous context is formatted
  - OpenAI generates continuation with new choices
  - New story node is created and linked to parent

## Known Issues and Implementation Details

### 1. Character Role Handling

**Current Behavior**: The character selection process in story generation does not guarantee inclusion of neutral characters. The system only ensures mission-giver and villain roles are included, which can limit narrative options.

**Technical Details**:
- `get_random_characters()` correctly filters for all roles including neutral
- The REQUIRED_ROLES array in selection logic only contains mission-giver and villain
- When no neutral character is included initially, the story continuation lacks neutral NPCs

**Impact**: This affects story diversity and limits "seeking help from NPC" choices since appropriate characters may be missing.

### 2. Logging Overhead

**Current Implementation**: The application has excessive logging, especially for OpenAI API interactions, which impacts performance and readability.

**Technical Details**:
- `context_manager.py` sets VERBOSE_LOGGING = True
- DEBUG level logging for httpx and openai libraries
- Redundant logging configuration in multiple files
- Detailed request/response logging for all API calls

**Impact**: Unnecessary performance overhead, potential sensitive data exposure, and difficulty finding important log messages.

### 3. Migration Issues

**Current State**: Functionality was migrated from `segment_maker.py` (now deprecated) to `utils/context_manager.py` and `utils/narrative_analyzer.py`.

**Migration Artifacts**:
- `segment_maker.py` contains more explicit instructions for character integration
- The "INCORPORATE AT LEAST ONE INTO THE NARRATIVE" directive for secondary NPCs may have been lost
- The newer context_manager has more generalized character formatting

**Impact**: Character integration may be less effective in the current implementation compared to the deprecated version.

### 4. State Management

**Current Implementation**: The system carefully tracks state through multiple mechanisms:
- `GameState` class maintains user progress and story position
- `UserProgress` model stores persistent state in the database
- `StoryNode` model contains narrative text and branch metadata
- Story continuations include full character information for context

### 5. Character Evolution System

**Status**: The character evolution system is designed but not yet implemented.

**Planned Functionality**:
- Dynamic character trait evolution based on story events
- Relationship tracking between characters
- Character role progression
- Interaction history logging

## Technical Reference

### Database Models
- **Character**: Core character information (traits, roles, backstory)
- **Mission**: Player objectives (progress, rewards, deadlines)
- **PlotArc**: Story arcs (progression, branching, completion)
- **NodeContextSummary**: Pre-computed narrative contexts for token optimization
- **CharacterEvolution**: How characters change through story (not yet implemented)

### Service Classes
- **GameEngine**: Core story management and progression
- **OpenAIContextManager**: Stateless interface to OpenAI API
- **StoryContinuationHandler** (Deprecated): Being migrated to newer systems
- **MissionGenerator**: Creates and updates player missions

### Character Roles
- **mission-giver**: Assign objectives and missions
- **villain**: Antagonists who oppose the player
- **neutral**: Supporting characters for general interactions
- **undetermined**: Characters whose role hasn't been established

## Development Pitfalls and Lessons

1. **Character Selection Logic**: Ensure all required character roles (including neutral) are properly selected for each story.

2. **Logging Management**: The current logging configuration is excessively verbose. Consider creating a dedicated logging configuration module with appropriate log levels.

3. **Migration Preservation**: When migrating functionality between modules, ensure that specific directives and emphasis (like character integration) are preserved.

4. **State Management**: The system has sophisticated state tracking through multiple models. Changes must update all relevant state objects consistently.

5. **OpenAI Context Management**: The system carefully manages token limits through pre-computed summaries. This approach balances context richness with token constraints.

6. **Character Role Consistency**: Character roles must remain consistent throughout stories to maintain narrative coherence.

7. **Error Handling**: Critical operations (OpenAI calls, database transactions) need robust error handling to prevent state corruption.

8. **Model Instance vs Dictionary**: When passing model instances between components, be aware of whether they're expected as model instances or dictionaries.
