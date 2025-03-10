
# Choose Your Own Adventure

An interactive storytelling application that lets users create custom adventures.

![Adventure Story App](static/images/app-preview.png)

## Overview

This application allows users to generate interactive stories featuring images from the database. Users can select characters, customize story parameters, and make choices that affect the story's direction.

## Features

- **Character Selection**: Choose from a library of characters to feature in your story
- **Multi-Character Support**: Select multiple characters to include in your adventures
- **Story Customization**: Set conflict, setting, narrative style, and mood
- **Interactive Choices**: Make decisions that affect the story's outcome
- **Image Analysis**: Upload character/scene images for AI analysis 
- **Debug Tools**: View and manage database records
- **Gamification System**: Earn experience points, level up, and track relationships with characters
- **Virtual Currency**: Earn and spend various currencies (💎, 💵, 💷, 💶, 💴) on story choices
- **Plot Arcs**: Track active and completed story arcs across multiple sessions
- **Mission System**: Characters assign missions targeting villain characters

## Recent Improvements

- **Backend Route Refactoring**:
  - Restructured routes.py into modular components for better organization and maintainability
  - Created separate route modules for main, debug, and API functionality
  - Implemented proper blueprint registration for all route modules
  - Fixed endpoint naming conflicts and URL building errors
  - Enhanced route organization with clearer separation of concerns

- **JavaScript Modularization**: 
  - Restructured frontend code with ES6 modules for better maintainability and organization
  - Separated main.js into UIUtils, CurrencyManager, UserProgressManager, CharacterManager, StoryManager, MissionManager, and PaymentManager modules
  - Refactored debug.js into multiple modules (DebugUI, DebugAPI, FormHandler, DataHandler, ModalHandler, ImageHandler, EventHandler, DebugUtils)
  - Implemented proper dependency injection pattern to resolve circular references

- **Debug Interface Improvements**:
  - Fixed API endpoints for debug page functionality (/debug/images and /debug/stories)
  - Enhanced debug interface with better image analysis workflow
  - Improved form handling for character data editing and saving
  - Added detailed statistics and health checks for database records
  - Fixed template linking for debug dashboard routes

- **Character System Enhancements**:
  - Standardized character roles (undetermined, villain, neutral, mission-giver)
  - Improved character introduction logic (limited to 10% chance after 4 characters)
  - Enhanced character evolution based on story interactions
  - Added improved character editing capabilities in debug interface

- **Gameplay Features**:
  - Added mission tracking and objectives to story generation
  - Implemented virtual currencies with exchange features
  - Created plot arc tracking across multiple story sessions

- **Technical Improvements**:
  - Resolved circular dependencies in JavaScript modules
  - Fixed DOM manipulation timing issues
  - Improved error handling in story continuation
  - Updated backend story generation logic for multiple character selection
  - Enhanced UI with better character highlighting and progress display
  - Fixed form submission duplicates and storyboard rendering issues
  - Resolved routing conflicts between refactored modules

## Technology Stack

- **Backend**: Flask, PostgreSQL, SQLAlchemy
- **Frontend**: HTML, CSS, JavaScript, Bootstrap
- **AI Services**: OpenAI's API (GPT-4o for story generation and image analysis)

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
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret
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

### Currency and Progress

1. Make choices to earn experience points and level up
2. Trade different currency types in the currency exchange
3. Purchase premium options using diamonds (💎)
4. View your progress and character relationships in the progress panel

### Using Debug Tools

1. Navigate to `/debug` endpoint
2. Upload images for AI analysis
3. View and manage database records
4. Run health checks on the database

## Project Structure

- `app.py`: Main application file with Flask routes
- `routes.py`: Modularized route handlers
- `models.py`: Database models (SQLAlchemy)
- `migrations/`: Database migration scripts
  - `add_mission_system.py`: Database migration for mission tracking features
- `services/`: 
  - `openai_service.py`: OpenAI API integration (contains artwork analysis prompts)
  - `story_maker.py`: Story generation logic (contains the core story generation prompts)
  - `mission_generator.py`: Mission creation and tracking system
- `static/`: CSS and JavaScript files
- `templates/`: HTML templates
- `api/`: API endpoints for potential Unity integration

### AI Prompts Location

The application uses two main AI prompts:

1. **Story Generation Prompt** - Located in `services/story_maker.py` in the `generate_story()` function (around lines 90-140):
  
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

The story universe is set in a high-stakes, sexy dramatic international spy network in the year 2070. The world is in a state of emergency with charismatic but incompetent protagonists who are more interested in partying and romance than saving the world.

## Known Issues and Future Improvements

- **PayPal Integration**: Complete payment processing for diamond purchases
- **UI/UX Refinements**: Further improve the user interface for character selection
- **Performance Optimization**: Enhance loading times for story generation
- **Mobile Responsiveness**: Improve the mobile experience
- **Achievement System**: Implement unlockable achievements for players
- **Interactive Map**: Add a visual map showing story locations and mission objectives

## Credits

- OpenAI for GPT-4o
- Bootstrap for UI framework

## License

MIT License
