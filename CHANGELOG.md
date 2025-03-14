
# Database Changelog

This document tracks all significant database migrations and schema changes.

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
