# Spy Story Game

Spy Story is an interactive, narrative-driven game that uses OpenAI's API to generate and continue an espionage-themed story. The project is designed with modularity and maintainability in mind.

## Latest Critical Fixes
- **Story Parameter Persistence:**
  The system now properly maintains story parameters (conflict, setting, mood, narrative style) throughout the entire story lifecycle:
  1. Parameters are stored in OpenAIContextManager during initial story generation
  2. These parameters are merged into each API response during story continuation
  3. This ensures consistent story atmosphere and setting across all choices
  4. Fixed previous issue where parameters were lost during story continuation

## Key Updates
- **Payload Consistency:**  
  The game now ensures that user-specified parameters such as conflict, setting, narrative style, and mood are preserved throughout the story lifecycle. Missing values in the initial API response are backfilled from the user input via changes in `services/state_manager.py`, `services/story_maker.py`, and `services/game_engine.py`.

## Overview of Recent Changes
- **Refactoring:** Consolidated duplicated instructions and prompt texts to improve maintainability.
- **Payload Consistency:** Ensured user-provided parameters (conflict, setting, mood, narrative style) are carried through the entire story progression.
- **Enhanced Context Management:** Improved the OpenAIContextManager to handle markdown and function calls reliably.
- **State Synchronization:** Refined state management to merge story progress with user choices and character interactions.

## Getting Started
1. **Environment Setup:**
   - Ensure Python 3.8+ is installed.
   - Set required environment variables (e.g., `OPENAI_API_KEY`, `FLASK_CONFIG`).

2. **Database Migration:**
   - Set up PostgreSQL and run migrations as defined in the models.

3. **Running the Application:**
   - Start the Flask server using: `flask run`
   - Access the web UI via your browser.

4. **Testing:**
   - Use provided API endpoints to test story generation and state transitions.

## Future Work
- Further refine narrative prompts for richer story arcs.
- Improve error handling and logging across services.
- Explore additional character customization and mission branching.

## License
[Include your project's license information here.]