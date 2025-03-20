"""
story_maker.py - Story Generation Service
=====================================

!!! IMPORTANT - READ BEFORE MODIFYING !!!
This module is the core story generation engine that creates and manages
interactive narratives using AI. Changes here affect the entire story experience.

!!! MODEL CONFIGURATION WARNING !!!
DO NOT MODIFY THE MODEL CONFIGURATION (model name, tokens, temperature)
UNLESS EXPLICITLY DIRECTED TO DO SO. The current settings are:
- model: "gpt-4o-mini"
- max_tokens: 14000
- temperature: 0.7
These settings are carefully tuned for the application's needs.

Key Features:
------------
- Story generation using OpenAI
- Choice generation and validation
- Character integration
- Mission creation
- Plot arc management

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

Story Structure:
-------------
{
    'title': str,
    'story': str,
    'choices': List[{
        'text': str,
        'consequence': str,
        'currency_requirements': Dict[str, int],  # Required currency for each choice
        'type': str
    }],
    'mission': {
        'title': str,
        'description': str,
        'objective': str,
        'reward': Dict[str, int],
        'deadline': str
    },
    'characters': List[str]
}
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

# Configure logging
logger = logging.getLogger(__name__)

def get_openai_client():
    """Get an OpenAI client with the current API key."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("OpenAI API key is missing")
        raise ValueError("OpenAI API key is required for story generation")
    return OpenAI(api_key=api_key)

# Initialize state manager
state_manager = GameStateManager()

# Story generation options
STORY_OPTIONS = {
    "conflicts": [
        ("🤵", "Double agent exposed"),
        ("💼", "Corporate espionage"),
        ("🧪", "Bioweapon heist"),
        ("💰", "Trillion-dollar ransom"),
        ("🔍", "Assassination conspiracy"),
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
where betrayal, romance, and action are common themes. The game tracks character relationships, 
currency balances, and mission progress.

CRITICAL CHARACTER ROLE REQUIREMENTS:
1. You MUST ONLY use characters that are explicitly provided to you in the character prompts
2. NEVER invent or create new characters that aren't in the database
3. If a character isn't provided in the prompts, they cannot appear in the story
4. Each character has a specific role that MUST be respected:
   - Mission-giver: MUST be the one giving the mission to the player
   - Villain: MUST be the primary antagonist
   - Neutral: Can be used in supporting roles
   - Undetermined: Role is flexible but must align with traits
5. Character roles cannot be changed or swapped
6. No new characters can be introduced
7. Each character's role must be maintained throughout the story
8. Character interactions must reflect their assigned roles
9. The mission-giver must remain the mission-giver
10. The villain must remain the primary antagonist

NARRATIVE STYLE GUIDELINES:
1. Create a LENGTHY, DETAILED story introduction (at least 16000-20000 words) with rich descriptions
2. ALWAYS tell the story in second person, addressing the player directly and alluding to their name and gender in the introduction
3. Use vivid sensory details, atmospheric descriptions, but do not reference a character's physical features or clothing
4. Each segment should advance the plot significantly with unexpected twists or revelations
5. Include multiple scenes within each story segment when appropriate
6. Incorporate dynamic character interactions with dialogue that reveals personality
7. Balance action, dialogue, intrigue, and character development
8. Never repeat the same scenarios, settings, or dialogue patterns
9. Create a sense of escalating stakes and tension throughout the narrative

CHARACTER INTEGRATION GUIDELINES:
1. Make character traits manifest in their dialogue, actions, and decisions
2. Show how character traits influence their relationships and interactions
3. Ensure each character's unique traits affect their role in the story
4. Make character traits visible through specific behaviors and choices
5. Use character traits to drive plot developments and conflicts
6. Make character relationships reflect their individual traits
7. When introducing characters, ONLY use those provided in the character prompts
8. Each character's role must be clearly evident in their actions and dialogue
9. Character interactions must align with their assigned roles
10. The mission-giver must be authoritative and knowledgeable
11. The villain must be threatening and pose a significant challenge

IMPORTANT FORMATTING INSTRUCTIONS:
1. Your response MUST be valid JSON, following exactly the structure provided.
2. Do not include any explanation, markdown formatting, code blocks, or additional text before or after the JSON.
3. Make sure all keys and values in the JSON are properly quoted with double quotes.
4. Ensure all arrays and objects are correctly closed.
5. Avoid using unescaped special characters (like " or \\) within JSON strings.""",
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
            f"  Suggested Usage: Include in a meaningful scene that showcases their personality and their interaction with the player character\n"
            f"  Important: This character must maintain their assigned role and cannot be replaced or substituted\n"
        )

    return prompt


def generate_story(
    conflict: str,
    setting: str,
    narrative_style: str,
    mood: str,
    user_id: Optional[str] = None,
    character_info: Optional[Dict[str, Any]] = None,
    custom_conflict: Optional[str] = None,
    custom_setting: Optional[str] = None,
    custom_narrative: Optional[str] = None,
    custom_mood: Optional[str] = None,
    additional_characters: Optional[List[Dict[str, Any]]] = None,
    protagonist_name: Optional[str] = None,
    protagonist_gender: Optional[str] = None,
    protagonist_level: Optional[int] = 1,
    story_context: Optional[str] = None,
    previous_choice: Optional[str] = "INITIAL_STORY: Craft an opening to a grand adventure story that sets the stage for an epic narrative. Focus on establishing the world, introducing key characters, and creating a compelling hook that draws the reader into the story. The opening should be rich in detail and atmosphere, setting the tone for the adventure to come."
) -> Dict[str, Any]:
    """Generate a story based on selected or custom parameters and character info.
    
    Args:
        conflict (str): Main story conflict
        setting (str): Story setting/environment
        narrative_style (str): Style of storytelling
        mood (str): Story mood/tone
        user_id (Optional[str]): User's ID for state tracking
        character_info (Optional[Dict]): Featured character details
        custom_conflict (Optional[str]): Custom conflict override
        custom_setting (Optional[str]): Custom setting override
        custom_narrative (Optional[str]): Custom narrative style
        custom_mood (Optional[str]): Custom mood override
        additional_characters (Optional[List]): Additional characters to include
        protagonist_name (Optional[str]): Name of the protagonist
        protagonist_gender (Optional[str]): Gender of the protagonist
        protagonist_level (Optional[int]): Protagonist's current level
        story_context (Optional[str]): Additional context for the story
        previous_choice (Optional[str]): The previous choice made, or special value for initial story
        
    Returns:
        Dict[str, Any]: Generated story data including:
            - stories: Parsed story object for story panel
            - story: Raw JSON string for choice buttons
            - conflict: Final conflict used
            - setting: Final setting used
            - narrative_style: Final narrative style used
            - mood: Final mood used
    """
    try:
        # Get final values, using custom if provided
        final_conflict = custom_conflict or conflict
        final_setting = custom_setting or setting
        final_narrative = custom_narrative or narrative_style
        final_mood = custom_mood or mood

        # Build system message
        system_message = _build_system_message(final_mood, final_narrative)

        # Build character prompts
        character_prompt = _build_character_prompt(character_info)
        additional_chars_prompt = _build_additional_characters_prompt(additional_characters)

        # Build protagonist info with enhanced personalization
        protagonist_info = ""
        if protagonist_name and protagonist_gender:
            protagonist_info = f"""PROTAGONIST DETAILS:
Name: {protagonist_name}
Gender: {protagonist_gender}
Experience Level: {protagonist_level}

PROTAGONIST INTEGRATION REQUIREMENTS:
1. Address the protagonist directly as "you" throughout the narrative
2. 
5. Make the protagonist's gender influence their interactions and experiences
6. Ensure the protagonist's name is used naturally in dialogue and descriptions
7. Create personal stakes that resonate with the protagonist's identity
8. Make the protagonist's choices feel meaningful and impactful

PROTAGONIST PERSPECTIVE GUIDELINES:
1. The protagonist is a user of the game, and the story is about their adventures.
2. Create situations that challenge the protagonist's beliefs and values"""

        # Build main content prompt
        content_prompt = f"""Create a DETAILED, EXTENSIVE story segment with:
CONFLICT: {final_conflict}
SETTING: {final_setting}
NARRATIVE STYLE: {final_narrative}
MOOD: {final_mood}

{protagonist_info}

{f'STORY CONTEXT:\n{story_context}\n' if story_context else ''}

WORLD BACKGROUND:
This is set in the high-stakes world of international espionage, luxury, and intrigue.
The world features advanced technology like neural implants, satellite networks, and experimental weapons.
Many villains control vast global empires with private armies and cutting-edge technology.
The world faces multiple crises - climate disasters, economic collapse, political instability, and shadow wars.

STORY REQUIREMENTS:
1. Create in 9500-15000 words a compelling opening that establishes the tone and setting
2. Introduce the main conflict naturally through action or dialogue
3. Include at least 1-3 distinct scenes 
4. Feature dynamic character interactions and relationships
5. Incorporate elements of espionage, luxury, and intrigue
6. Balance action, dialogue, and atmospheric description, do not suddenly introduce a villain in this initial story
7. End with three distinct choices that significantly impact the story:
   - One choice should involve gunplay or action
   - One choice should involve meeting/interacting with a specific character from the provided character list
   - One choice should seem safe but still advance the plot
8. Remember that this is just the introduction to a larger story with many segments and plot arcs
9. IMPORTANT: Only use characters that are explicitly provided in the character prompts. Do not invent new characters.

CHARACTER USAGE RULES:
1. The mission-giver must be one of the characters provided in the character prompts
2. Any villains or antagonists must be from the provided character list
3. All supporting characters must be from the provided character list
4. Do not create or invent any new characters
5. If a character isn't in the provided list, they cannot appear in the story

{character_prompt}
{additional_chars_prompt}

Your response MUST be valid JSON with this structure:
{{
    "title": "Story title",
    "story": "Main narrative text",
    "choices": [
        {{
            "text": "Choice description",
            "consequence": "Brief outcome preview",
            "currency_requirements": {{"💎": 10}},
            "type": "direct/risky/social"
        }}
    ],
    "mission": {{
        "title": "Mission name",
        "description": "Mission details",
        "objective": "Clear goal",
        "reward": {{"currency_type": "amount"}},
        "deadline": "Time limit"
    }},
    "characters": ["List of character names featured"]
}}"""

        # Set up messages
        messages = [
            system_message,
            {"role": "user", "content": content_prompt}
        ]

        # Get a fresh OpenAI client
        client = get_openai_client()

        # Make the OpenAI API call
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=14000,
            response_format={"type": "json_object"}
        )

        # Parse the response
        content = response.choices[0].message.content.strip()
        story_data = json.loads(content)

        # Validate story data structure
        required_fields = ['title', 'story', 'choices', 'mission', 'characters']
        if not all(field in story_data for field in required_fields):
            raise ValueError("Missing required fields in story data")

        # Validate each choice has required fields
        for choice in story_data.get('choices', []):
            if not all(field in choice for field in ['text', 'consequence', 'currency_requirements', 'type']):
                raise ValueError("Each choice must have text, consequence, currency_requirements, and type fields")
            
            # Add fixed currency requirement of 10 diamonds to each choice
            choice['currency_requirements'] = {"💎": 10}

        # Update character evolution if character info is provided
        if character_info and user_id:
            character_id = character_info.get("id")
            if character_id:
                # Evolve character traits based on story
                evolve_character_traits(character_id, story_data.get("story", ""))

                # Track relationships between this character and the protagonist
                relationship_changes = {
                    str(character_id): {
                        "type": "story_interaction",
                        "strength": 1
                    }
                }

                # Update relationships
                update_character_relationships(user_id, relationship_changes)

        # Update game state if user_id provided
        if user_id:
            game_state = {
                "current_story": story_data,
                "character_info": character_info,
            }
            state_manager.update_state(game_state)

        # Return formatted result
        return {
            "stories": story_data,
            "story": content,
            "conflict": final_conflict,
            "setting": final_setting,
            "narrative_style": final_narrative,
            "mood": final_mood
        }

    except json.JSONDecodeError:
        raise RuntimeError("Failed to generate valid story - invalid JSON response")
    except Exception as e:
        raise RuntimeError(f"Story generation failed: {str(e)}")
