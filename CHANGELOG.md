# Changelog

## [Unreleased]
### Changed
- Consolidated CSS files by merging `characters.css` into `character.css`
- Enhanced character styling with improved background opacity and spacing
- Added new character highlighting and tooltip styles
- Streamlined `index.html` to match JavaScript structure
- Removed redundant UI elements not used by core functionality
- Improved character selection interface with clearer structure
- Enhanced character card layout and controls
- Added detailed logging to application startup and request handling
- Made user progress initialization optional to improve homepage performance
- Updated OpenAI API key handling and configuration
- Upgraded OpenAI client to use latest API version
- Enhanced error handling for OpenAI API authentication
- Consolidated loading animation handling in StoryFormHandler to support both initial story generation and choice submissions
- Enhanced loading animation with context-specific messages for different actions
- Improved button state management during loading states
- Streamlined event handler code by removing redundant implementations
- Improved storyboard layout by separating choice buttons from story content:
  - Moved choices container outside of story scroll container
  - Reduced story scroll container height to accommodate choices
  - Added visual separator between story text and choices
  - Enhanced choice button styling with better hover effects
  - Improved mobile responsiveness for both story and choice sections

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
- Fixed form submission error handling in EventHandlers.js
- Added proper AJAX request handling for story generation errors
- Fixed event binding in StoryFormHandler to prevent undefined event errors
- Improved error message display with toast notifications
- Fixed character selection handling in form submission
- Fixed loading animation not appearing when clicking choice buttons on the storyboard page
- Improved loading state feedback with proper button text preservation
- Enhanced error handling during story generation and choice submissions

### Security
- Removed the admin interface and debug endpoints to reduce the attack surface
- Improved logging configuration for better debugging and monitoring
- Improved API key handling in story_maker service

### Added
- Comprehensive documentation for all core model files:
  - config.py: Application configuration management
  - models/stories.py: Story generation and management
  - models/character_data.py: Character data and attributes
  - models/missions.py: Mission system and tracking
  - models/currency.py: Currency and transaction system
  - models/achievements.py: Achievement system
  - models/plot.py: Plot arc management
  - models/user.py: User progress and state management
- Detailed module-level documentation including:
  - Key features and components
  - Database schema details
  - Usage guidelines and notes
  - Relationship explanations
  - Side effect documentation
  - Type information and validation rules

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