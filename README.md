
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
- **Dynamic Currency System**: Choice costs now scale based on player level and story progression
- **Mission Tracking**: Improved system for tracking missions across story segments
- **Character Evolution**: Enhanced character development through story interactions

## Recent Improvements

- **Database Schema Fixes**:
  - Fixed critical database column issues in the image_analysis table
  - Added missing columns: role, potential_plot_lines, backstory, description
  - Created database migration scripts to handle schema updates
  - Implemented data synchronization between duplicate fields (role and character_role)
  - Added comprehensive database column checking and validation
  - Fixed SQL errors related to undefined columns
  - Fixed syntax errors in database queries for improved stability

- **Story Generation Improvements**:
  - Fixed duplicate OpenAI API calls during story generation
  - Optimized API usage by removing redundant image analysis during story creation
  - Ensured custom options provided by users are properly saved to the database
  - Enhanced the story generation process to be more efficient

- **Currency System Enhancements**:
  - Implemented dynamic pricing for story choices based on player level
  - Adjusted choice costs to start at $500 with additional costs based on complexity
  - Created a more balanced economy with choice costs capped at player level + $1000
  - Removed restrictions on currency exchanges for better gameplay fluidity
  - Simplified currency display by showing balances only in the Progress UI

- **Mission System Improvements**:
  - Enhanced mission tracking and database integration
  - Fixed mission generation to include different mission givers for variety
  - Ensured missions are properly recognized and extracted from stories
  - Added proper tracking of mission parameters in the database
  - Fixed relationships between missions and story nodes

- **Character Evolution Refinements**:
  - Improved character evolution tracking across story sessions
  - Enhanced relationship network development through story interactions
  - Fixed plot contributions tracking for character development
  - Ensured character roles are properly applied and tracked

- **Database Management**:
  - Added migrations to fix unused tables and missing data
  - Implemented proper tracking of story nodes and connections
  - Fixed issues with character and mission relationships
  - Enhanced data persistence across story sessions

- **Earlier Improvements**:
  - Backend Route Refactoring with modular components and blueprint registration
  - JavaScript Modularization with ES6 modules for better maintainability
  - Debug Interface Improvements for better workflow and data editing
  - Character System Enhancements with standardized roles
  - Gameplay Features including mission tracking and virtual currencies
  - Technical Improvements to resolve dependencies and timing issues

- **UI Improvements**:
  - Streamlined currency display in the interface
  - Improved progress tracking visualization
  - Enhanced story choice presentation
  - Light color theme for Progress UI for better readability

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
