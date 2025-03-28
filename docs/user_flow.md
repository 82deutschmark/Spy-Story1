# User Flow Documentation

This document traces the complete user journey through the Spy Story system, highlighting the files, classes, methods, and variables that handle each step of the process.

## Table of Contents

- [Initial Website Access](#initial-website-access)
- [Story Creation](#story-creation)
  - [Character Selection](#character-selection)
  - [Story Parameter Selection](#story-parameter-selection)
  - [Initial Story Generation](#initial-story-generation)
- [Story Interaction](#story-interaction)
  - [Viewing Story Segments](#viewing-story-segments)
  - [Making Choices](#making-choices)
  - [Story Continuation](#story-continuation)
- [Mission Progression](#mission-progression)
- [Technical Flow](#technical-flow)
  - [Web vs API Flow](#web-vs-api-flow)
  - [Database Interactions](#database-interactions)
  - [OpenAI Integration](#openai-integration)
- [Error Handling](#error-handling)

## Initial Website Access

When a user first visits the website:

1. **Web Request Handling**:
   - Flask routes in `routes/main_routes.py` receive the initial GET request to `/`
   - The `index()` function is called to handle this route

2. **User Identification**:
   - A session ID is generated using `uuid.uuid4()` in `get_or_create_user_progress()` function
   - This ID is stored in Flask's `session` object as `session['user_id']`

3. **Character Loading**:
   - `get_random_characters_with_roles()` in `main_routes.py` calls `get_random_characters()` from `utils/character_manager.py`
   - This function queries the database for characters with required roles
   - Characters are loaded from the `Character` model in `models/character_data.py`

4. **Story Options**:
   - `get_story_options()` from `services/story_maker.py` provides story parameter options
   - These options are stored in the `STORY_OPTIONS` dictionary with categories like conflicts, settings, etc.

5. **Template Rendering**:
   - The Flask `render_template()` function renders `templates/index.html`
   - Template variables include:
     - `story_options`: Available story parameters
     - `images`: Character data with ID, image URL, name, etc.
     - `background_image`: Random scene background
     - `user_progress`: UserProgress object if initialized

## Story Creation

### Character Selection

1. **User Interface**:
   - Users select characters via the web interface in `templates/index.html`
   - Character cards are rendered using `character_card.html` partial template
   - Characters can be rerolled using JavaScript in `static/js/modules/CharacterSelection.js`
   - Selected characters are added to the form as hidden inputs

2. **Protagonist Configuration**:
   - Users must enter their protagonist's name in the "Agent Codename" field
   - Users must select their protagonist's gender from the dropdown menu (male, female, non-binary)
   - These inputs are required and validated by `StoryFormHandler.js` before form submission
   - Values are stored in hidden form fields (`protagonistNameInput` and `protagonistGenderInput`)
   - Optional: Previously used agent names can be loaded via `UserProgressManager.js` to continue stories

3. **Backend Character Handling**:
   - `reroll_character()` route in `routes/main_routes.py` handles AJAX character reroll requests
   - Characters are selected via checkboxes and submitted in form data as `selected_images`
   - Protagonist name and gender are submitted as `protagonist_name` and `protagonist_gender` form values

### Story Parameter Selection

1. **Parameter UI**:
   - Users select conflict, setting, narrative style, and mood from dropdown menus
   - These parameters are defined in the `STORY_OPTIONS` dictionary in `services/story_maker.py`
   - The form submits data to the `/generate_story` route

2. **Form Submission**:
   - Form data is processed by `generate_story_route()` in `routes/main_routes.py`
   - The function validates parameters using `validate_story_parameters()` from `utils/validation_utils.py`
   - It prepares data in the `data` dictionary with nested `protagonist_info` and `additional_characters`
   - Protagonist name and gender are included in the `form_data` passed to `GameEngine.start_new_story()`

### Initial Story Generation

1. **Game Engine Initialization**:
   - `GameEngine(user_id)` is instantiated from `services/game_engine.py`
   - `start_new_story(form_data)` method is called with the processed form data

2. **Story Creation Process**:
   - Inside `start_new_story()`, parameters are extracted and formatted
   - `StoryGenerator` class from `services/story_maker.py` is used to generate the story
   - `StoryPromptBuilder.build_story_prompt()` creates a comprehensive prompt including protagonist details
   - `StoryPromptBuilder.build_protagonist_info()` formats the protagonist name and gender for the prompt
   - `CharacterPromptBuilder` formats character data for the prompt

3. **OpenAI API Call**:
   - `OpenAIContextManager` from `utils/context_manager.py` manages the API call
   - `generate_initial_story()` sends the prompt to OpenAI's API
   - System message is built with `_build_system_message()`
   - JSON response is processed and cleaned

4. **Database Storage**:
   - `StoryGeneration` model from `models/stories.py` stores the story with parameters
   - `StoryNode` model creates the initial node with `narrative_text` and rich `branch_metadata`
   - Protagonist details are stored in `branch_metadata["protagonist"]` with name, gender, and level
   - Characters are linked to the story via many-to-many relationship
   - `UserProgress` is updated with references to the new story and node

5. **State Management**:
   - `GameState` from `services/state_manager.py` is updated with new story references
   - `GameStateManager` notifies listeners of state changes via `update_state()`

6. **Response to User**:
   - If AJAX request: JSON response with redirect URL
   - Otherwise: Redirect to `storyboard` route with the new `story_id`

## Story Interaction

### Viewing Story Segments

1. **Story Loading**:
   - `storyboard(story_id)` route in `routes/main_routes.py` loads the story
   - `StoryGeneration.query.get_or_404(story_id)` retrieves the story from database
   - `get_or_create_user_progress()` loads or creates user progress

2. **State Resolution**:
   - `GameState(user_id)` is created to manage game state
   - `resolve_current_node()` determines the current story node using priority logic:
     1. Try `UserProgress.current_node_id`
     2. Use latest node by creation timestamp
     3. Fall back to root node

3. **Character Loading**:
   - Characters linked to the story are loaded with their images and metadata
   - Character relationship levels are extracted from `branch_metadata["character_relationships"]`

4. **Template Rendering**:
   - `render_template('storyboard.html')` displays the story segment
   - Template variables include:
     - `story`: StoryGeneration object with narrative
     - `node`: Current StoryNode with choices
     - `character_images`: Character data with relationship levels
     - `story_progress`: State tracking info

### Making Choices

1. **User Interface**:
   - Users select choices displayed from `current_node.branch_metadata["choices"]`
   - Each choice displays description, consequence, and requirements
   - Form submits to `/make_choice` route with choice ID and metadata

2. **Choice Submission**:
   - Form data is processed by `make_choice()` route in `routes/main_routes.py`
   - Required parameters include:
     - `story_id`: Current story identifier
     - `choice_id`: Selected choice identifier
     - `story_context`: Current story context
     - `characters`: Array of character IDs

3. **Character Enrichment**:
   - Selected character IDs are enriched with full database data
   - Complete character objects are retrieved with `Character.query.get(char_id)`
   - Character data is formatted with both `character_role` and `role` fields

### Story Continuation

1. **Game Engine Processing**:
   - `GameEngine(user_id)` processes the choice with `make_choice()`
   - State is reloaded using `state.reload_state()`
   - Current node is resolved with `state.resolve_current_node()`
   - Node context is retrieved with `state.get_node_context()`

2. **Continuation Generation**:
   - `StoryContinuationHandler` from `services/segment_maker.py` generates continuation
   - `generate_continuation()` builds a prompt with:
     - Previous narrative from current node
     - Chosen choice text
     - Complete character details
     - Mission information
     - Story parameters

3. **OpenAI API Call**:
   - `OpenAIContextManager.process_function_calling()` sends request to OpenAI
   - Response is validated with `validate_response()`
   - JSON is parsed and narrative text is extracted

4. **New Node Creation**:
   - `StoryNode` is created with:
     - `narrative_text`: Continuation text
     - `parent_node_id`: Link to previous node
     - `branch_metadata`: Rich context with character details, mission info, etc.

5. **State Transition**:
   - `state.transition_to_node(next_node.id)` updates game state
   - `db.session.commit()` finalizes transaction
   - `state_manager.update_state()` notifies listeners

6. **Response to User**:
   - Redirects to `storyboard` with the same `story_id`
   - New node is displayed with its narrative text and choices

## Mission Progression

1. **Mission Creation**:
   - Initial mission is generated during story creation
   - `generate_mission()` in `services/mission_generator.py` creates mission
   - Mission is stored in `Mission` model and linked to UserProgress

2. **Mission Updates**:
   - Mission progress is updated during story continuation
   - `update_mission_progress()` increments progress value
   - AI provides mission updates via `mission_update` in response

3. **Mission Completion**:
   - When mission progress reaches 100%, `complete_mission()` is called
   - Rewards are processed and added to user currency balances
   - UserProgress is updated with completed mission reference

## Technical Flow

### Web vs API Flow

1. **Web Interface Flow** (`routes/main_routes.py`):
   - Sessions track user identity with `session['user_id']`
   - Form submissions with POST/GET requests
   - Template rendering with `render_template()`
   - Redirects with `redirect(url_for())`

2. **API Flow** (`api/game_api.py` and `routes/api_routes.py`):
   - User ID passed explicitly in request body
   - JSON requests and responses
   - Status codes for result indication
   - Stateless design without sessions

### Database Interactions

1. **Database Session Management**:
   - `db.session` from `database.py` manages transactions
   - `db.session.begin_nested()` starts transaction
   - `db.session.commit()` finalizes changes
   - `db.session.rollback()` handles errors

2. **Model Relationships**:
   - Many-to-many relationship between StoryGeneration and Character
   - Parent-child relationship between StoryNodes
   - One-to-many relationship between UserProgress and Mission

### OpenAI Integration

1. **API Client Initialization**:
   - `get_openai_client()` in `services/story_maker.py` creates client
   - Uses `OPENAI_API_KEY` from environment variables

2. **Context Management**:
   - `OpenAIContextManager` maintains conversation history
   - System messages set behavior expectations
   - User messages contain story prompts
   - Assistant messages store responses

3. **Response Processing**:
   - JSON responses parsed with `json.loads()`
   - Response validated against expected schema
   - Narrative text and choices extracted
   - Error handling for malformed responses

## Error Handling

1. **API Error Handling**:
   - `register_error_handlers()` in `utils/error_handlers.py` sets up handlers
   - HTTP errors (404, 400, 500) mapped to JSON responses
   - Custom error messages added to response

2. **JSON Validation**:
   - `validate_json_structure()` ensures proper format
   - `safe_json_loads()` handles parsing with error recovery
   - `normalize_strings_in_dict()` fixes encoding issues

3. **Database Transaction Safety**:
   - Transactions wrapped in try/except blocks
   - Rollback on error with `db.session.rollback()`
   - Error logging with `logger.error()`

4. **Input Validation**:
   - `validate_story_parameters()` checks parameter validity
   - `validate_string_length()` ensures proper text length
   - Form data validated before processing 