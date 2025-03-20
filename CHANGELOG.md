# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced node resolution system with priority-based logic:
  - User's current node for story
  - Story's latest node
  - Root node fallback
- Atomic state transitions with transaction management
- Rich node context retrieval including:
  - Parent node chains
  - Character relationships
  - Active missions
  - Story metadata
- Improved state validation and error handling

### Changed
- Refactored state management system:
  - Enhanced GameState class with robust node resolution
  - Added transaction management for state transitions
  - Improved error handling and logging
  - Better state synchronization between components
  - Enhanced state persistence and notifications
- Updated story continuation system:
  - Enhanced choice generation with proper currency requirements
  - Improved choice formatting in branch metadata
  - Added proper initialization of choices array in new nodes
  - Enhanced choice ID preservation across story segments
  - Improved choice type handling and validation

### Fixed
- Fixed critical node resolution issues in storyboard route
- Improved error handling in state transitions
- Enhanced character relationship tracking
- Fixed state persistence between story segments
- Improved state consistency across components
- Fixed choice button display issues:
  - Corrected CSS class mismatch (choice-button to choice-btn)
  - Ensured proper currency requirements in choice structure
  - Fixed choice formatting in branch metadata
  - Improved choice ID handling and preservation
  - Enhanced choice validation and error handling
- Fixed story continuation issues:
  - Improved empty response handling from OpenAI API
  - Enhanced response validation and error logging
  - Fixed choice structure validation
  - Improved mission update handling
  - Enhanced character relationship updates
- Fixed critical database schema issue in story_node table:
  - Properly aligned database schema with model definition
  - Ensured story_id column exists as a proper foreign key to story_generation
  - Maintained proper separation between shared story content and user-specific progress
  - Verified correct relationship between StoryNode and UserProgress tables
  - Documented table structure in schema documentation

### Changed
- Refactored state management system
  - Moved GameState class to state_manager.py
  - Removed duplicate state management code from game_engine.py
  - Enhanced state persistence and notifications
  - Improved state synchronization between components

### Fixed
- Fixed game engine state management
  - Properly integrated OpenAIContextManager
  - Fixed state persistence issues
  - Fixed character relationship tracking
  - Fixed mission progress updates

### Improved
- Enhanced state management architecture
  - Better separation of concerns
  - Improved code organization
  - More efficient state updates
  - Better error handling

- Fixed character reroll functionality:
  - Removed duplicate radio button from character card template
  - Fixed selection state clearing on character reroll
  - Removed redundant character selector initialization in main.js
  - Ensured proper event handler cleanup and reattachment
  - Fixed hidden input field clearing on reroll
  - Improved error handling during reroll process
  - Enhanced user feedback with toast notifications
  - Fixed character selection state management
  - Ensured proper DOM updates after reroll
  - Fixed event propagation issues with reroll button

## [Unreleased]
### Changed
- Refactored state management system:
  - Moved GameState class to state_manager.py for better organization
  - Removed duplicate state management code from game_engine.py
  - Simplified state synchronization between components
  - Removed redundant error handling from state management
  - Enhanced state persistence and reloading
  - Improved state update notifications
  - Streamlined state manager interface
  - Removed redundant docstrings and comments
  - Simplified listener implementation
  - Enhanced state serialization

### Fixed
- Fixed game engine state management:
  - Properly integrated OpenAIContextManager with state management
  - Fixed story continuation context handling
  - Improved mission update synchronization
  - Enhanced character relationship tracking
  - Fixed state persistence between story segments
  - Improved state reloading from database
  - Fixed state update notifications
  - Enhanced state serialization
  - Fixed state manager initialization
  - Improved state consistency across components

### Improved
- Enhanced state management architecture:
  - Better separation of concerns between components
  - Improved code organization and documentation
  - Enhanced state synchronization
  - Better state persistence handling
  - Improved state update notifications
  - Enhanced state serialization
  - Better state reloading from database
  - Improved state consistency
  - Enhanced state manager interface
  - Better state update handling
- Refactored form handling system:
  - Migrated from EventHandlers.js to modular FormHandler.js
  - Improved form validation with HTML5 validation
  - Enhanced error handling and user feedback
  - Added proper loading states for form submissions
  - Improved character selection validation
  - Added support for custom field toggling
  - Enhanced form data handling and submission
  - Improved error message visibility and styling
  - Fixed choice form validation and submission
  - Added proper handling of choice_id in form data
  - Fixed character selection handling in story form submission:
    - Now properly uses hidden input for character selection
    - Improved validation of selected character before submission
    - Fixed undefined character ID issue in form submission
    - Enhanced error handling for character selection
    - Improved user feedback when no character is selected
  - Enhanced choice button behavior:
    - Added prevention of multiple choice selections
    - Improved loading state feedback during choice processing
    - Added proper handling of choice form submissions
    - Enhanced error handling for choice submissions
    - Improved user feedback during choice processing
  - Added new ChoiceHandler module for improved choice flow:
    - Centralized choice state management
    - Enhanced choice form submission handling
    - Improved loading states during choice processing
    - Better error handling and user feedback
    - Proper integration with existing modules

### Removed
- Deleted the redundant `characters.css` file after consolidation
- Removed unused UI elements from the landing page
- Removed the purchase modal (to be implemented later)
- Removed admin and debug features for a cleaner, production-focused codebase
- Removed the Flask-Admin dependency and related configurations
- Removed debug routes and templates
- Removed unnecessary `paypalrestsdk` package
- Removed debug dashboard link and references
- Removed trade modal and currency-related UI elements

### Fixed
- Updated the Mission model to reference characters instead of `scene_images` for `giver_id` and `target_id`
- Corrected database schema documentation to match actual implementation
- Enhanced error handling in the reroll character functionality
- Improved error messages for the character reroll endpoint
- Verified reroll functionality is working correctly with proper JSON responses and character data
- Fixed homepage 500 error caused by debug dashboard references
- Added proper error template for handling server errors gracefully
- Fixed story generation by properly handling API key in story_maker.py
- Fixed form submission error handling in EventHandlers.js:
  - Improved validation for required story parameters
  - Added user-friendly error messages for missing selections
  - Fixed character selection handling in form data
  - Enhanced error display with both toast notifications and inline messages
  - Improved loading state management during form submission
  - Added proper error handling for API responses
  - Consolidated error handling for both initial story and choice forms
- Added proper AJAX request handling for story generation errors
- Fixed event binding in StoryFormHandler to prevent undefined event errors
- Improved error message display with toast notifications
- Fixed character selection handling in form submission
- Fixed loading animation not appearing when clicking choice buttons on the storyboard page
- Improved loading state feedback with proper button text preservation
- Enhanced error handling during story generation and choice submissions
- Fixed critical database relationship issue in StoryGeneration model:
  - Removed incorrect story_images association table that was causing "Unknown PG numeric type: 3802" error
  - Updated storyboard route to use correct story.characters relationship instead of story.images
  - Fixed model imports in models/__init__.py to remove story_images reference
  - Ensured proper character image handling in storyboard template
  - Added error handling for character image loading in storyboard route
  - Improved logging for character image processing errors
  - Fixed database schema to properly reflect character-story relationships
  - Updated documentation to clarify correct model relationships
- Corrected form submission handling in storyboard.html:
  - Ensured choice forms properly submit to /make_choice endpoint
  - Maintained proper data structure for choice submissions
  - Fixed character data handling in choice continuation
  - Preserved currency requirement checks and processing
  - Kept proper error handling and user feedback

### Security
- Removed the admin interface and debug endpoints to reduce the attack surface
- Improved logging configuration for better debugging and monitoring
- Improved API key handling in story_maker service

## Previous Changes


# Changelog

## [Unreleased]
### Changed
- Major refactoring of routes structure, migrated from monolithic routes.py to blueprint architecture
- Fixed JavaScript module export in CharacterManager.js
- Moved get_or_create_user_progress function to utils/db_utils.py

## [Previous Updates]


# Changelog

## [1.0.1] - 2025-03-15

### Fixed
- Fixed reroll button functionality in character selection screen
- Improved module initialization in main.js
- Fixed character manager and event handlers interaction
- Restored direct DOM manipulation for reroll behavior matching original implementation
- Simplified reroll button functionality to match the original working implementation
- Fixed module import pattern using named exports
- Fixed syntax error in main_routes.py (missing proper try-except block closure)

- Fixed reroll character functionality by adding the missing `/reroll_character` endpoint
- Fixed Character selection forms to properly collect selected character IDs
- Fixed reroll button event handling and error management


## [1.0.0] - 2025-03-01

### Added
- Initial release


# Changelog

All notable changes to the Story Creator project will be documented in this file.


- Enhanced storyboard page styling for dynamically generated pages:
  - Improved styling for story buttons and content area.
  - Updated `story.css` for better visual alignment.
  - Adjustments to HTML templates to match new style requirements.

## [Unreleased]

### Fixed
- Fixed Flask-Admin integration by updating CharacterView to properly reflect Character model attributes
- Removed references to deprecated ImageAnalysis model throughout the application 
- Updated unity_routes.py to use SceneImages instead of ImageAnalysis
- Updated debug_routes.py to use SceneImages model
- Fixed mission_generator.py to use SceneImages model
- Updated remaining service files to use new model structure
- Fixed references in scripts/debugging/debug_associations.py to use Character model
- Updated game_engine.py to properly use Character model from character_data.py
- Fixed data integrity and database fix scripts to use the proper Character model
- Updated utils/db_utils.py to use Character and SceneImages models instead of deprecated ImageAnalysis
- Fixed error handling in get_random_scene_background to provide a fallback image
- Fixed storyboard route to use Character model instead of ImageAnalysis
- Fixed story_images association table to properly link StoryGeneration with SceneImages
- Fixed StoryNode model by removing ImageAnalysis relationship references
- Fixed CharacterEvolution model to reference characters table instead of image_analysis

### Security
- Removed debug tools access from main interface for improved security

### Database
- Migrated from ImageAnalysis table to new Characters table
- Updated CharacterEvolution model to reference new Characters table
- Migrated scene images from ImageAnalysis to SceneImages table
- Updated story_images association table to use SceneImages instead of ImageAnalysis
- Fixed database relationships and foreign key constraints
- Ensured proper character role standardization across the system
- Created migration script to move scene images from ImageAnalysis to SceneImages and update story associations

### Improved
- Enhanced story generation service with more detailed prompts and narrative guidance
- Increased story segment length and detail with improved system and content prompts
- Added better continuity handling between story segments
- Improved character integration into narrative with deeper character development

## UI and Progress Tracking Improvements
**Files:** 
- `static/js/modules/UserProgressManager.js`
- `static/css/components/story.css`
- `static/css/components/notebook.css`
- `static/css/custom.css`
- `templates/storyboard.html`
- `templates/index.html`
**Date Added:** 2023
**Purpose:** Enhanced user interface and improved player progress tracking
**Changes:**
- Fixed display of player progress in UI components
- Improved UI scaling and responsive design across devices
- Updated scene images to properly display as page backgrounds
- Implemented collapsible accordion for Agent Notebook
- Added character thumbnails with proper name captions in text
- Enhanced mobile experience with responsive meta tags and sizing
- Added Unity-compatible container classes for future portability

## Currency System Migration
**File:** `migrations/add_currency_system.py`
**Date Added:** 2023
**Purpose:** Added support for in-game currency system
**Changes:**
- Created `currency` table with currency types and symbols
- Added `currency_balances` JSON column to `

### Fixed
- Fixed server startup issues by correcting model imports in models/__init__.py:
  - Removed incorrect reference to non-existent models.images module
  - Updated imports to use correct model names (SceneImages instead of ImageAnalysis)
  - Added missing Character model import from character_data
  - Fixed circular import issues in model relationships
  - Ensured all required models are properly exported in __all__

### Improved
- Enhanced error handling and user feedback:
  - Added proper flash messages for form submission errors
  - Improved loading state feedback during submissions
  - Maintained consistent error display across both flows
  - Preserved proper redirect handling after submissions

### Fixed
- Fixed ChoiceHandler initialization error:
  - Now only initializes on storyboard page where story_id is available
  - Prevents "Missing story_id" error on non-storyboard pages
  - Improved error handling during initialization
  - Enhanced module initialization logic in main.js
  - Fixed critical error during application initialization

### Fixed
- Fixed character reroll and story generation functionality:
  - Fixed macro rendering in reroll_character endpoint to properly import and use character_card macro
  - Fixed form submission by moving story options inside the form element
  - Ensured all required story parameters (conflict, setting, narrative_style, mood) are included in form submission
  - Fixed story generation validation by properly organizing form fields
  - Improved error handling and user feedback during story generation

### Fixed
- Resolved circular reference issue in story generation by properly structuring the story data response
- Fixed syntax error in story_maker.py by correcting docstring formatting
- Improved story data structure to maintain OpenAI response format under "stories" key while preserving metadata at root level