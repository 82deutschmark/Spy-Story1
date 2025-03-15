
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
- Added `currency_balances` JSON column to `user_progress` table
- Added `currency_requirements` JSON column to `story_choice` table
- Added default currencies: diamond (💎), pound (💷), euro (💶), yen (💴), dollar (💵)

## Character Name Migration
**File:** `migrations/add_character_name.py`
**Date Added:** 2023
**Purpose:** Improved character identification
**Changes:**
- Added `character_name` column to `image_analysis` table
- Populated `character_name` from `analysis_result->>'name'` for existing records

## Gamification System Migration
**File:** `migrations/add_gamification.py`
**Date Added:** 2023
**Purpose:** Enhanced user engagement with gamification features
**Changes:**
- Updated `user_progress` table with new columns:
  - `current_story_id`, `level`, `experience_points`
  - JSON arrays for tracking plot arcs, characters, choices, and achievements
- Created `character_evolution` table to track character development
- Created `plot_arc` table to manage long-term story arcs
- Added database indices for improved query performance

## Mission System Migration
**File:** `migrations/add_mission_system.py`
**Date Added:** 2023
**Purpose:** Added mission tracking functionality
**Changes:**
- Added mission arrays to `user_progress` table: `active_missions`, `completed_missions`, `failed_missions`
- Created `mission` table for detailed mission tracking

## Mission Tracking Fix
**File:** `migrations/fix_mission_tracking.py`
**Date Added:** 2023
**Purpose:** Fixed issues with mission tracking
**Changes:**
- Ensured mission tracking arrays are properly initialized
- Created missing missions from story data
- Added missions to user's active missions list

## Unused Tables Fix
**File:** `migrations/fix_unused_tables.py`
**Date Added:** 2023
**Purpose:** Improved utilization of existing tables
**Changes:**
- Updated `UserProgress` records with proper initialization
- Updated `CharacterEvolution` records with proper initialization
- Created missing `StoryNode` records for existing stories
- Updated `PlotArc` records with key nodes

## Story Nodes Update
**File:** `migrations/update_story_nodes.py`
**Date Added:** 2023
**Purpose:** Enhanced story node connections
**Changes:**
- Added story_id to node metadata
- Linked story choices to next nodes
- Connected missions to story nodes

### To Do
- Resolve remaining issues with loading animation not functioning
- Finalize character highlighting logic
- Improve text readability with proper panel or frame styling
- Ensure character image sizing aligns with reference Yorkie file
- Validate placement of choice buttons relative to story text

## Debugging Progress (March 2025)

### Character Selection Issues
**Current State:**
- Character selection functionality is broken in the storyboard interface
- JavaScript errors occur with method naming inconsistencies
- Main JavaScript modules are failing to initialize properly

**Attempted Fixes:**
1. Fixed method naming consistency issues:
   - Updated `EventHandlers.js` to use `initialize()` instead of `init()`
   - Updated `CharacterManager.js` to properly define the `initialize()` method

**March 15, 2025 Update:**
1. Standardized all module initialization methods:
   - Implemented proper `initialize()` method in `EventHandlers.js`
   - Updated `CharacterManager.js` to use `initialize()` instead of `init()`
   - Updated `PaymentManager.js` to use `initialize()` instead of `init()`
   - Fixed `main.js` to properly call initialize methods on all modules
   - Implemented direct initialization for critical modules
   - Fixed character highlighting in story text

**Resolved Issues:**
- Fixed "Uncaught TypeError: EventHandlers.initialize is not a function"
- Fixed "CharacterManager.init is not a function"
- Fixed "PaymentManager.init is not a function"
- Fixed character highlighting in story content
- Implemented centralized event handling for forms and interactions

**March 16, 2025 Update:**
1. Fixed module initialization issues:
   - Prevented duplicate declaration of CharacterManager, EventHandlers, and PaymentManager
   - Added safeguards to prevent multiple initializations of modules
   - Standardized all initialization methods to use `initialize()` instead of `init()`
   - Added module import detection flag in main.js

**March 17, 2025 Update:**
1. Refactored EventHandlers.js:
   - Fixed character selection functionality
   - Improved reroll button handling
   - Added proper form submission validation
   - Ensured event handlers are properly scoped
   - Fixed module export pattern

2. Fixed module import/export system:
   - Updated main.js to use proper ES6 module imports
   - Fixed export pattern in CharacterManager.js
   - Fixed export pattern in EventHandlers.js
   - Fixed export pattern in PaymentManager.js
   - Resolved "module does not provide an export named 'default'" errors

**March 18, 2025 Update:**
1. Fixed EventHandlers module loading error:
   - Standardized module export pattern to support both ES6 and CommonJS
   - Added proper default exports to EventHandlers.js and CharacterManager.js
   - Enhanced main.js to handle both named and default exports
   - Improved error handling for module initialization
   - Resolved "The requested module does not provide an export named 'default'" errors

2. Fixed CharacterManager module:
   - Improved character highlighting in story text
   - Fixed character name detection from multiple sources
   - Removed duplicate initialization code

3. Standardized all modules:
   - Consistent module export pattern
   - Proper window object assignment
   - Error handling for initialization functions
   - Better logging for debugging

**Next Steps:**
- Verify character selection works on all pages
- Test story choice submission with different character combinations
- Ensure mobile layouts display correctly
- Test character highlighting in various scenarios story scenarios