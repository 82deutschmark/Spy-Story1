"""
segment_maker.py - Story Continuation Service
========================================

This module handles story continuation after the initial story is created.
It uses the OpenAIContextManager to maintain conversation context and generate
coherent story continuations based on player choices.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from openai import OpenAI
from utils.context_manager import OpenAIContextManager

# Initialize logger
logger = logging.getLogger(__name__)

# Model configuration
MODEL_CONFIG = {
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 14000
}

def get_openai_client():
    """Get an OpenAI client with the current API key."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("OpenAI API key is missing")
        raise ValueError("OpenAI API key is required for story generation")
    return OpenAI(api_key=api_key)

def validate_mission_info(mission_info: Dict[str, Any]) -> bool:
    """Validate the mission info structure."""
    required_fields = ['title', 'objective', 'status']
    return all(field in mission_info for field in required_fields)

def _build_system_message(mood: str = None, narrative_style: str = None, protagonist_name: Optional[str] = None, protagonist_gender: Optional[str] = None) -> str:
    """Build the system message for story continuation."""
    
    # Build protagonist info
    protagonist_info = ""
    if protagonist_name or protagonist_gender:
        protagonist_info = f"""PROTAGONIST DETAILS:
Name: {protagonist_name}
Gender: {protagonist_gender}

PROTAGONIST INTEGRATION REQUIREMENTS:
1. Address the protagonist directly as "you" throughout the narrative
2. Make the protagonist's gender influence their interactions and experiences
3. Ensure the protagonist's name is used naturally in dialogue and descriptions
4. Mission information is provided to you, and you must use it to create a story that is consistent with the mission.
5. Make the protagonist's choices feel meaningful and impactful

PROTAGONIST PERSPECTIVE GUIDELINES:
1. Write in second person, addressing the player directly as "you"
2. The protagonist is a user of the game, and the story is about their adventures.
8. Create situations that challenge the protagonist's beliefs and values"""
    
    # Build style info
    style_info = ""
    if mood or narrative_style:
        style_info = f"""STYLE GUIDELINES:
Mood: {mood}
Narrative Style: {narrative_style}

NARRATIVE STYLE GUIDELINES: You are a master narrative generator for our choose your own adventure game.
1. Create LENGTHY, DETAILED story segments (at least 30000-35000 words) with rich descriptions
2. Use vivid sensory details, atmospheric descriptions, and character development
3. Each segment should advance the plot significantly with unexpected twists or revelations
4. Include multiple scenes within each story segment when appropriate
5. Incorporate dynamic character interactions with dialogue that reveals personality
6. Balance action, dialogue, intrigue, and character development
7. Never repeat the same scenarios, settings, or dialogue patterns
8. Create a sense of escalating stakes and tension throughout the narrative
9. Show character development through actions and dialogue
10. Maintain consistent tone and style with the previous segments

CHARACTER INTEGRATION GUIDELINES:
1. Make character traits manifest in their dialogue, actions, and decisions
2. Show how character traits influence their relationships and interactions
3. Ensure each character's unique traits affect their role in the story
4. Make character traits visible through specific behaviors and choices
5. Use character traits to drive plot developments and conflicts
6. Show how character traits evolve through story events
7. Make character relationships reflect their individual traits

CHARACTER DIALOGUE GUIDELINES:
1. Make speech patterns reflect personality traits
2. Show skills through expertise in conversations
3. Reveal relationships through how characters talk about others
4. Let background influence perspective and opinions
5. Make dialogue choices reflect personality values
6. Show emotional intelligence through social interactions
7. Reveal motivations through words and actions
8. Make dialogue choices impact the story's direction"""

    return f"""You are a master narrative generator for our choose your own adventure game.
You excel at continuing stories based on player choices, maintaining narrative
consistency while introducing fresh developments and unexpected twists.

{protagonist_info}

{style_info}

Your response MUST be valid JSON with this structure:
{{
    "story": "Continuation narrative text",
    "choices": [
        {{
            "text": "Choice description",
            "consequence": "Brief outcome description",
            "type": "direct/risky/social"
        }}
    ],
    "mission_update": {{
        "status": "unchanged/progressed/completed/failed",
        "progress_details": "How the mission has advanced"
    }}
}}"""

def generate_continuation(
    previous_story: str,
    chosen_choice: str,
    mission_info: Dict[str, Any],
    context_manager: Optional[OpenAIContextManager] = None,
    mood: Optional[str] = None,
    narrative_style: Optional[str] = None,
    protagonist_name: Optional[str] = None,
    protagonist_gender: Optional[str] = None
) -> Dict[str, Any]:
    """Generate a story continuation based on the player's choice.
    
    Args:
        previous_story: The previous story segment's text
        chosen_choice: The choice text that the player selected
        mission_info: Current mission details
        context_manager: Optional existing context manager for conversation history
        mood: Optional mood to maintain consistent tone
        narrative_style: Optional narrative style to maintain consistent voice
        protagonist_name: Optional name of the protagonist for consistent reference
        protagonist_gender: Optional gender of the protagonist for proper pronouns
        
    Returns:
        Dict containing the continuation story data:
        - story: Main narrative text
        - choices: List of next choices
        - mission_update: Mission progression details
        
    Raises:
        ValueError: If mission_info is invalid
        RuntimeError: If story generation fails
    """
    # Validate mission info
    if not validate_mission_info(mission_info):
        raise ValueError("Invalid mission info structure")

    try:
        # Create or use existing context manager
        if not context_manager:
            context_manager = OpenAIContextManager()
            context_manager.add_system_message(_build_system_message(
                mood=mood,
                narrative_style=narrative_style,
                protagonist_name=protagonist_name,
                protagonist_gender=protagonist_gender
            ))
        
        # Build the continuation prompt
        content_prompt = f"""Continue the story based on:

PREVIOUS EVENTS:
{previous_story[:500]}...

PLAYER'S CHOICE:
{chosen_choice}

CURRENT MISSION:
Title: {mission_info.get('title', 'Unknown')}
Objective: {mission_info.get('objective', 'Unknown')}
Current Status: {mission_info.get('status', 'In Progress')}

STORY REQUIREMENTS:
1. Create a compelling continuation that builds upon the player's choice
2. Show immediate consequences of their decision
3. Advance the mission in some way (progress, setback, or complication)
4. Introduce at least one new story element (character, setting, or plot thread)
5. Create three distinct choices for how to proceed:
   - One that advances the mission directly
   - One that takes a risky approach, involving gunplay or car chases
   - One that involves introducing a new character from the database
6. Maintain narrative consistency with previous events
7. Include rich descriptions of guns and cars and atmospheric details, but not of characters or their look or clothing
8. Show character development through actions and dialogue
9. Create unexpected twists or revelations
10. Balance action, dialogue, and intrigue
11. Avoid repeating previous scenarios or story beats
12. Create escalating stakes and tension
13. Ensure all character interactions reflect their traits and relationships
14. Make dialogue choices impact the story's direction
15. Show how the protagonist's choices affect other characters"""
        
        # Add the continuation prompt
        context_manager.add_user_message(content_prompt)
        
        # Get a fresh OpenAI client
        client = get_openai_client()
        
        # Get the response using model config
        response = context_manager.process_function_calling(
            client=client,
            model=MODEL_CONFIG["model"],
            temperature=MODEL_CONFIG["temperature"],
            max_tokens=MODEL_CONFIG["max_tokens"]
        )
        
        # Parse and validate the response
        try:
            story_data = json.loads(response.choices[0].message.content)
            
            # Validate required fields
            required_fields = ['story', 'choices', 'mission_update']
            if not all(field in story_data for field in required_fields):
                raise ValueError("Missing required fields in story data")
                
            # Validate choices structure
            if not isinstance(story_data['choices'], list) or not story_data['choices']:
                raise ValueError("Invalid or empty choices in story data")
                
            # Validate mission update
            if not isinstance(story_data['mission_update'], dict) or \
               'status' not in story_data['mission_update'] or \
               'progress_details' not in story_data['mission_update']:
                raise ValueError("Invalid mission update structure")
            
            return story_data
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse story response: {e}")
            raise RuntimeError("Failed to generate valid story continuation")
            
    except Exception as e:
        logger.error(f"Story continuation generation failed: {e}")
        raise RuntimeError(f"Story continuation failed: {str(e)}") 