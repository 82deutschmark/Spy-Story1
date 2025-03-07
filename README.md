# AI-Powered Interactive Story Generator

## Project Overview
This Flask-based application creates dynamic, interactive narratives using AI-powered story generation and character analysis. The system integrates character traits, scene metadata, and branching narratives to create unique, personalized story experiences.

## Key Features
- Dynamic story generation based on character and scene interactions
- Character-driven narrative choices influenced by traits and roles
- Scene-based storytelling with environmental context
- Achievement system based on character combinations
- Visual story building interface
- Unity game client support via API endpoints

## System Architecture

### Core Components

1. **Story Branching Service**
   - Manages story flow and decision trees
   - Integrates character traits with choice generation
   - Creates scene-based narrative nodes
   - Handles achievement tracking
   - Suggests story paths based on character relationships

2. **Character System**
   - Stores character traits, roles, and relationships
   - Influences story choices based on character attributes
   - Supports character-driven narrative moments
   - Enables character combination achievements

3. **Scene Management**
   - Maintains scene metadata and context
   - Generates environment-aware story nodes
   - Tracks dramatic moments and setting details

4. **Story Builder Interface**
   - Visual branching narrative editor
   - Character and scene integration tools
   - Achievement creation system
   - AI-powered story suggestions

### Database Structure

The system uses PostgreSQL with the following key models:

```python
- ImageAnalysis
  - Stores character and scene data
  - Handles image metadata and analysis
  - Tracks character traits and roles

- StoryNode
  - Represents story decision points
  - Links to characters and scenes
  - Stores narrative text and choices

- StoryChoice
  - Connects story nodes
  - Contains choice text and consequences
  - Tracks character influence

- UserProgress
  - Manages player state
  - Tracks achievements
  - Stores choice history

- Achievement
  - Defines unlock conditions
  - Tracks character combinations
  - Awards points for progress
```

## Setup and Usage

### Prerequisites
- Python 3.x
- PostgreSQL database
- Required Python packages (see requirements.txt)

### Environment Variables
```
DATABASE_URL=postgresql://...
SESSION_SECRET=your_secret_key
OPENAI_API_KEY=your_openai_key
```

### Running the Application
1. Install dependencies: `pip install -r requirements.txt`
2. Set up the database: Runs automatically on startup
3. Start the server: `python main.py`
4. Access the application at `http://localhost:5000`

### Key Routes
- `/` - Home page with character gallery
- `/story-builder` - Visual story creation tool
- `/storyboard` - Story playthrough interface
- `/api/unity/*` - Unity client endpoints

## API Endpoints

### Story Management
- `GET /api/unity/story-node/<node_id>` - Get story node details
- `POST /api/unity/select-choice/<choice_id>` - Make a story choice
- `GET /api/unity/user-progress/<user_id>` - Get user progress

### Character System
- `GET /api/unity/characters` - List available characters
- `GET /api/unity/story-branch/<node_id>` - Get branch information
- `GET /api/unity/achievements/<user_id>` - Get user achievements

### Game State
- `POST /api/unity/save-game-state` - Save game progress
- `GET /api/unity/load-game-state/<user_id>` - Load saved game

## License
This project is licensed under the MIT License - see the LICENSE file for details.
