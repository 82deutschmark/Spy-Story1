# Migration Plan: Segment Maker to Context Manager

## Overview

This document outlines a comprehensive plan to migrate useful functionality from the deprecated `segment_maker.py` module to the new stateless `context_manager.py` module. The migration will preserve valuable narrative analysis features while eliminating redundancy and potential conflicts between the two modules.

## Current State Analysis

### Segment Maker
- **Role**: Handles story continuation after initial creation
- **Key Issue**: Uses a stateful approach that creates duplication with the database
- **Valuable Features**:
  - Character interaction extraction
  - Previous choice extraction
  - Mission update processing
  - Story context building with continuity rules

### Context Manager
- **Role**: Stateless service for OpenAI API interactions
- **Current Features**:
  - Message building and formatting
  - API call processing
  - Enhanced context inclusion
  - Token management
- **Missing Features**: Narrative analysis to extract character interactions and previous choices

## Migration Objectives

1. Preserve narrative analysis capabilities from `segment_maker`
2. Maintain the stateless architecture of `context_manager`
3. Eliminate duplication between modules
4. Ensure database remains the single source of truth
5. Provide a clean deprecation path for `segment_maker`

## Implementation Plan

### Phase 1: Extract Utility Functions from `segment_maker` 
1. Create a new module `utils/narrative_analyzer.py` to house the narrative analysis utilities:
   - Move `_extract_character_interactions` from `StoryContinuationHandler`
   - Move `_extract_previous_choices` from `StoryContinuationHandler`
   - Move `_process_mission_update` from `StoryContinuationHandler`
   - Rename functions to remove leading underscores (they're now public utilities)

2. Refactor extracted functions to be stateless and accept all required parameters:
   - Convert class methods to standalone functions
   - Ensure they don't rely on instance state
   - Add docstrings that explain functionality and parameter requirements

### Phase 2: Enhance Context Manager with Narrative Analysis 
1. Modify `context_manager.py` to use the new narrative analysis utilities:
   - Import the utilities from `narrative_analyzer.py`
   - Update `generate_continuation` method to use these utilities

2. Add new methods to `OpenAIContextManager`:
   - `extract_story_elements`: Uses narrative analyzer to extract character interactions and choices
   - `process_mission_updates`: Safely processes mission updates from story response

3. Extend the `build_story_context` method to include:
   - Character interactions
   - Previous choices
   - Continuity rules

### Phase 3: Update Dependent Systems 
1. Modify `GameState` class to use the enhanced context manager:
   - Update `get_enhanced_context()` to incorporate character interactions
   - Update story continuation flow to use new capabilities

2. Update routes or controllers that call `segment_maker` functions:
   - Redirect to equivalent `context_manager` functionality
   - Provide all necessary parameters explicitly

### Phase 4: Deprecate Segment Maker 
1. Add deprecation notice to `segment_maker.py`:
   ```python
   """
   DEPRECATED: This module is deprecated and will be removed in future versions.
   All functionality has been migrated to context_manager.py and narrative_analyzer.py.
   Please update your imports to use those modules instead.
   """
   ```

2. Add deprecation warnings to functions in `segment_maker.py`:
   ```python
   import warnings
   warnings.warn(
       "generate_continuation in segment_maker is deprecated. Use OpenAIContextManager.generate_continuation instead.", 
       DeprecationWarning, 
       stacklevel=2
   )
   ```

3. Create adapter functions that forward calls to `context_manager` equivalents:
   - Keep the same API but forward implementation to new modules
   - Log deprecation warnings
   - This allows for a gradual transition without breaking existing code

## Implementation Details

### New File Structure

```
utils/
  ├── narrative_analyzer.py     # New module with extracted functionality
  └── context_manager.py        # Enhanced with narrative analysis
services/
  └── segment_maker.py          # Deprecated, now just forwards to context_manager
```

### Key Functions Added

#### In narrative_analyzer.py:
- `extract_character_interactions`: Identifies sentences where characters appear
- `extract_previous_choices`: Finds player decisions in narrative text
- `process_mission_update`: Handles mission progression logic
- `clean_story_response`: Sanitizes API responses

#### In context_manager.py:
- `extract_story_elements`: Coordinates extraction of narrative elements
- `process_story_response`: Cleans and processes story data
- Enhanced `build_story_context`: Now includes character interactions

### Migration Benefits

1. **Cleaner Architecture**:
   - All narrative analysis is now in a dedicated module
   - Context manager remains focused on API interactions
   - Clear separation of concerns

2. **Improved Context Management**:
   - Character interactions are now included in context
   - Previous choices are tracked and can influence future continuations
   - Better continuity between story segments

3. **Reduced Redundancy**:
   - No duplicate code between modules
   - Single responsibility for each component
   - Clear API boundaries

## Next Steps

1. **Testing**:
   - Create test cases with sample story data
   - Verify character extraction works with various character names
   - Test mission update processing with different status changes

2. **Documentation**:
   - Update API documentation to reflect new methods
   - Create examples of using the new narrative analysis features
   - Add usage notes for the enhanced context manager

3. **Monitoring**:
   - Track deprecation warnings in logs
   - Monitor for any issues with context extraction
   - Ensure mission updates are being properly applied

## Conclusion

The migration has been largely completed, with the core functionality successfully moved from `segment_maker.py` to the stateless `context_manager.py` architecture. The new implementation preserves the valuable narrative analysis features while eliminating code duplication and maintaining a clean, stateless design.

The deprecation path allows for a gradual transition, ensuring that existing code using `segment_maker` will continue to work while providing clear indicators that the code should be updated to use the new structure.
