# Spy Story Game Engine - Comprehensive Reference

## Game Concept Overview

**Genre:** Interactive narrative adventure (choose-your-own-adventure)

**Premise:** The player is a rogue agent, recently disavowed by their spy agency for a series of outrageous misadventures. With limited diamonds and other virtual currencies, the agent receives missions from a mission-giver drawn from your PostgreSQL database of characters.

**Story & Gameplay:**
*   **Theme:** Irreverent espionage with high stakes and a bold, risk-taking attitude.
*   **Player Role:** A disavowed spy with a devil-may-care personality navigating chaotic missions through unpredictable narrative twists.
*   **Mission Structure:**
    *   The game begins with a mission assignment from a mission giver character (queried from your database).
    *   The narrative unfolds through a series of decisions using both low-cost and high-cost choices. Mission completion is determined by reaching specific end states via high-cost choices.

**Core Mechanics:**
*   **Dual-Tier Decision System:**
    *   **Low-Cost Choices (💵, 💴, 💶, 💷):** Enhance the narrative by introducing unexpected characters and twists from your character database using lower-value currencies. Each decision pulls in different narrative elements by triggering events that reference PostgreSQL-stored character data.
    *   **High-Cost Choices (💎):** Drive the story toward critical, binary outcomes (mission success or failure). Gate high-impact narrative decisions behind premium currency (Diamonds 💎) checks. A simple state machine controls story transitions based on these choices.
*   **Currency Management:**
    *   **Premium Currency (Diamonds 💎):** Limited supply, used exclusively for mission-critical decisions.
    *   **Other Currencies:** Serve to enhance narrative depth by funding the introduction of auxiliary characters and events.

**Narrative Engine & ChatGPT Integration:**
*   **Dynamic Storytelling:** Use ChatGPT to generate narrative responses in real-time, adapting to player choices while ensuring coherent story progression.
*   **State Management:** A simplified state machine tracks the player’s journey, updating the narrative based on both low-cost (exploratory) and high-cost (decisive) choices.
*   **Data-Driven Decisions:** Basic configuration files (e.g., JSON) outline narrative branches, making it easy to add new scenarios or adjust existing ones without major code changes.

**Database Integration:**
*   **PostgreSQL Usage:** Store a rich set of character entries (e.g., mission givers, side-characters) that the narrative engine can pull from dynamically.
*   **Mission Giver Selection:** Query the database to randomly select a mission giver character for each new mission, ensuring variety in story assignments.
*   **Character Dynamics:** Low-cost decisions trigger database queries to fetch unpredictable auxiliary characters, contributing to the evolving narrative landscape.

---

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
  - Missions typically last for 10+ story segments, with progress updated through story choices

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
  - Creates missions for each new story automatically
  - Ensures neutral characters are included in story continuations
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
  - Contains strong directives for neutral character inclusion

#### 3. Story Generation Flow

- **Initial Story Creation**
  - User selects parameters (conflict, setting, style, mood)
  - User selects characters (at least one mission-giver, villain, and neutral)
  - `GameEngine.start_new_story()` processes the request
  - OpenAI generates initial narrative with choices
  - Story is saved to database with character associations
  - A mission is automatically created for the player

- **Story Continuation**
  - User selects a choice from previous narrative
  - `GameEngine.make_choice()` retrieves state and context
  - System checks for neutral characters, adding some from database if needed
  - Character information and previous context is formatted
  - OpenAI generates continuation with new choices including neutral character interactions
  - New story node is created and linked to parent

## User Identification

The Spy Story prototype uses a simple session-based identification system:

- New sessions get a UUID stored in Flask session
- Each session maintains progress through a UserProgress model
- The system supports basic protagonist naming via agent_codename
- Each new story is treated as a fresh experience for simplicity
- Login functionality exists primarily for testing purposes
  
The prototype design prioritizes ease of testing over persistent user state, with each new story starting with a clean slate.

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
- **undetermined**: Characters whose role hasn’t been established

## Key System Features

1. **Character Integration**: The system ensures neutral characters are included in each narrative segment, providing varied interactions.

2. **Mission Tracking**: Each story automatically creates a mission that progresses through player choices.

3. **State Management**: Sophisticated tracking through multiple models while optimizing for clean prototype testing.

4. **OpenAI Context Management**: Carefully manages token limits through pre-computed summaries, balancing context richness with token constraints.

5. **Simplified User Experience**: Prioritizes easy testing and demonstration over complex user authentication.

See CHANGELOG.md for detailed development updates.
