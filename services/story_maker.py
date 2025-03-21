"""
story_maker.py - Initial Story Generation Service
=====================================

!!! IMPORTANT - READ BEFORE MODIFYING !!!
This module is the core story generation engine that creates the initial story.

Key Features:
------------
- Initial story generation using OpenAI
- Choice generation
- Character integration

Dependencies:
-----------
- OpenAI API: For story generation
- Database Models:
  * Character: Character information
  * StoryGeneration: Story storage
  * PlotArc: Story progression
  * Mission: Mission management
- Utility Services:
  * validation_utils: Input validation
  * state_manager: Game state tracking
  * character_evolution_service: Character development
"""

import os
import json
from typing import Dict, List, Tuple, Optional, Any
from openai import OpenAI
from services.state_manager import GameStateManager
from services.character_evolution_service import (
    evolve_character_traits,
    update_character_relationships,
    create_character_evolution
)
from utils.character_utils import (
    extract_character_traits,
    extract_plot_lines,
    extract_character_style,
    extract_character_name,
    extract_character_role,
)
import logging
from datetime import datetime
from database import db
from models import StoryGeneration, Character, PlotArc, Mission
from utils.validation_utils import validate_story_parameters
from utils.context_manager import OpenAIContextManager
from utils.constants import DEFAULT_TEMPERATURE

# Configure logging
logger = logging.getLogger(__name__)

def get_openai_client():
    """Get an OpenAI client with the current API key."""
    try:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            logger.error("OpenAI API key is missing")
            raise ValueError("OpenAI API key is required for story generation")
        
        client = OpenAI(api_key=api_key)
        if client is None:
            logger.error("Failed to create OpenAI client")
            raise ValueError("Failed to create OpenAI client")
            
        return client
    except Exception as e:
        logger.error(f"Error initializing OpenAI client: {str(e)}")
        raise

# Initialize state manager
state_manager = GameStateManager()

# Initial Story generation options
STORY_OPTIONS = {
    "conflicts": [
        ("🤵", "Double agent exposed"),
        ("💼", "Corporate espionage"),
        ("🧪", "Bioweapon heist"),
        ("💰", "Trillion-dollar ransom"),
        ("🔍", "Hidden conspiracy"),
        ("🕵️", "Government overthrow"),
        ("🌌", "Space station takeover"),
        ("🧠", "Mind control experiment"),
    ],
    "settings": [
        ("🗼", "Europe"),
        ("🏝️", "Private Island"),
        ("🏙️", "Dubai"),
        ("🚢", "Luxury Cruise Liner"),
        ("❄️", "Arctic Research Base"),
        ("🏰", "Moscow"),
        ("🏜️", "New York City"),
        ("🌋", "Volcanic Lair"),
    ],
    "narrative_styles": [
        ("😎", "Masterful spy thriller"),
        ("🔥", "Steamy romance novel"),
        ("🤪", "Absurdist wacky comedy"),
        ("🎭", "Surreal hallucination"),
        ("🎬", "High-budget action movie"),
        ("🤵", "Classic Bond film"),
    ],
    "moods": [
        ("🍸", "Sexy and seductive"),
        ("💥", "Explosive and chaotic"),
        ("😂", "Light and funny with ridiculously over-the-top plot twists"),
        ("😱", "Suspenseful and betrayal-filled"),
        ("🌟", "Oscar worthy performances and over-acting by the cast"),
        ("🥂", "Party-focused hedonism"),
        ("🔫", "Action-packed gunfights"),
        ("🕶️", "Gangsters and cops"),
    ],
}

# Export the functions that should be available to other modules
__all__ = ['generate_story', 'get_story_options']


def get_story_options() -> Dict[str, List[Tuple[str, str]]]:
    """Return available story options for UI display"""
    return STORY_OPTIONS


def _build_system_message(mood: str, narrative_style: str) -> Dict[str, str]:
    """Build the system message for story generation."""
    return {
        "role": "system",
        "content": f"""You are a master narrative generator for our adventure game. 
Create highly detailed, layered narratives in a {mood} tone with a {narrative_style} storytelling style.

This game is set in the high-stakes world of international espionage, luxury, and intrigue. 
Players take on missions, develop relationships with various characters, and navigate complex scenarios 
where betrayal, romance, and action are common themes. The game engine tracks character relationships, 
story progress, and mission progress.

CRITICAL CHARACTER ROLE REQUIREMENTS:
1. You MUST ONLY use characters that are explicitly provided to you in the character prompts
2. NEVER invent or create new characters that are not in the database
3. If a character is not provided in the prompts, they cannot appear in the story
4. Each character has a specific role that MUST be respected:
   - Mission-giver: MUST be the one giving the mission to the player
   - Villain: MUST be the primary antagonist
   - Neutral: Can be used in supporting roles
   - Undetermined: Role is flexible but must align with traits
5. The mission-giver must remain the mission-giver
6. The villain must remain the primary antagonist

NARRATIVE STYLE GUIDELINES:
1. Create a LENGTHY, DETAILED story introduction (at least 16000-20000 words) with good story structure
2. ALWAYS tell the story in second person, addressing the player directly and alluding to their name and gender in the introduction
3. Use vivid sensory details, atmospheric descriptions, but do not reference a character's physical features or clothing
4. This segment should set the stage for the story, introduce the characters, and provide a clear objective for the player
5. The story should be a thriller with a lot of action, intrigue, and suspense
6. Incorporate dynamic character interactions with dialogue that reveals personality
7. Balance action, dialogue, intrigue, and character development, ending with a cliffhanger with three choices



CHARACTER INTEGRATION REQUIREMENTS:
1. This NPC MUST be used in the story according to their specified role
2. Make this NPC's traits manifest in their dialogue and actions
3. Show their backstory through their experiences and knowledge
4. Reflect their plot lines in their motivations and actions
5. Ensure their traits influence their decisions and reactions
6. Make their presence meaningful to the plot
7. Show how their traits affect their relationship with the player character
8. Use their traits to create interesting conflicts or opportunities
9. Do not modify or change this NPC's role or personality
10. This NPC must remain consistent with their provided traits and backstory
11. This NPC's role must be clearly evident in their actions and dialogue
12. This NPC must maintain their assigned role throughout the story
13. This NPC's interactions must align with their role requirements
14. This NPC cannot be replaced or substituted with other characters

CHARACTER DIALOGUE GUIDELINES:
1. Make their speech patterns reflect their traits
2. Show their backstory through their expertise in conversations
3. Reveal their plot lines through their motivations and goals
4. Let their backstory influence their perspective and opinions
5. Make their dialogue choices reflect their values
6. Show their emotional intelligence through social interactions
7. Reveal their motivations through their words and actions
8. Make their dialogue choices impact the story's direction
9. Ensure their dialogue reflects their assigned role
10. Make their speech patterns match their role requirements"""
    }


def _build_character_prompt(character_info: Optional[Dict[str, Any]] = None) -> str:
    """Build the character prompt for story generation."""
    if not character_info:
        return ""

    # Get the exact fields from the database
    character_traits = character_info.get("character_traits", {})
    backstory = character_info.get("backstory", "")
    plot_lines = character_info.get("plot_lines", [])
    role = character_info.get("role", "Unknown")
    role_requirements = character_info.get("role_requirements", "")

    # Build trait descriptions
    trait_descriptions = []
    if isinstance(character_traits, dict):
        for trait, value in character_traits.items():
            if value > 0:
                trait_descriptions.append(f"{trait} (strength: {value})")
    elif isinstance(character_traits, (list, str)):
        traits_list = [character_traits] if isinstance(character_traits, str) else character_traits
        for trait in traits_list:
            trait_descriptions.append(str(trait))

    character_prompt = f"""FEATURED NPC CHARACTER:
Name: {character_info.get('name', 'Unknown')}
Role: {role}
Role Requirements: {role_requirements}

CHARACTER DETAILS:
Traits: {', '.join(trait_descriptions) if trait_descriptions else 'Not specified'}
Backstory: {backstory if backstory else 'Not specified'}
Plot Lines: {', '.join(plot_lines) if plot_lines else 'Not specified'}

CHARACTER INTEGRATION REQUIREMENTS:
1. This NPC MUST be used in the story according to their specified role
2. Make this NPC's traits manifest in their dialogue and actions
3. Show their backstory through their experiences and knowledge
4. Reflect their plot lines in their motivations and actions
5. Ensure their traits influence their decisions and reactions
6. Make their presence meaningful to the plot
7. Show how their traits affect their relationship with the player character
8. Use their traits to create interesting conflicts or opportunities
9. Do not modify or change this NPC's role or personality
10. This NPC must remain consistent with their provided traits and backstory
11. This NPC's role must be clearly evident in their actions and dialogue
12. This NPC must maintain their assigned role throughout the story
13. This NPC's interactions must align with their role requirements
14. This NPC cannot be replaced or substituted with other characters

CHARACTER DIALOGUE GUIDELINES:
1. Make their speech patterns reflect their traits
2. Show their backstory through their expertise in conversations
3. Reveal their plot lines through their motivations and goals
4. Let their backstory influence their perspective and opinions
5. Make their dialogue choices reflect their values
6. Show their emotional intelligence through social interactions
7. Reveal their motivations through their words and actions
8. Make their dialogue choices impact the story's direction
9. Ensure their dialogue reflects their assigned role
10. Make their speech patterns match their role requirements"""

    return character_prompt


def _build_additional_characters_prompt(
    additional_characters: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Build the prompt section for additional characters."""
    if not additional_characters:
        return ""

    prompt = "\nSECONDARY NPC CHARACTERS - INCORPORATE AT LEAST ONE INTO THE NARRATIVE:\n"
    for char in additional_characters:
        char_traits = extract_character_traits(char)
        if isinstance(char_traits, str):
            char_traits = [char_traits]

        char_name = extract_character_name(char)
        char_role = extract_character_role(char)
        role_requirements = char.get("role_requirements", "")
        traits_str = ", ".join(char_traits) if char_traits else "No specified traits"

        prompt += (
            f"- Name: {char_name}\n"
            f"  Role: {char_role}\n"
            f"  Role Requirements: {role_requirements}\n"
            f"  Traits: {traits_str}\n"
            f"  Suggested Usage: Include in a meaningful choice for the player character\n"
            f"  Important: This character should introduce one of thier plot_lines into the story\n"
        )

    return prompt


def generate_story(
    conflict: str,
    setting: str,
    narrative_style: str,
    mood: str,
    character_info: Optional[Dict[str, Any]] = None,
    additional_characters: Optional[List[Dict[str, Any]]] = None,
    user_id: Optional[str] = None,
    custom_conflict: Optional[str] = None,
    custom_setting: Optional[str] = None,
    custom_narrative: Optional[str] = None,
    custom_mood: Optional[str] = None,
    protagonist_name: Optional[str] = None,
    protagonist_gender: Optional[str] = None,
    protagonist_level: Optional[int] = 1,
    story_context: Optional[str] = None,
    client = None
) -> Dict[str, Any]:
    """Generate a new story with the given parameters."""
    context_manager = OpenAIContextManager()
    
    # Get final values, using custom if provided
    final_conflict = custom_conflict or conflict
    final_setting = custom_setting or setting
    final_narrative = custom_narrative or narrative_style
    final_mood = custom_mood or mood
    
    # Build character prompts
    character_prompt = _build_character_prompt(character_info)
    additional_chars_prompt = _build_additional_characters_prompt(additional_characters)
    
    # Build protagonist info
    protagonist_info = ""
    if protagonist_name and protagonist_gender:
        protagonist_info = f"""PROTAGONIST DETAILS:
Name: {protagonist_name}
Gender: {protagonist_gender}
Experience Level: {protagonist_level}"""
    
    # Log the prompts being sent
    logger.info("Story Generation Parameters:")
    logger.info(f"Conflict: {final_conflict}")
    logger.info(f"Setting: {final_setting}")
    logger.info(f"Narrative Style: {final_narrative}")
    logger.info(f"Mood: {final_mood}")
    logger.info(f"Character Info: {json.dumps(character_info, indent=2)}")
    logger.info(f"Additional Characters: {json.dumps(additional_characters, indent=2)}")
    logger.info(f"Protagonist Info: {protagonist_info}")
    
    # Get OpenAI client if not provided
    if client is None:
        client = get_openai_client()
        if client is None:
            raise ValueError("Failed to initialize OpenAI client")
    
    # Build the user message that will generate the story
    user_message = f"""Generate the first segment of the thriller story with the following parameters:

CONFLICT: {final_conflict}
SETTING: {final_setting}
NARRATIVE STYLE: {final_narrative}
MOOD: {final_mood}

{protagonist_info}

CHARACTERS THAT MUST BE USED IN THE STORY:
{character_prompt}

{additional_chars_prompt}

STORY CONTEXT:
{story_context if story_context else "This is the first segment of the story, the protagonist is just starting out, introduce characters slowly and use 12000-14000 words."}

IMPORTANT CHARACTER USAGE RULES:
1. You MUST use the mission-giver character to give the initial mission, which targets one of the villain characters.
2. The mission should have a clear objective like to steal something, kill someone, or obtain info or all three.
3. The mission should have a deadline and a consequence for failure.
4. The villain should not appear directly in the story until later in the game, introduce them first via other character dialogue
5. You MUST NOT invent or create any important new characters, select from the characters provided in the character prompts
6. The protagonist should encounter the other characters by seeking them out or they will seek the protagonist out
7. The other characters should have a reason to be hostile or helpful to the protagonist, and use their traits and backstory to enrich the story
6. The mission-giver reluctantly agrees to give the player the mission and reminds them not to screw it up again, alluding to a previous fiasco.
7. The villain must be well-protected and pose a significant challenge, but also be pathetic and incompetent and the object of disgust not fear. 
8. The villain is hated by the mission-giver for reasons that are business or political or ideological or personal or any combination.
9. The villain should have a weakness that the player can exploit
10. The villain should have a backstory that explains their motivation, but generally they are a super rich scumbag who will stop at nothing to get what they want.
11. Do not describe the villain's physical appearance, only their role and motivation. 
12. The mission-giver is a rich person, or a high-level spy or a government agent with a lot of resources and a lot of power. They need the protagonist for a discreet job
13. The mission-giver should already have a strained relationship with the player character, who they view as a reckless and impulsive amateur.
14. The mission-giver is always talking about geopolitical tensions and macroeconomic trends and esoteric financial strategies in niche industries, frequently in one or two complex and convoluted sentences.
Please generate a story that follows these requirements exactly."""

    # Generate the story
    story_data = context_manager.generate_initial_story(
        conflict=final_conflict,
        setting=final_setting,
        narrative_style=final_narrative,
        mood=final_mood,
        character_info=character_info,
        client=client,
        user_message=user_message  # Pass the constructed user message
    )
    
    # Add unique IDs to choices if they don't have them
    if "choices" in story_data:
        for i, choice in enumerate(story_data["choices"]):
            if "id" not in choice and "choice_id" not in choice:
                choice["choice_id"] = f"choice_{i}_{datetime.utcnow().timestamp()}"
    
    # Log the response
    logger.info("Generated Story Data:")
    logger.info(json.dumps(story_data, indent=2))
    
    # Create a new dictionary with the original story data under "stories"
    # and add our additional metadata at the root level
    final_story_data = {
        "conflict": final_conflict,
        "setting": final_setting,
        "narrative_style": final_narrative,
        "mood": final_mood,
        "stories": story_data,  # Preserve the original OpenAI response structure
        "choices": story_data.get("choices", [])  # Also expose choices at root level for easier access
    }
    
    return final_story_data
