
# Choose Your Own Adventure

An interactive storytelling application that lets users create custom adventures featuring animal characters in Uncle Mark's forest farm.

![Adventure Story App](static/images/app-preview.png)

## Overview

This application allows users to generate interactive stories featuring Pawel and Pawleen (Yorkshire terriers) and other animal characters in a forest farm setting. Users can select characters, customize story parameters, and make choices that affect the story's direction.

## Features

- **Character Selection**: Choose from a library of characters to feature in your story
- **Story Customization**: Set conflict, setting, narrative style, and mood
- **Interactive Choices**: Make decisions that affect the story's outcome
- **Image Analysis**: Upload character/scene images for AI analysis 
- **Debug Tools**: View and manage database records

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

1. Visit the home page and select a character
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
  - `openai_service.py`: OpenAI API integration
  - `story_maker.py`: Story generation logic
- `static/`: CSS and JavaScript files
- `templates/`: HTML templates
- `api/`: API endpoints for potential Unity integration

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

## Credits

- OpenAI for GPT-4o
- Bootstrap for UI framework

## License

MIT License


7pm March 7th Going to commit working version!
Minor cosmetic functions made ahead of deployment.  
