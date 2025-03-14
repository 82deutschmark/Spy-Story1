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
- **Character System**: Unified character management with robust traits and relationships 
- **Gamification System**: Earn experience points, level up, and track relationships with characters
- **Virtual Currency**: Earn and spend various currencies (💎, 💵, 💷, 💶, 💴) on story choices
- **Plot Arcs**: Track active and completed story arcs across multiple sessions
- **Mission System**: Characters assign missions targeting villain characters
- **Dynamic Currency System**: Choice costs scale based on player level and story progression
- **Mission Tracking**: Improved system for tracking missions across story segments
- **Character Evolution**: Enhanced character development through story interactions

## Recent Improvements

- **Streamlined Architecture**: 
  - Removed admin and debug interfaces for production
  - Unified character management system
  - Improved database schema and relationships
  - Enhanced error logging and monitoring

- **Enhanced Story Generation**:
  - Our narrative engine now creates more detailed, lengthy story segments
  - Improved character development and continuity
  - Better plot progression and story coherence

- **Character System Updates**:
  - Consolidated character management into unified Character model
  - Enhanced character trait tracking and evolution
  - Improved relationship system between characters

- **Recent Bug Fixes**:
  - Removed deprecated ImageAnalysis references
  - Updated all character relationships in stories
  - Fixed character display in templates
  - Improved error handling and logging

### Current Status

- **Working Features**:
  - Story generation with character selection
  - Mission tracking system
  - Character evolution and relationship system
  - Currency and experience point system
  - Production-ready core features

- **Pending Issues**:
  - Investigate potential race conditions in dynamic content loading
  - Implement proper error handling for OpenAI API rate limits
  - Add more robust session management

### Lessons Learned from Debugging

- **Appropriate Complexity for the Use Case**:
  - While pagination is important for user-facing features, it adds unnecessary complexity for admin/debug interfaces
  - For debug-only pages, simpler is better—loading all records at once is more reliable than complex pagination

- **API Interface Consistency**:
  - The mismatch between API response structure (`this.debugUI.createPagination`) and client expectations was a key source of errors
  - Standardizing API response formats across all endpoints would prevent similar issues in the future

- **Debug vs. Production Considerations**:
  - Debug interfaces don't need the same optimizations as production-facing pages
  - Performance considerations can be relaxed for admin-only tools, focusing instead on functionality and clarity

- **Refactoring Approach**:
  - When fixing complex UI issues, sometimes removing functionality (pagination) is better than trying to fix it
  - Simplified solutions are easier to maintain and less prone to breaking in the future

### Notes for Future Development

- Consider implementing more robust image caching to prevent repeated image analysis
- Look into optimizing story generation prompts for better mission integration
- Evaluate implementing a more structured state machine for better story flow control
- Investigate improving mobile UI responsiveness, especially in the debug interface
- Consider implementing automated testing for critical user flows

- **Admin Interface Integration**:
  - Implemented Flask-Admin with Bootstrap 4 styling for database management
  - Created model views for all database entities
  - Fixed route conflicts between regular routes and admin routes
  - Added proper navigation between debug and admin interfaces
  - Enhanced admin views with filtering and sorting capabilities

- **Architecture and Code Organization**:
  - Implemented modular game engine architecture with clear separation of concerns
  - Created distinct service layers for game state management and story generation
  - Added middleware for request logging and error handling
  - Integrated app signals for better event management
  - Established a structured API communication layer for future Unity integration
  - Enhanced error handling with standardized utilities

- **Technical Fixes and Optimizations**:
  - Completely removed PayPal integration and related code to simplify codebase
  - Fixed JavaScript loading issues in storyboard and debug templates
  - Resolved modal positioning problems in HTML structure
  - Fixed user progress display in the adventure interface
  - Eliminated JavaScript errors related to duplicate script loading
  - Implemented modular payment system for future payment methods
  - Resolved critical Flask-Admin integration errors 
  - Fixed debugging interface API endpoints for data pagination
  - Added timestamp parameters to prevent image caching issues
  - Corrected `UserProgress` attribute references from `completed_stories` to `completed_plot_arcs`
  - Fixed incorrect references to `choices_made` to use `choice_history` instead
  - Updated utility functions to use correct attribute names for user progress
  - Ensured consistent terminology in templates and server code
  - Fixed attribute references in JavaScript modules to use correct field names
  - Updated API routes to return correct field names in JSON responses
  - Corrected migration scripts to use updated attribute names
  - Fixed debug template to display user progress with correct attribute names

- **User Interface Enhancements**:
  - Implemented improved CSS styling for better visual experience
  - Enhanced story flow with better typography and spacing
  - Added visual indicators for relationships between characters
  - Improved character portrait displays and interactions
  - Added character highlighting in story text with tooltips

- **Character Evolution System**:
  - Implemented robust character evolution tracking with `CharacterEvolution` model
  - Added support for tracking character traits as they evolve through the story
  - Enhanced relationship networks between characters
  - Implemented plot contribution tracking for better story continuity
  - Added character role updates based on story decisions

- **Mission System Improvements**:
  - Enhanced mission generation from story context
  - Improved mission rewards with experience points and currency
  - Added relationship impacts when completing missions
  - Better integration between missions and story progression
  - Enhanced mission UI for showing progress and status

- **User Progress Integration**:
  - Improved coordination between story generation and user progress tracking
  - Better experience point awards for mission completion
  - Enhanced currency transaction handling
  - Smoother level progression with appropriate rewards
  - Improved relationship tracking with mission givers and targets

- **Story Generation Improvements**:
  - Fixed duplicate OpenAI API calls during story generation
  - Enhanced prompt structure for more consistent mission generation
  - Improved character integration in generated stories
  - Better continuity between story segments
  - Enhanced choice generation with appropriate currency costs

- **UI and UX Improvements**:
  - Updated to a cleaner, more modern UI style
  - Enhanced loading indicators and transitions
  - Improved mobile responsiveness
  - Better character information display
  - Enhanced mission and progress tracking displays
  - Fixed text visibility issues in progress modal panels
  - Fully modularized CSS architecture:
    - Implemented component-based CSS structure with dedicated files for each UI component
    - Migrated styles from monolithic custom.css to specific component files
    - Improved maintainability by organizing styles into logical component groups
    - Created centralized theme variables for consistent styling
    - Made all component styles reusable across the application

- **Database Schema Fixes**:
  - Fixed critical database column issues in the image_analysis table
  - Added missing columns: role, potential_plot_lines, backstory, description
  - Created database migration scripts to handle schema updates
  - Implemented data synchronization between duplicate fields
  - Enhanced database column checking and validation

- **Currency System Enhancements**:
  - Implemented dynamic pricing for story choices based on player level
  - Adjusted choice costs to start at $500 with additional costs based on complexity
  - Created a more balanced economy with choice costs capped at player level + $1000
  - Removed restrictions on currency exchanges for better gameplay fluidity
  - Simplified currency display by showing balances only in the Progress UI

- **Technical Debt Reduction**:
  - Modularized JavaScript codebase using ES6 modules
  - Refactored backend routes with blueprint registration
  - Enhanced debug interfaces for better workflow
  - Fixed timing issues between services
  - Improved error handling across the application

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

### Missions

1. Receive missions from character mission-givers in the story
2. Complete missions to earn rewards (currency and XP)
3. Build relationships with characters through mission success/failure
4. Track your mission progress in the mission panel

### Character Relationships

1. Build relationships with characters through story choices
2. Improve relations with mission givers by completing missions
3. View relationship status in the character panel
4. Unlock new storylines based on relationship status


## Project Structure

- `app.py`: Main application file
- `main.py`: Application entry point with configuration
- `admin_config.py`: Flask-Admin configuration and model views
- `routes/`: Modularized route handlers
  - `main_routes.py`: Core application routes
  - `debug_routes.py`: Development and debugging tools
  - `api_routes.py`: API endpoints
- `models/`: Database models (SQLAlchemy)
  - `user.py`: User progress and gamification
  - `character.py`: Character evolution system
  - `missions.py`: Mission tracking system
  - `stories.py`: Story generation and branching narratives
  - `plot.py`: Plot arcs and narrative progression
- `migrations/`: Database migration scripts
- `services/`: 
  - `openai_service.py`: OpenAI API integration
  - `story_maker.py`: Story generation logic
  - `mission_generator.py`: Mission creation and tracking
  - `character_evolution_service.py`: Character development tracking
  - `game_engine.py`: Core game logic and decision handling
  - `state_manager.py`: State machine for game progression
- `api/`: API endpoints for potential Unity integration
  - `game_api.py`: Game state and progression API 
  - `unity_routes.py`: Unity-specific integration endpoints
- `middleware/`: Application middleware
  - `request_logger.py`: HTTP request logging
- `utils/`: Utility functions and helpers
  - `error_handlers.py`: Standardized error handling
  - `app_signals.py`: Application event signaling
  - `context_manager.py`: Context management utilities
- `static/`: CSS and JavaScript files
  - `js/modules/`: Modularized JavaScript components
  - `css/custom.css`: Custom styling for the application
- `templates/`: HTML templates

### AI Prompts Location

The application uses two main AI prompts:

1. **Story Generation Prompt** - Located in `services/story_maker.py` in the `generate_story()` function
2. **Artwork Analysis Prompt** - Located in `services/openai_service.py` in the `analyze_artwork()` function

## Character Universe

The story universe is set in a high-stakes, sexy dramatic international world of espionage. The world is in a state of emergency with charismatic but incompetent protagonists who are more interested in partying and romance than saving the world.

## Future Improvements

- **Admin Authentication**: Add login protection for admin and debug interfaces
- **Alternative Payment Systems**: Consider implementing a simpler currency system without third-party dependencies
- **UI/UX Refinements**: Further improve the user interface for character selection
- **Performance Optimization**: Enhance loading times for story generation
- **Mobile Responsiveness**: Improve the mobile experience
- **Achievement System**: Implement unlockable achievements for players
- **Interactive Map**: Add a visual map showing story locations and mission objectives
- **Character Customization**: Allow users to customize protagonist appearance and traits
- **Social Sharing**: Enable sharing of story moments on social media
- **Audio Elements**: Add background music and sound effects for enhanced immersion
- **Modular JavaScript Architecture**: Continue refining the ES6 module structure to prevent loading conflicts
  - Ensure proper export/import syntax across all modules
  - Add null checks for DOM elements before accessing them
  - Use try/catch blocks when importing modules to handle potential import failures gracefully
- **Unity Integration**: Complete the UI-agnostic game engine to enable smooth porting to Unity
- **API Enhancements**: Expand the game API for better interoperability between platforms
- **State Management**: Refine the state machine for more complex branching narratives
- **Error Recovery**: Improve error handling and recovery mechanisms in the game engine

## Lessons Learned

- **API Response Structure Consistency**: 
  - Always ensure the frontend expectations match the backend API response structure
  - When debugging API interactions, check both the server-side response format and the client-side parsing logic
  - The "reroll character" feature was breaking because the client code expected a nested structure (`data.character`) while the API returned a flat structure with character properties directly in the root object

- **ES6 Module Architecture Best Practices**:
  - **Export Consistency**: Always use consistent export syntax (either default or named exports) in ES6 modules
  - **DOM Element Access**: Add null checks before accessing DOM elements in modules to prevent "Cannot set properties of null" errors
  - **Module Loading**: Implement robust module loading with try/catch blocks to handle import failures gracefully
  - **Module Initialization**: Structure module initialization to accommodate missing DOM elements when a module might be used across different pages
  - **Conditional Module Loading**: Use conditional checks to only initialize modules when needed elements are present in the DOM

## Credits

- OpenAI for GPT-4o
- Bootstrap for UI framework

## License

MIT License

## Database Schema

### 3. Characters
**Purpose**: Stores character data and metadata
**Usage**: Central repository for all character information