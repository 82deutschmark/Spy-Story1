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

# Initialize OpenAI client and logger
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
logger = logging.getLogger(__name__)

# Model configuration
MODEL_CONFIG = {
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 14000
}

def validate_mission_info(mission_info: Dict[str, Any]) -> bool:
    """Validate the mission info structure."""
    required_fields = ['title', 'objective', 'status']
    return all(field in mission_info for field in required_fields)

def _build_system_message(mood: str = None, narrative_style: str = None, protagonist_name: Optional[str] = None, protagonist_gender: Optional[str] = None) -> str:
    """Build the system message for story continuation."""
    
    # Build protagonist info
    protagonist_info = ""
    if protagonist_name or protagonist_gender:
        protagonist_info = "\nPROTAGONIST INFO:"
        if protagonist_name:
            protagonist_info += f"\n- Name: {protagonist_name}"
        if protagonist_gender:
            protagonist_info += f"\n- Gender: {protagonist_gender}"
        protagonist_info += "\nAlways refer to the protagonist by their name or appropriate pronouns."
    
    # Build style info
    style_info = ""
    if mood or narrative_style:
        style_info = "\nSTYLE INFO:"
        if mood:
            style_info += f"\n- Mood: {mood}"
        if narrative_style:
            style_info += f"\n- Narrative Style: {narrative_style}"
    
    return f"""You are a master narrative generator for our choose your own adventure game.
You excel at continuing stories based on player choices, maintaining narrative
consistency while introducing fresh developments and unexpected twists.{protagonist_info}{style_info}

NARRATIVE STYLE GUIDELINES:
1. Create LENGTHY, DETAILED story segments (at least 1400-2000 words) with rich descriptions
2. Use vivid sensory details, atmospheric descriptions, and character development
3. Each segment should advance the plot significantly with unexpected twists or revelations
4. Include multiple scenes within each story segment when appropriate
5. Incorporate dynamic character interactions with dialogue that reveals personality
6. Balance action, dialogue, intrigue, and character development
7. Never repeat the same scenarios, settings, or dialogue patterns
8. Create a sense of escalating stakes and tension throughout the narrative
9. Show character development through actions and dialogue
10. Maintain consistent tone and style with the previous segments

Your response MUST be valid JSON with this structure:
r'''{{
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
}}'''"""

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
   - One that takes a risky approach
   - One that involves introducing a new character from the database
6. Maintain narrative consistency with previous events
7. Include rich descriptions and atmospheric details
8. Show character development through actions and dialogue
9. Create unexpected twists or revelations
10. Balance action, dialogue, and intrigue
11. Never repeat previous scenarios or story beats
12. Create escalating stakes and tension"""
        
        # Add the continuation prompt
        context_manager.add_user_message(content_prompt)
        
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