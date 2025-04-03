# OpenAI Context Manager API

## Overview
The OpenAI Context Manager provides a stateless interface for OpenAI API interactions, handling prompt formatting, response processing, and context management for story generation and continuation.

## Key Features
- Stateless design for thread safety
- Enhanced context management for optimal narrative continuity
- Standardized message formatting
- Error handling and recovery
- Support for custom parameters

## Methods

### `generate_continuation`

Generates a continuation of an existing story based on player choices and context.

#### Parameters
- `client`: OpenAI client instance
- `user_message`: User prompt containing the player's choice
- `conflict`: Primary story conflict
- `setting`: Story setting
- `narrative_style`: Narrative style
- `mood`: Story mood
- `node_count`: Current node count in the story (for depth tracking)
- `mission_info`: Optional mission information
- `character_info`: Optional character information
- `enhanced_context`: Optional enhanced context from database (NEW)
- `temperature`: Optional temperature parameter for OpenAI
- `model`: Optional model name

#### Returns
Dictionary containing the generated continuation data:
- `narrative_text`: The generated story continuation
- `choices`: Array of available choices
- `mission_update`: Mission progress information

#### Example
```python
context_manager = OpenAIContextManager()
story_data = context_manager.generate_continuation(
    client=client,
    user_message="I choose to sneak into the embassy",
    conflict="International espionage",
    setting="Paris",
    narrative_style="Noir",
    mood="Tense",
    node_count=3,
    enhanced_context="RECENT EVENTS: You met with your handler at a cafe...",

)
```

### Enhanced Context Feature

The `enhanced_context` parameter allows for passing rich contextual information to improve narrative coherence:

1. **Content Format**: The enhanced context should contain:
   - Key plot points from the story arc
   - Recent story history (previous nodes)
   - Important character interactions
   - Mission status and progress

2. **Usage Notes**:
   - The context is prefixed with "STORY CONTEXT:" in the prompt
   - Keep context under 3000 characters for optimal performance
   - Prioritize recent and important story events

3. **Generation**: The `GameState.get_enhanced_context()` method generates optimized context using:
   - Key nodes from active plot arcs
   - Ancestor nodes in the story tree
   - Mission information from current node

4. **Storage**: The `NodeContextSummary` model stores pre-computed summaries at various detail levels:
   - `short`: Brief summaries (~100 tokens)
   - `medium`: Moderate detail (~300 tokens)
   - `long`: Full detail (~500 tokens) 