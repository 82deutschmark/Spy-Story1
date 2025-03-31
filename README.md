# Spy Story Interactive Narrative System

## Overview
An interactive narrative system for generating and playing through spy stories with branching paths, character relationships, and mission objectives.

## Key Features

### Enhanced Context Management
The system now includes an optimized context management system for OpenAI interactions:
- Dedicated node count tracking with database persistence
- Enhanced context generation using key plot points and ancestor nodes
- Pre-computed narrative summaries at multiple detail levels
-

This enhancement provides better narrative coherence, improved continuity between story segments, and more efficient API usage.

### Story Generation
- AI-powered narrative generation
- Branching storylines with player choices
- Character development and relationships ###NOT YET IMPLEMENTED###
- Mission-based progression

### Currency System  ###Partially IMPLEMENTED###
- Multiple currency types (💎 Diamonds, 💷 Pounds, 💶 Euros, 💴 Yen, 💵 Dollars)
- Transaction tracking
- Currency requirements for special choices

### User Progress
- Persistent game state

- Choice history tracking


## Database Structure
The system uses a PostgreSQL database with the following key tables:
- `user_progress`: Tracks user state, currency, and progress
- `story_generation`: Stores story information
- `story_node`: Individual story segments
- `story_choice`: Choices connecting nodes
- `plot_arc`: Tracks narrative arcs and progression
- `node_context_summary`: Stores narrative summaries for context optimization

