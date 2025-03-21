# Character Role and ID Handling

## Issue Description
The story generation system needed improvements in two areas:
1. Proper character role handling to prevent AI from inventing characters
2. Consistent character ID tracking throughout the story flow
3. Proper character name highlighting in story text

## Current Flow
1. `main_routes.py`: Fetches random characters for selection
2. `game_engine.py`: Formats character data for story generation
3. `story_maker.py`: Builds prompts and generates initial story
4. `segment_maker.py`: Generates story continuations
5. `CharacterMentions.js`: Handles character highlighting in UI

## Recent Improvements

### Character ID Handling (`segment_maker.py`)
- Added explicit `character_id` field to JSON structure
- Enhanced character choice prompt with ID requirements
- Added validation for character IDs in choices
- Improved error logging for ID mismatches

```python
# Example JSON structure with character_id
{
    "choices": [
        {
            "choice_id": "unique_choice_id",
            "text": "Choice description",
            "character_id": null  # Required field for character tracking
        }
    ]
}
```

### Character Role Requirements
- Mission-giver MUST be the one giving the mission
- Villain MUST be the primary antagonist
- Character IDs must be preserved exactly as provided
- No modification of character IDs allowed
- All character references must include proper ID

### Character Highlighting (`CharacterMentions.js`)
- Improved text processing to handle HTML content properly
- Added recursive DOM node processing
- Prevents double-processing of already highlighted names
- Maintains proper HTML structure during highlighting
- Handles character tooltips and click interactions

```javascript
// Example character highlighting structure
<span class="character-mention" data-character="character-id">
    Character Name
    <span class="character-tooltip">
        <img src="character-image.jpg" alt="Character Name">
        <div>Character Name</div>
    </span>
</span>
```

## Required Changes

### 1. Character Selection (`main_routes.py`)
- Modify random character selection to ensure required roles
- Add role validation before story generation
- Prevent story generation if required roles are missing
- Ensure character IDs are properly tracked
- Include all characters from story nodes in character_images list

### 2. Character Formatting (`game_engine.py`)
- Add explicit NPC marking in character data
- Ensure role information is properly formatted
- Validate character roles before story generation
- Track character IDs throughout the process

### 3. Story Generation (`story_maker.py`)
- Update system message to enforce role requirements
- Enhance character prompts with role-specific requirements
- Add validation for character usage in generated stories
- Ensure character IDs are preserved in story generation

### 4. Story Continuation (`segment_maker.py`)
- Add role enforcement to continuation prompts
- Ensure character roles remain consistent
- Prevent introduction of new characters
- Maintain character ID consistency throughout continuations

### 5. Character Highlighting (`CharacterMentions.js`)
- Process text nodes recursively to maintain HTML structure
- Skip already highlighted character mentions
- Use proper DOM parsing for HTML content
- Maintain character ID references in data attributes
- Handle character tooltips and portrait highlighting

## Implementation Status
✅ Character ID handling in segment_maker.py
✅ Character highlighting in CharacterMentions.js
⏳ Role validation in main_routes.py
⏳ Character formatting in game_engine.py
⏳ Story generation enhancements in story_maker.py

## Testing Plan
1. Test character selection with various role combinations
2. Verify story generation uses only database characters
3. Check story continuations maintain character roles
4. Validate character ID consistency throughout flow
5. Test error handling for ID mismatches
6. Verify character choice validation
7. Test character highlighting with various text content
8. Verify character tooltips and click interactions
9. Test highlighting with HTML-formatted text

## Success Criteria
1. All stories must use only characters from the database
2. Mission-giver and villain roles must be properly assigned
3. Character roles must remain consistent throughout the story
4. No new characters should be invented by the AI
5. Character IDs must be preserved exactly throughout the flow
6. Error messages should clearly indicate any ID mismatches
7. Character names must be properly highlighted in story text
8. Character tooltips must show correct character information
9. Character highlighting must work with HTML-formatted text

## Notes
- Changes maintain existing functionality
- Error handling is user-friendly
- Role and ID validation happens early
- Character consistency maintained across segments
- ID tracking enables proper relationship management
- Text processing preserves HTML structure
- Character highlighting handles dynamic content updates 