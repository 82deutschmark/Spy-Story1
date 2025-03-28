# Central Character Manager Consolidation Plan

## Purpose
- Define that every "character" refers exclusively to an entry in the database table (models/character_data.py).
- The user/protagonist is managed separately via UserProgress; they are not to be treated as a character.

## Proposed Structure
1. **Central Character Manager Module**
   - Create a new file `d:\Stuff\Spy Story\Spy-Story1\utils\character_manager.py`.
   - This module will encapsulate all functions related to character handling such as:
     - `get_random_characters()`
     - `format_character_info()`
     - `extract_character_traits()`
     - `extract_character_name()`
     - `extract_character_role()`
     - `extract_character_backstory()`
     - `extract_character_plot_lines()`
   - Clearly note in the documentation that “character” means a DB entry and does not include the user/protagonist.

2. **Refactor Existing Code**
   - Move logic from the current implementations (e.g., `CharacterFormatter` in segment_maker.py and similar functions in story_maker.py, main_routes.py) into the new module.
   - Replace all direct references with calls to the new central module.
   - Remove duplicate implementations so that all character functionality is centralized.

3. **Documentation and Maintenance**
   - Document the new module extensively, explaining that character functions deal only with the DB entries.
   - Emphasize that the user/protagonist is managed via UserProgress.
   - This consolidation will reduce redundancy and ease future maintenance.

Implemented!!