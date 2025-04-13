# Spy Story Game Implementation Plan

This implementation plan outlines the steps needed to properly implement the game elements of the Spy Story application, focusing on mission tracking and currency-based story choices while respecting the existing architecture.

## 1. User Management System Implementation

### 1.1 Improve User Identification Logic 
- Implemented the approach outlined in `user_identification_plan.md`
- Ensured consistent identification using both session `user_id` and `protagonist_name`
- Review `get_or_create_user_progress()` in `utils/db_utils.py` to properly handle identification
- Ensure protagonist information is consistently stored in `branch_metadata["protagonist"]`

### 1.2 Enhance User Session Management 
- Fix user session persistence with Flask-Login
- Updated login route to handle agent codename login properly
- Ensure proper state tracking in `GameState` using `reload_state()` 

### 1.3 Story Resumption Implementation
- Complete integration of `UserProgressManager.js` with user session
- Implement robust "Continue Story" functionality 
- Verify that `StoryNode` resolution works correctly via `resolve_current_node()`
- Ensure story state retrieval through `get_node_context()`

## 2. Mission System Implementation

### 2.1 Mission Generation Enhancement
- Improve `extract_mission_details()` in `mission_generator.py` to better extract data from story text
- Update `create_mission_from_story()` to properly integrate with story nodes and characters
- Ensure mission data is correctly stored in `StoryNode.branch_metadata["mission_info"]`
- Fix character relationship tracking between missions and characters

### 2.2 Mission Integration with Story Nodes
- Enhance mission tracking in the `branch_metadata` structure as defined in `story_node_system.md`
- Ensure story choices properly update mission progress
- Implement consistent mission state transitions during story progression
- Fix parent-child node traversal with mission context preservation

### 2.3 Mission API Route Completion
- Fix the mission-related API endpoints in `main_routes.py` and `game_api.py`
- Ensure `api_missions_active()` works correctly
- Verify mission update/complete/fail endpoints handle state transitions properly
- Validate API responses against frontend expectations

## 3. Currency Reward System

### 3.1 Mission Completion Rewards
- Review `complete_mission()` in `mission_generator.py` to ensure proper reward distribution
- Verify `UserProgress.add_currency()` properly records transactions
- Fix `Transaction` model integration with mission completion

### 3.2 Currency Balance Management
- Ensure `UserProgress.currency_balances` is properly updated
- Verify transaction history is correctly maintained
- Test currency operations through the full user flow as described in `user_flow.md`

### 3.3 Currency API Integration
- Complete currency-related endpoints
- Ensure proper error handling for currency operations
- Test API responses against frontend requirements

## 4. Frontend Integration (Final Stage)

### 4.1 NotebookManager Integration
- Integrate the existing `NotebookManager.js` for displaying mission information
- Connect mission data display to the story interface
- Ensure proper loading of mission state in notebook

### 4.2 MissionManager Implementation
- Complete `MissionManager.js` implementation
- Fix API connections for mission data retrieval
- Implement proper mission progress visualization

### 4.3 User Progress UI
- Finish `UserProgressManager.js` integration with backend
- Display currency balances from `UserProgress.currency_balances`
- Implement proper continuation functionality

### 4.4 Story Choice Display
- Ensure story choices properly display and function
- Implement proper feedback for choice selections
- Maintain narrative flow when choices affect missions

## Implementation Priorities

1. **User Management System** (1.1-1.3)
   - Critical foundation for all user-specific data
   - Required for proper mission and progress tracking

2. **Mission System** (2.1-2.3)
   - Core gameplay mechanic driving the narrative
   - Important for proper story node integration

3. **Currency Reward System** (3.1-3.3)
   - Builds upon mission completion
   - Important for player motivation

4. **Frontend Integration** (4.1-4.4)
   - Final phase to surface backend functionality
   - Completes the user experience

Each task should be implemented with careful attention to the existing story node structure and user flow, with thorough testing at each stage.
