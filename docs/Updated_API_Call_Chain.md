# Updated API Call Chain Documentation Sections

Below are the updated sections for the "ChatGPT API Call Chain Documentation.md" document to reflect the architectural changes to the OpenAIContextManager:

## 3. Building the Enhanced Continuation Prompt

When a player makes a choice in the game, the following steps occur:

```
User Choice → make_choice route → GameEngine.make_choice() → GameState.resolve_current_node() → 
GameState provides parameters → segment_maker.py → OpenAIContextManager formats API request → 
ChatGPT API → Response Processing → New StoryNode → GameState.transition_to_node()
```

Inside `GameEngine.make_choice()` in `services/game_engine.py`:

1. **State Resolution and Parameter Gathering**:
   - The current node is resolved using `GameState.resolve_current_node()`
   - Story parameters (conflict, setting, mood, style) are obtained from the database
   - Node context is gathered via `GameState.get_node_context()`
   - Mission info and character details are retrieved
   - The node count is incremented in GameState with `self.state.increment_node_count()`

2. **Data Preparation**:
   - Character information is formatted into a consistent structure
   - A prompt is constructed with the player's choice and mission details
   - All required parameters are gathered from authoritative sources

3. **Stateless Context Manager Usage**:
   ```python
   # Generate next story segment using stateless approach
   next_segment = generate_continuation(
       previous_story=current_node.narrative_text,
       chosen_choice=custom_choice_text or choice_id,
       mission_info=mission_info,
       mood=story.mood,
       narrative_style=story.narrative_style,
       conflict=conflict,
       setting=setting,
       story_context=story_context or "",
       existing_characters=char_info,
       node_count=node_count
   )
   ```

4. **Inside the `generate_continuation()` function**:
   - A `StoryContinuationHandler` is created
   - Parameters are passed through to the handler's `generate_continuation()` method
   - The OpenAIContextManager is used as a stateless service to format API requests:
   ```python
   # Generate story continuation using the stateless context manager
   story_data = self.context_manager.generate_continuation(
       client=self.client,
       user_message=prompt,
       conflict=conflict,
       setting=setting, 
       narrative_style=narrative_style,
       mood=mood,
       node_count=node_count,
       mission_info=mission_info,
       character_info=formatted_characters
   )
   ```

5. **API Call and Response Processing**:
   - The context manager formats a single API request with the provided parameters
   - No conversation history is maintained between calls
   - The response is cleaned and validated before returning

## 4. Data Persistence and Context Flow

- **Stateless Context Manager**:
  The `OpenAIContextManager` class in `utils/context_manager.py` is now a stateless service that:
  - Accepts all required parameters for each operation
  - Formats API requests with appropriate system messages and prompts
  - Processes API responses without storing state
  - Returns results without side effects

- **Centralized State Management**:
  The `GameState` class in `services/state_manager.py` is now the single source of truth for:
  - Current story and node tracking
  - Node count incrementation via `increment_node_count()`
  - Parameter retrieval via `get_story_parameters()`
  - Rich context provisioning via `get_node_context()`

- **Unidirectional Data Flow**:
  State now flows in one direction:
  ```
  Database → GameState → OpenAIContextManager → API
  ```
  No state flows back from the OpenAIContextManager to other components.

## Updated Data Flow Diagram

Below is the updated diagram showing how state flows through the system during story continuation:

```
┌─────────────────┐          ┌────────────────────┐          ┌───────────────────┐
│  Client Browser │          │   main_routes.py   │          │   Database        │
│   (make choice) │──────────▶    /make_choice    │◀─────────│  (PostgreSQL)     │
└─────────────────┘          └────────────┬───────┘          └───────────────────┘
                                          │                            ▲
                                          │ Parameters passed           │
                                          │ explicitly                  │
                                          ▼                             │
                  ┌─────────────────────────────────────────────┐      │
                  │             game_engine.py                  │      │
                  │             make_choice()                   │      │
                  └───────────────────────┬─────────────────────┘      │
                                          │                            │
                                          │ Resolves state and gets    │
                                          │ parameters from GameState  │
                                          ▼                            │
┌────────────────────────┐     ┌────────────────────┐      ┌──────────┴───────────┐
│  character_manager.py  │     │  segment_maker.py  │      │ services/state_      │
│  extract_character_*() │◀────│generate_continuation│     │ manager.py           │
└────────────────────────┘     └─────────┬──────────┘      │ GameState            │
                                         │                  └────────────────────┬─┘
                                         │ Parameters           ▲                │
                                         │ flow explicitly      │                │
                                         ▼                      │                │
                  ┌────────────────────────────────────┐       │                │
                  │ utils/context_manager.py           │       │                │
                  │ OpenAIContextManager (stateless)   │       │                │
                  └──────────────────┬─────────────────┘       │                │
                                     │                         │                │
                                     │ Formats API request     │                │
                                     ▼                         │                │
                  ┌────────────────────────────────────┐       │                │
                  │        OpenAI API                  │       │                │
                  │        GPT Models                  │       │                │
                  └──────────────────┬─────────────────┘       │                │
                                     │                         │                │
                                     │ Returns response        │                │
                                     ▼                         │                │
                  ┌────────────────────────────────────┐       │                │
                  │    Response Processing             │       │                │
                  │    (validation + cleaning)         │       │                │
                  └──────────────────┬─────────────────┘       │                │
                                     │                         │                │
                                     │ Creates new node        │                │
                                     ▼                         │                │
                  ┌────────────────────────────────────┐       │                │
                  │     New StoryNode Created          │       │                │
                  │    (with branch_metadata)          │───────┘                │
                  └──────────────────┬─────────────────┘                        │
                                     │                                          │
                                     │ Updates game state                       │
                                     ▼                                          │
                  ┌────────────────────────────────────┐                        │
                  │    GameState.transition_to_node()  │────────────────────────┘
                  │    (updates state)                 │
                  └──────────────────┬─────────────────┘
                                     │
                                     │ Returns to client
                                     ▼
                  ┌────────────────────────────────────┐
                  │    Response to Client Browser      │
                  │    (JSON or redirect)              │
                  └────────────────────────────────────┘
```

This revised flow shows how:
1. All state is loaded from authoritative sources (database)
2. GameState provides parameters to downstream components
3. OpenAIContextManager is used as a stateless service
4. New state is stored back in the database
5. GameState is updated to reflect changes

The key architectural improvement is that state flows in one direction and there's a clear source of truth for each piece of information. 