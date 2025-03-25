# Spy Story Game Engine

## Overview
An interactive spy thriller game engine that generates dynamic narratives with branching storylines, character relationships, and mission-based gameplay.

## Recent Updates

### Character System Improvements
- Enhanced character ID tracking throughout story flow
- Improved character role enforcement
- Better validation of character usage in stories
- Consistent character relationship tracking

### New Features & Updates

- **Central Character Manager:**  
  All character-related functions have been consolidated into `utils/character_manager.py`. This ensures that every character (i.e., a DB entry from models/character_data.py) is handled consistently, while the user/protagonist remains separate via UserProgress.

- **Game Engine Enhancements:**  
  The game engine now validates and formats character data inline, preventing type mismatches when passing character info to the story generation service.

### Key Features
- Dynamic story generation with branching narratives
- Character relationship system
- Mission-based gameplay
- Currency and experience system
- Rich story continuation

## Architecture

### Core Components
1. Story Generation
   - Initial story creation
   - Dynamic continuation
   - Choice processing
   - Character integration

2. Character System
   - Role-based characters (mission-giver, villain, neutral)
   - Relationship tracking
   - Character evolution
   - ID-based reference system

3. Mission System
   - Dynamic mission generation
   - Progress tracking
   - Reward system
   - Character-specific missions

4. State Management
   - User progress tracking
   - Story node management
   - Character relationship states
   - Mission states

## Documentation
- [Story Node System](docs/story_node_system.md)
- [Character Role Handling](docs/character_role_handling.md)
- [Story Flow](docs/story_flow.md)

## Technical Requirements
- Python 3.8+
- PostgreSQL
- OpenAI API key
- Flask web framework

## Setup
1. Clone the repository
2. Install dependencies: `pip install -r requirements.txt`
3. Set up environment variables:
   ```
   OPENAI_API_KEY=your_api_key
   DATABASE_URL=your_database_url
   ```
4. Initialize database: `flask db upgrade`
5. Run the application: `flask run`

## Development Guidelines
1. Always read entire files before making changes
2. Maintain proper character ID tracking
3. Ensure role consistency in story generation
4. Follow modular architecture principles
5. Keep files under 300 lines
6. Document all changes in CHANGELOG.md

## Testing
1. Run tests: `pytest`
2. Check character ID validation
3. Verify story continuation flow
4. Test character role enforcement
5. Validate mission updates

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License
MIT License - See LICENSE file for details