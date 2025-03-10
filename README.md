
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

## Recent Improvements

- **Gamification System**: Added user levels, experience points, and character relationships
- **Currency System**: Implemented virtual currencies with exchange features
- **Plot Arc Tracking**: Added system to track story progress across multiple sessions
- **Character Evolution**: Characters now evolve based on story interactions
- **Multi-Character Support**: Enhanced the app to support selecting multiple characters for stories
- **Improved Error Handling**: Fixed issues with story continuation and form submission
- **Backend Optimization**: Updated the story generation logic to handle multiple character selections
- **UI Enhancements**: Fixed character highlighting in story text and added progress display
- **Bug Fixes**: Resolved form submission duplicates and storyboard rendering issues

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
- `services/`: 
  - `openai_service.py`: OpenAI API integration (contains artwork analysis prompts)
  - `story_maker.py`: Story generation logic (contains the core story generation prompts)
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

## Credits

- OpenAI for GPT-4o
- Bootstrap for UI framework

## License

MIT License
