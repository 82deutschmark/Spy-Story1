# Choose Your Own Adventure

An interactive storytelling platform that generates dynamic narratives with AI integration.

## Current Status and Known Issues (As of March 10, 2025)

### Critical Problems:
1. **Character Selection System Broken**
   - ✅ UI elements exist but not functioning
   - ❌ Checkmark indicator not visible when selecting characters
   - ❌ Selection state not properly maintained
   - ❌ Form submission missing selected character data

2. **JavaScript Modularization Issues**
   - ❌ Recent attempts to modularize code broke working functionality
   - ❌ Loading overlay system not properly implemented
   - ❌ Event handlers not correctly transferring form data
   - ❌ Previous working implementation lost during refactoring

3. **Form Submission Failures**
   - ❌ No characters being sent to backend (selected_images[] empty)
   - ❌ Debug logs show form data missing critical fields
   - ❌ Backend returning 400 errors due to missing data

### Root Causes Identified:
1. CSS visibility issues hiding selection indicators
2. Event handler modifications broke character selection
3. Form data collection process disrupted during modularization
4. Reroll functionality removed during updates

### Failed Fix Attempts:
1. Attempted CSS updates for selection visibility
2. Tried modifying event handlers for selection state
3. Attempted to restore loading overlay system
4. Failed to properly implement previous working version

### Next Steps:
1. Revert to last known working implementation
2. Re-implement character selection using working example
3. Restore proper form submission process
4. Fix CSS visibility issues

## Original Features (Currently Partially Working)
- Multi-Character Support
- Story Customization
- Interactive Choices
- Currency System
- Debug Tools

## Overview

This application allows users to generate interactive stories featuring Pawel and Pawleen (Yorkshire terriers) and other animal characters in a forest farm setting. Users can select characters, customize story parameters, and make choices that affect the story's direction.

## Features

- **Character Selection**: Choose from a library of characters to feature in your story
- **Multi-Character Support**: Select multiple characters to include in your adventures
- **Story Customization**: Set conflict, setting, narrative style, and mood
- **Interactive Choices**: Make decisions that affect the story's outcome
- **Currency System**: In-game currency for making choices and trading
- **Image Analysis**: Upload character/scene images for AI analysis 
- **Debug Tools**: View and manage database records

## Setup Instructions

### Prerequisites
- Python 3.11+
- PostgreSQL database
- OpenAI API key

### Environment Variables

Set up the following environment variables:

```
DATABASE_URL=postgresql://username:password@localhost/dbname
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_session_secret
```

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up the database:
   ```bash
   python migrate_db.py
   ```
4. Run the application:
   ```bash
   python main.py
   ```
5. Access the application at `http://localhost:5000`

## Usage

### Creating a Story

1. Visit the home page and select one or more characters
2. Customize story options (optional)
3. Click "Begin Your Adventure"
4. Make choices to progress through the story

### Using Debug Tools

1. Navigate to `/debug` endpoint
2. Upload images for AI analysis
3. View and manage database records
4. Run health checks on the database

## Project Structure

- `app.py`: Main application file with Flask routes
- `models.py`: Database models (SQLAlchemy)
- `services/`: 
  - `openai_service.py`: OpenAI API integration (contains artwork analysis prompts)
  - `story_maker.py`: Story generation logic (contains the core story generation prompts)
- `static/`: CSS and JavaScript files
- `templates/`: HTML templates
- `api/`: API endpoints for potential Unity integration

### AI Prompts Location

The application uses two main AI prompts:

1. **Story Generation Prompt** - Located in `services/story_maker.py` in the `generate_story()` function (around lines 90-140):
   - Instructs ChatGPT how to create interactive stories set in Uncle Mark's forest farm
   - Includes character details, narrative style guidelines, and formatting requirements

2. **Artwork Analysis Prompt** - Located in `services/openai_service.py` in the `analyze_artwork()` function (around lines 90-130):
   - Instructs ChatGPT how to analyze uploaded character images for the adventure story
   - Specifies the format for character trait extraction and response formatting

## API Endpoints

- `/generate`: Analyze an image with AI
- `/generate_story`: Generate a story segment
- `/api/db/health-check`: Check database health
- `/api/unity/*`: Endpoints for Unity game integration

## Character Universe

The story universe centers around Uncle Mark's forest farm with:

### Heroes
- **Pawel and Pawleen**: Yorkshire terriers who protect the farm
- **Clever Hens**: Birdadette, Henrietta, and other chickens
- **Big Red**: The not-so-bright rooster who leads the chicken coop

### Villains
- **Evil Squirrel Gangs**: Bully other animals and steal food
- **The Rat Wizard**: Steals eggs and vegetables for potions
- **Mice and Moles**: Forced by squirrels to help with schemes


## License

MIT License