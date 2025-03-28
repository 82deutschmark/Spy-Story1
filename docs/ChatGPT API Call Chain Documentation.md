# ChatGPT API Call Chain Documentation

This document explains the chain of events that form the API calls to ChatGPT (via the OpenAI client) for EVERYTHING. It also describes how the backend processes the calls and integrates the response into the game state.

---

## 1. Event Chain Overview

### Initial Story Generation Process

When a user starts a new story, the following steps occur:

1. **User Inputs & Character Selection**
   - The user selects story parameters (conflict, setting, narrative style, mood)
   - The user selects characters that will appear in the story
   - The form is submitted via `generate_story_route()` in `routes/main_routes.py`

2. **Backend Story Generation**
   - `GameEngine.start_new_story()` in `services/game_engine.py` is called with the form data
   - Selected characters are retrieved from the database and formatted
   - The OpenAI client is initialized
   - `generate_story()` from `services/story_maker.py` is called with:
     - Story parameters (conflict, setting, narrative style, mood)
     - Character information (character_info and additional_characters)
     - Protagonist details (name, gender, level)

3. **Building the Initial Prompt**
   - `StoryPromptBuilder.build_story_prompt()` in `services/story_maker.py` constructs a detailed prompt with:
     - Story parameters
     - Character details using `CharacterPromptBuilder` (in `services/story_maker.py`)
     - Protagonist information
     - Story context for the game world
   - `OpenAIContextManager` in `utils/context_manager.py` manages the conversation context

4. **Making the OpenAI API Call**
   - `OpenAIContextManager.generate_initial_story()` in `utils/context_manager.py` calls the API with:
     - System message from `_build_system_message()` (in `utils/context_manager.py`)
     - User message with the constructed prompt
     - Response format set to JSON

5. **Processing the Initial Response**
   - The JSON response includes:
     - Narrative text for the story
     - Initial choices for the player
   - This data is processed and stored in a new `StoryGeneration` record (model defined in `models/stories.py`)

6. **Creating the Initial Story Node**
   - A comprehensive `StoryNode` (model defined in `models/stories.py`) is created with:
     - The narrative text from the API response
     - Rich branch_metadata containing:
       - Character details (traits, backstory, plot lines)
       - Initial mission information
       - Protagonist details
       - Story parameters
       - Available choices

7. **Updating Game State**
   - User progress is updated to reference the new story and node
   - Initial mission is generated
   - State manager is notified of the state changes

### Story Continuation Process

When a player makes a choice in the game, the following steps occur:

1. **User Interaction & Form Submission**
   - The player's choice is submitted via a form (handled by `ChoiceHandler.js` in `static/js/modules/ChoiceHandler.js`)
   - Required state values (story_id, node_id, story_context, selected characters, etc.) are embedded in the request

2. **Processing the Choice in the Backend**
   - The `/make_choice` route in `routes/main_routes.py` receives the choice data
   - The `GameEngine.make_choice()` function in `services/game_engine.py` is invoked:
     - It retrieves the current node using `GameState.resolve_current_node()` in `services/state_manager.py` which:
       - First checks user_progress.current_node_id
       - If not found, looks for the latest node for that story
       - If still not found, uses the root node
     - It gathers additional context (via `GameState.get_node_context()` in `services/state_manager.py`) that includes:
       - Complete character details (traits, backstory, plot lines)
       - Active missions with status and progress
       - Branch metadata from the current story node
       - Story parameters (conflict, setting, style, mood)
     - Mission progress and character relationships are updated as needed

3. **Building the Enhanced Continuation Prompt**
   - The `generate_continuation()` function in `services/segment_maker.py` is called
   - Inside `StoryContinuationHandler.generate_continuation()` in `services/segment_maker.py`:
     - A random character (or a previously encountered one) is selected using `get_random_characters()` in `utils/character_manager.py`
     - Character data is properly formatted to ensure consistent structure with original character data
     - Story parameters are preserved to maintain narrative consistency
     - A system message is built via the `_build_system_message()` method that sets style guidelines, protagonist details, and expected JSON structure
     - The continuation prompt is constructed by `StoryContinuationHandler._build_prompt()` in `services/segment_maker.py`  
       This comprehensive prompt includes:
       - The player's chosen option
       - Complete mission information with progress data
       - Full character details including traits, backstory, and plot lines
       - Story parameters for narrative consistency
       - Story context enriched with previous narrative elements
     - The system message and user message are added to the conversation history inside an instance of `OpenAIContextManager` in `utils/context_manager.py`

4. **Making the API Call**
   - The `OpenAIContextManager.process_function_calling()` method in `utils/context_manager.py` is invoked
     - This method calls the ChatGPT endpoint using:
       ```python
       client.chat.completions.create(
           model=model,
           messages=self.messages,
           tools=tools,
           response_format={"type": "json_object"}
       )
       ```
     - The prompt (as built above) is sent in the message history
     - Returned content is "cleaned" (trimming markdown formatting and extra backticks) and appended to the context as an assistant message

5. **Processing the API Response**
   - The JSON response (which must match a predefined structure) includes:
     - A new story continuation narrative (the "story" text)
     - A new set of choices for the player
     - A "mission_update" object with progress information
   - This response is parsed (via `json.loads`) and then fed into `StoryContinuationHandler.validate_response()` in `services/segment_maker.py` to enforce the expected schema
   - Finally, in `GameEngine.make_choice()` in `services/game_engine.py`, a new comprehensive `StoryNode` is created with:
     - The narrative text from the continuation response
     - Rich branch_metadata including:
       - Complete character details (not just IDs)
       - Full mission state with updates
       - Story parameters for context preservation
       - Protagonist information carried from previous node
       - Previous node reference for continuity
       - Timestamp data for chronological tracking

---

## 2. Data Persistence and Context Flow

- **Enhanced StoryNode Structure:**
  - `StoryNode` model in `models/stories.py` with `branch_metadata` JSONB field now contains comprehensive data:
    ```json
    {
      "story_id": 123,
      "choice_id": "choice_1",
      "timestamp": "2023-06-25T14:30:00.000Z",
      "characters": [1, 2, 3],
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
      "mission_info": {
        "title": "Mission Title",
        "objective": "Mission objective",
        "status": "in_progress",
        "progress": 35
      },
      "protagonist": {
        "name": "Protagonist Name",
        "gender": "Protagonist Gender",
        "level": 2
      },
      "story_parameters": {
        "conflict": "Story conflict",
        "setting": "Story setting",
        "narrative_style": "Narrative style",
        "mood": "Story mood"
      }
    }
    ```

- **State Management System:**
  - `GameState` class in `services/state_manager.py` manages the game state for a user:
    - Tracks current story and node
    - Manages active missions
    - Loads user progress
    - Provides context for story continuations
  - `GameStateManager` in `services/state_manager.py` is a singleton that:
    - Observes state changes and notifies listeners
    - Synchronizes state between web UI and other interfaces
    - Provides serialization and deserialization for state transfer

- **Node Resolution System:**
  - Priority-based approach when resolving the current node:
    1. User's current node from `UserProgress.current_node_id` (model in `models/user.py`)
    2. Latest node for the story by creation timestamp
    3. Root node (node with no parent)
  - Atomic state transitions ensure consistency:
    - Node updates, character updates, and mission updates happen in one transaction
    - User progress is updated with new node references

- **Context Preservation:**
  - `OpenAIContextManager` (in `utils/context_manager.py`) maintains conversation history across calls
  - Character information is consistently formatted using extraction functions in `utils/character_manager.py`:
    - `extract_character_name()`
    - `extract_character_role()`
    - `extract_character_traits()`
    - `extract_character_backstory()`
    - `extract_character_plot_lines()`
  - Story parameters are preserved in both database and prompts
  - Previous node references maintain narrative continuity

- **Prompt Building Improvements:**
  - Character details now include complete profiles with traits and backstory
  - Mission information includes progress percentage and status
  - Story parameters provide narrative consistency guidance
  - Character formatting ensures proper extraction of traits and plot lines

## 3. Character Data Consistency Issues and Fixes

One critical issue that was addressed in the system was inconsistent character role handling that caused errors in the story generation.

### Character Role Field Inconsistency

- **The Problem:**
  - In different parts of the system, character data was being referenced with inconsistent field names:
    - Sometimes as `character_role` (in database models and some route handlers)
    - Sometimes as `role` (in prompts and some utility functions)
  - The `extract_character_role()` function in `utils/character_manager.py` was only checking for `role` in dictionaries, not `character_role`
  - When the field was missing, it would return an error placeholder ("CHARACTER MANAGER ERROR DUMMY!!!") that appeared in generated narratives

- **The Solution:**
  1. **Field Duplication for Compatibility:** In `routes/main_routes.py`, both fields are now included:
     ```python
     data['protagonist_info'] = {
         "id": selected_characters[0].id,
         "character_name": selected_characters[0].character_name,
         "character_traits": selected_characters[0].character_traits or {},
         "backstory": getattr(selected_characters[0], 'backstory', ""),
         "plot_lines": getattr(selected_characters[0], 'plot_lines', []),
         "character_role": selected_characters[0].character_role,
         "role": selected_characters[0].character_role  # Both fields for compatibility
     }
     ```

  2. **Complete Character Data Fetching:** In both `main_routes.py` and `api_routes.py`, the `make_choice` methods now fetch complete character data instead of just passing IDs:
     ```python
     # Get character details from IDs for complete character data
     if characters:
         character_objects = []
         for char_id in characters:
             char = Character.query.get(char_id)
             if char:
                 character_objects.append({
                     "id": char.id,
                     "character_name": char.character_name,
                     "name": char.character_name,
                     "character_role": char.character_role,
                     "role": char.character_role,
                     "character_traits": char.character_traits or {},
                     "backstory": getattr(char, 'backstory', ""),
                     "plot_lines": getattr(char, 'plot_lines', [])
                 })
         characters = character_objects
     ```

  3. **Improved Extraction Function:** In `utils/character_manager.py`, the `extract_character_role()` function now checks both fields and provides a sensible default:
     ```python
     def extract_character_role(char_data):
         if isinstance(char_data, dict):
             # Check for character_role first, then role, with a neutral default
             return char_data.get("character_role") or char_data.get("role") or "neutral"
         elif hasattr(char_data, "character_role"):
             return char_data.character_role or "neutral"
         return "neutral"
     ```

### Initial POST Request Analysis

When a story is first generated, the following flow occurs:

1. In `main_routes.py`, the `/generate_story` route receives form data that includes:
   - Story parameters (conflict, setting, narrative_style, mood)
   - Selected character IDs (selected_images)

2. The route controller:
   - Fetches complete Character objects from the database
   - Ensures required roles (mission-giver, villain) are present
   - Constructs a rich data structure with both `character_role` and `role` fields
   - Passes this to `game_engine.start_new_story()`

3. The `GameEngine` class in `services/game_engine.py`:
   - Processes form data and extracts story parameters
   - Builds character information dictionaries with consistent field naming
   - Initiates the OpenAI API call through `generate_story()`

4. The character data is then:
   - Used in prompt construction in `services/story_maker.py`
   - Extracted correctly with utility functions in `utils/character_manager.py`
   - Stored consistently in the database as part of `StoryNode.branch_metadata`

This approach ensures that character roles are consistently represented throughout the system, preventing errors in narrative generation.

### Character Data Flow Diagram

Below is a diagram of how character data flows through the system during story generation and continuation:

```
┌─────────────────┐          ┌────────────────────┐          ┌───────────────────┐
│  Client Browser │          │   main_routes.py   │          │   Character DB    │
│    (Web Form)   │──────────▶   /generate_story  │◀─────────│  (PostgreSQL)     │
└─────────────────┘          └────────────┬───────┘          └───────────────────┘
                                          │
                                          │ Fetches characters & adds both
                                          │ 'character_role' and 'role' fields
                                          ▼
                  ┌─────────────────────────────────────────────┐
                  │             game_engine.py                  │
                  │             start_new_story()               │
                  └───────────────────────┬─────────────────────┘
                                          │
                                          │ Processes form_data, builds
                                          │ story_params with character info
                                          ▼
┌────────────────────────┐     ┌────────────────────┐      ┌────────────────────┐
│  character_manager.py  │     │   story_maker.py   │      │ utils/context_      │
│  extract_character_*() │◀────│   generate_story() │─────▶│ manager.py         │
└────────────────────────┘     └─────────┬──────────┘      └────────────────────┘
                                         │                           │
                                         │                           │
                                         ▼                           ▼
                              ┌────────────────────┐      ┌────────────────────┐
                              │ StoryPromptBuilder │      │    OpenAI API      │
                              │ build_*_prompt()   │      │    Chat Models     │
                              └────────┬───────────┘      └──────────┬─────────┘
                                       │                             │
                                       └─────────────────────────────┘
                                                     │
                                                     ▼
                              ┌────────────────────────────────────┐
                              │        JSON Response               │
                              │ (narrative_text, choices, etc.)    │
                              └────────────────┬─────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────────┐
                              │       StoryNode Created            │
                              │   (with branch_metadata)           │
                              └────────────────┬─────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────────┐
                              │    Response to Client Browser      │
                              │   (redirect to story view)         │
                              └────────────────────────────────────┘
```

During story continuation (when a player makes a choice):

```
┌─────────────────┐          ┌────────────────────┐          ┌───────────────────┐
│  Client Browser │          │   main_routes.py   │          │   Character DB    │
│   (make choice) │──────────▶    /make_choice    │◀─────────│  (PostgreSQL)     │
└─────────────────┘          └────────────┬───────┘          └───────────────────┘
                                          │
                                          │ Fetches full character objects and
                                          │ creates rich character dictionaries
                                          ▼
                  ┌─────────────────────────────────────────────┐
                  │             game_engine.py                  │
                  │             make_choice()                   │
                  └───────────────────────┬─────────────────────┘
                                          │
                                          │ Gets previous node, mission info,
                                          │ and story parameters
                                          ▼
┌────────────────────────┐     ┌────────────────────┐      ┌────────────────────┐
│  character_manager.py  │     │  segment_maker.py  │      │ utils/context_      │
│  extract_character_*() │◀────│generate_continuation◀─────▶│ manager.py         │
└────────────────────────┘     └─────────┬──────────┘      └────────────────────┘
                                         │                           │
                                         │                           │
                                         ▼                           ▼
                              ┌────────────────────┐      ┌────────────────────┐
                              │StoryContinuation   │      │    OpenAI API      │
                              │Handler             │      │    Chat Models     │
                              └────────┬───────────┘      └──────────┬─────────┘
                                       │                             │
                                       └─────────────────────────────┘
                                                     │
                                                     ▼
                              ┌────────────────────────────────────┐
                              │        JSON Response               │
                              │ (narrative_text, choices, etc.)    │
                              └────────────────┬─────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────────┐
                              │      New StoryNode Created         │
                              │   (with branch_metadata)           │
                              └────────────────┬─────────────────┘
                                               │
                                               ▼
                              ┌────────────────────────────────────┐
                              │    Response to Client Browser      │
                              │   (redirect to story view)         │
                              └────────────────────────────────────┘
```

This diagrams illustrate how character data is:
1. Retrieved from the database
2. Enhanced with consistent field naming
3. Passed through the various services
4. Extracted using utility functions
5. Used in prompt building
6. Stored in the resulting StoryNode

The fixed `extract_character_role()` function now ensures that character roles are correctly retrieved regardless of which field name is used in the data structure.

### Initial POST Error Resolution

The original error in the initial POST request manifested as "CHARACTER MANAGER ERROR DUMMY!!!" appearing in the narrative text. This happened due to a cascade of character data field inconsistencies:

**Original Error Chain:**
1. In `routes/main_routes.py`, the `generate_story_route()` function added characters with only `character_role` fields:
   ```python
   data['protagonist_info'] = {
       "id": selected_characters[0].id,
       "character_name": selected_characters[0].character_name,
       "character_traits": selected_characters[0].character_traits or {},
       "backstory": getattr(selected_characters[0], 'backstory', ""),
       "plot_lines": getattr(selected_characters[0], 'plot_lines', []),
       "character_role": selected_characters[0].character_role
   }
   ```

2. In `services/game_engine.py`, `start_new_story()` would process this and pass it to `generate_story()`, preserving only the `character_role` field (not adding a `role` field).

3. In `services/story_maker.py`, character data would be processed by `CharacterPromptBuilder` which used utility functions like `extract_character_role()`.

4. In `utils/character_manager.py`, the `extract_character_role()` function would only look for a `role` field, not `character_role`:
   ```python
   def extract_character_role(char_data):
       if isinstance(char_data, dict):
           return char_data.get("role", "CHARACTER MANAGER ERROR DUMMY!!!")
       # ...
   ```

5. Since the `role` field was missing (only `character_role` existed), it would return the error text "CHARACTER MANAGER ERROR DUMMY!!!"

6. This error text would then be incorporated into the prompt sent to OpenAI, appearing in the generated narrative.

**Solution Implementation:**
1. In `routes/main_routes.py`, we now include both fields:
   ```python
   data['protagonist_info'] = {
       # ... other fields ...
       "character_role": selected_characters[0].character_role,
       "role": selected_characters[0].character_role  # Both fields for compatibility
   }
   ```

2. In both `/make_choice` routes (web and API), complete character data is fetched with both fields when processing choices.

3. In `utils/character_manager.py`, the extraction function now checks both fields and provides a sensible default:
   ```python
   def extract_character_role(char_data):
       if isinstance(char_data, dict):
           # Check for character_role first, then role, with a neutral default
           return char_data.get("character_role") or char_data.get("role") or "neutral"
       # ...
   ```

This solution ensures compatibility across all components without requiring a complete refactoring of the codebase. By including both field names and enhancing the extraction function to handle either case, the system now gracefully processes character roles regardless of which field name is used.

## 4. Backend Processing Summary

- **Initial Story Generation:**
  - User selects story parameters and characters
  - `GameEngine.start_new_story()` (in `services/game_engine.py`) processes the request
  - OpenAI API generates the initial story
  - The system creates a `StoryGeneration` record (in `models/stories.py`) and initial `StoryNode`
  - `UserProgress` (in `models/user.py`) is updated with references to the new story

- **Story Continuation:**
  - User makes a choice via web UI
  - `GameEngine.make_choice()` (in `services/game_engine.py`) processes the choice
  - The system resolves the current node and builds context
  - OpenAI API generates the continuation
  - A new `StoryNode` is created with comprehensive metadata
  - User progress and game state are updated

- **Data Flow and Persistence:**
  - Character and mission data is maintained across story segments
  - Story parameters provide consistency in narrative style
  - `StoryNode.branch_metadata` preserves rich context
  - Transactions ensure data integrity during updates

---

## 4. Next Steps & Optimizations

- **Content Enhancement**
  - Fine-tune prompt templates in `services/story_maker.py` and `services/segment_maker.py` for better narrative coherence
  - Improve mission progression triggers based on story choices
  - **FUTURE:** Enhance character relationship development based on player interactions

- **Performance Improvements**
  - Optimize character data transfer between segments 
  - Add database indexes for efficient node retrieval
  - Consider caching frequently accessed node data

- **Data Consistency**
  - Implement validation middleware for branch_metadata structure
  - Add error recovery mechanisms for API failures
  - Enhance logging for debugging purposes
  
- **User Experience**
  - Improve loading animations in `static/js/modules/LoadingManager.js` to better reflect actual API response times
  - Enhance error handling for edge cases
  - Provide better feedback during story generation
