# Changelog

All notable changes to the Story Creator project will be documented in this file.

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