# Character Role Handling Fix Plan

## Issue Description
The story generation system is currently allowing the AI to invent characters not present in the database, instead of properly using the characters with their assigned roles (mission-giver, villain, etc.) from the database.

## Current Flow
1. `main_routes.py`: Fetches random characters for selection
2. `game_engine.py`: Formats character data for story generation
3. `story_maker.py`: Builds prompts and generates initial story
4. `segment_maker.py`: Generates story continuations

## Required Changes

### 1. Character Selection (`main_routes.py`)
- Modify random character selection to ensure required roles
- Add role validation before story generation
- Prevent story generation if required roles are missing

```python
# Example validation
selected_roles = [char.character_role for char in selected_characters]
if 'mission-giver' not in selected_roles or 'villain' not in selected_roles:
    return jsonify({'error': 'Story requires both a mission-giver and villain character'}), 400
```

### 2. Character Formatting (`game_engine.py`)
- Add explicit NPC marking in character data
- Ensure role information is properly formatted
- Validate character roles before story generation

```python
def format_character_traits(char):
    return {
        "character_traits": char.character_traits or {},
        "backstory": char.backstory or "",
        "plot_lines": char.plot_lines or [],
        "role": char.character_role or "neutral",
        "is_npc": True  # Explicitly mark as NPC
    }
```

### 3. Story Generation (`story_maker.py`)
- Update system message to enforce role requirements
- Enhance character prompts with role-specific requirements
- Add validation for character usage in generated stories

```python
# Example role requirements
role_requirements = """
REQUIRED CHARACTER ROLES:
1. Mission-giver MUST be the one giving the mission to the player
2. Villain MUST be the primary antagonist
3. All other characters must be used according to their specified roles
4. No new characters can be invented
5. Each character's role must be respected throughout the story
"""
```

### 4. Story Continuation (`segment_maker.py`)
- Add role enforcement to continuation prompts
- Ensure character roles remain consistent
- Prevent introduction of new characters

```python
# Example role enforcement
character_role_guidelines = """
CHARACTER ROLE ENFORCEMENT:
1. Mission-giver must remain the mission-giver throughout the story
2. Villain must remain the primary antagonist
3. All characters must maintain their assigned roles
4. No new characters can be introduced
5. Character roles cannot be changed or swapped
"""
```

## Implementation Order
1. Start with `main_routes.py` to ensure proper character selection
2. Update `game_engine.py` to properly format character data
3. Enhance `story_maker.py` with stricter role requirements
4. Update `segment_maker.py` to maintain role consistency

## Testing Plan
1. Test character selection with various role combinations
2. Verify story generation uses only database characters
3. Check story continuations maintain character roles
4. Validate error handling for missing required roles

## Success Criteria
1. All stories must use only characters from the database
2. Mission-giver and villain roles must be properly assigned
3. Character roles must remain consistent throughout the story
4. No new characters should be invented by the AI
5. Error messages should clearly indicate missing required roles

## Notes
- Changes should maintain existing functionality
- Error handling should be user-friendly
- Role validation should happen early in the process
- Character role consistency must be maintained across story segments 