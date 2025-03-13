
import os
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from openai import OpenAI
import random
import re

# Configure logging
logger = logging.getLogger(__name__)

# Get OpenAI API key from environment variables
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    logger.warning("OpenAI API key not found in environment variables")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

# Default story options
STORY_OPTIONS = {
    "conflicts": [
        ("🤵", "Double agent exposed"),
        ("💼", "Corporate espionage"),
        ("🧪", "Bioweapon heist"),
        ("💰", "Trillion-dollar ransom"),
        ("🔍", "Assassination conspiracy"),
        ("🕵️", "Government overthrow"),
        ("🌌", "Space station takeover"),
        ("🧠", "Mind control experiment")
    ],
    "settings": [
        ("🗼", "Paris Office"),
        ("🏝️", "Private Luxury Island"),
        ("🏙️", "Dubai Mega-Skyscraper"),
        ("🚢", "Orbital Cruise Liner"),
        ("❄️", "Arctic Research Base"),
        ("🏰", "Monaco Casino"),
        ("🏜️", "Sahara Desert Compound"),
        ("🌋", "Volcanic Lair")
    ],
    "narrative_styles": [
        ("😎", "Gen Z Teenage Drama"),
        ("🔥", "Steamy romance novel"),
        ("🤪", "Absurdist comedy"),
        ("🎭", "Melodramatic soap opera"),
        ("🎬", "High-budget action movie"),
        ("🤵", "Classic Bond film")
    ],
    "moods": [
        ("🍸", "Sexy and seductive"),
        ("💥", "Explosive and chaotic"),
        ("😂", "Ridiculously over-the-top"),
        ("😱", "Suspenseful and betrayal-filled"),
        ("🌟", "Glamorous and extravagant"),
        ("🥂", "Party-focused hedonism"),
        ("🔫", "Action-packed gunfights"),
        ("🕶️", "Cool and stylish")
    ]
}


# --- Helper functions ---

def get_story_options() -> Dict[str, List[Tuple[str, str]]]:
    """Return available story options for UI display"""
    return STORY_OPTIONS

def extract_field(data: Dict[str, Any], field: str, alt_field: Optional[str] = None, default: Any = None):
    """Extract a field from data with fallback to alternative field name and default value"""
    if not data:
        return default
    return data.get(field) or data.get(alt_field) or default

def extract_character_traits(character_data: Dict[str, Any]) -> List[str]:
    """Extract character traits from different data structures"""
    return extract_field(character_data, 'character_traits', 'traits', [])

def extract_plot_lines(character_data: Dict[str, Any]) -> List[str]:
    """Extract plot lines from different data structures"""
    return extract_field(character_data, 'plot_lines', 'potential_plot_lines', [])

def extract_character_style(character_data: Dict[str, Any]) -> str:
    """Extract character visual style/description from different data structures"""
    return extract_field(character_data, 'style', 'visual_description', '')

def extract_character_name(character_data: Dict[str, Any]) -> str:
    """Extract character name from different data structures"""
    return extract_field(character_data, 'name', 'character_name', 'Unnamed Character')

def extract_character_role(character_data: Dict[str, Any]) -> str:
    """Extract character role from different data structures"""
    return extract_field(character_data, 'role', 'character_role', 'neutral')


# --- Main story generation ---

def generate_story(
    conflict: str,
    setting: str,
    narrative_style: str,
    mood: str,
    character_info: Optional[Dict[str, Any]] = None,
    custom_conflict: Optional[str] = None,
    custom_setting: Optional[str] = None,
    custom_narrative: Optional[str] = None,
    custom_mood: Optional[str] = None,
    previous_choice: Optional[str] = None,
    story_context: Optional[str] = None,
    additional_characters: Optional[List[Dict[str, Any]]] = None,
    protagonist_name: Optional[str] = None,
    protagonist_gender: Optional[str] = None,
    protagonist_level: Optional[int] = 1
) -> Dict[str, Any]:
    """Generate a story based on selected or custom parameters and character info"""
    logger.info("Entering generate_story function with parameters:")
    logger.info(f"Conflict: {conflict}, Setting: {setting}, Character: {character_info.get('name') if character_info else 'None'}")

    if not api_key:
        logger.error("OpenAI API key not found. Please add it to your environment variables.")
        raise ValueError("OpenAI API key not found. Please add it to your environment variables.")

    try:
        # Get final values, using custom if provided
        final_conflict = custom_conflict or conflict
        final_setting = custom_setting or setting
        final_narrative = custom_narrative or narrative_style
        final_mood = custom_mood or mood

        # Build system message - improved approach based on JS version
        system_message = {
            "role": "system",
            "content": f"""You are a creative narrative generator for our spy-themed adventure game. 
You create engaging interactive narratives in a {final_mood} tone with a {final_narrative} storytelling style.

This game is set in the high-stakes world of international espionage, luxury, and intrigue. 
Players take on missions, develop relationships with various characters, and navigate complex scenarios 
where betrayal, romance, and action are common themes. The game tracks character relationships, 
currency balances, and mission progress.

Your narratives should be immersive, exciting, and offer meaningful choices that impact the story 
and the player's status in the game world. Always maintain the selected mood and narrative style throughout.

IMPORTANT FORMATTING INSTRUCTIONS:
1. Your response MUST be valid JSON, following exactly the structure provided.
2. Do not include any explanation, markdown formatting, code blocks, or additional text before or after the JSON.
3. Make sure all keys and values in the JSON are properly quoted with double quotes.
4. Ensure all arrays and objects are correctly closed.
5. Avoid using unescaped special characters (like " or \\) within JSON strings.

For initial story segments:
1. Always introduce a character with the "mission-giver" role who assigns a mission to the player
2. Ensure one of the three choices involves meeting/interacting with a character (to introduce potential future mission-givers)
3. Structure the mission with a clear objective, target, reward, and deadline"""
        }

        # Build main prompt content
        protagonist_info = ""
        if protagonist_name and protagonist_gender:
            protagonist_info = f"You are {protagonist_name}, a {protagonist_gender} agent who is very charismatic, arrogant, and constantly receives romantic advances from practically everybody you meet. "
        else:
            protagonist_info = "You are a charismatic but reckless agent who constantly receives romantic advances from practically everybody you meet. "

        # Construct main content prompt
        content_prompt = f"""Create a story with:
Conflict: {final_conflict}
Setting: {final_setting}
Narrative Style: {final_narrative}
Mood: {final_mood}
{f"Protagonist: {protagonist_name} ({protagonist_gender})" if protagonist_name else ""}
{f"Previous Context: {story_context}" if story_context else ""}
{f"Previous Choice: {previous_choice}" if previous_choice else ""}

This is set in the high stakes sexy dramatic international world of business, espionage, luxury, and parties. {protagonist_info}
The world is mostly as we know it, but there is some future tech and many of the villains have powerful global properties. 
The world is in a state of emergency, and you believe the only way to save it is to party hard, seduce as many people as possible, and have James Bond style adventures with crazy action scenes and gunfights.

Generate an engaging story segment with 3 choices."""

        # Add character information if provided
        selected_character_prompt = ""
        if character_info and extract_character_name(character_info):
            traits = extract_character_traits(character_info)
            plot_lines = extract_plot_lines(character_info)
            style = extract_character_style(character_info)

            selected_character_prompt = (
                f"\nSelected Character to Feature:\n"
                f"Name: {extract_character_name(character_info)}\n"
                f"Role: {extract_character_role(character_info)}\n"
                f"Traits: {', '.join(traits)}\n"
                f"Visual Description: {style}\n"
            )

            if plot_lines:
                selected_character_prompt += f"Suggested Plot Lines (MUST USE AT LEAST ONE):\n"
                for plot in plot_lines:
                    selected_character_prompt += f"- {plot}\n"

        # Add additional characters if provided
        additional_characters_prompt = ""
        if additional_characters and len(additional_characters) > 0:
            additional_characters_prompt = "\nAdditional Characters from Database (MUST INCLUDE AT LEAST ONE NEW CHARACTER):\n"
            for char in additional_characters:
                char_traits = extract_character_traits(char)
                if isinstance(char_traits, str):
                    char_traits = [char_traits]

                char_name = extract_character_name(char)
                char_role = extract_character_role(char)
                traits_str = ', '.join(char_traits) if char_traits else 'No specified traits'

                additional_characters_prompt += (
                    f"- Name: {char_name}\n"
                    f"  Role: {char_role}\n"
                    f"  Traits: {traits_str}\n"
                )

        # Add previous choice context if any
        context_prompt = ""
        if story_context and previous_choice:
            is_custom_choice = previous_choice.startswith("Custom choice:")

            if is_custom_choice:
                context_prompt = (
                    f"\nPrevious story context: {story_context}\n"
                    f"Player entered a custom choice: {previous_choice[14:].strip()}\n"
                    "Continue the story based on this custom input from the player, treating it as a direct action or decision made by the protagonist. "
                    "Be creative and incorporate their specific input naturally into the story flow, maintaining consistency with previous events."
                )
            else:
                context_prompt = (
                    f"\nPrevious story context: {story_context}\n"
                    f"Player chose: {previous_choice}\n"
                    "Continue the story based on this choice, maintaining consistency with previous events."
                )

        # Build mission guidance
        mission_prompt = """
If this is the beginning of a story, ensure:
1. IMPORTANT: The story MUST begin with a mission-giver character assigning a mission to the player with these components:
   - A clear objective (steal an item, sabotage a plan, investigate a location, etc.)
   - A specific target character who has the 'villain' role
   - A large reward in one of the game currencies (💵, 💷, 💶, 💴)
   - A deadline or sense of urgency
   - The mission should be central to the plot and referenced throughout the story
   - IMPORTANT: The mission giver reluctantly tasks you with missions targeting villains while reminding you not to screw up again.

2. Provide three meaningful choice options that MUST relate to the mission:
   - One 'mission-advancing' choice: Clear progress on the primary objective
   - One 'risky' choice: High risk/reward or possible mission failure
   - One 'alternative' choice: Indirect help, intel gathering, new allies, or a delay
   - Each choice should have a cost in dollars (💵) starting at $500
   - Choices should lead to different potential outcomes (each one should sound sexy and dangerous)
"""

        # Format request
        format_prompt = """
Format as JSON with:
{
  "title": "Episode title",
  "story": "Story text with integrated mission assignment",
  "choices": [
    {
      "text": "First choice related to the mission",
      "consequence": "Brief outcome hint",
      "currency_requirements": {"💵": 500},
      "mission_impact": "Describe how this choice affects the mission (advancing it)",
      "type": "mission-advancing"
    },
    {
      "text": "Second choice with high risk/reward",
      "consequence": "Possible danger or unexpected outcome",
      "currency_requirements": {"💵": 750},
      "mission_impact": "High risk impact on mission (potential failure or big success)",
      "type": "risky"
    },
    {
      "text": "Third choice, an alternative approach",
      "consequence": "Outcome hint, like gaining allies or resources",
      "currency_requirements": {"💵": 600},
      "mission_impact": "Alternative path that may help indirectly",
      "type": "alternative"
    }
  ],
  "mission": {
    "title": "Mission title",
    "description": "Detailed mission description",
    "giver": "Name of character who gave the mission",
    "giver_id": "ID of the character who gave the mission",
    "target": "Name of target character (villain)",
    "target_id": "ID of target character",
    "objective": "What the player must do",
    "reward_currency": "Currency symbol (💎, 💵, etc.)",
    "reward_amount": "Amount of reward",
    "deadline": "Narrative deadline description",
    "difficulty": "Easy, Medium, or Hard"
  },
  "characters": ["List of character names featured, including new characters"]
}"""

        # Combine all prompts
        full_prompt = (
            f"{content_prompt}\n"
            f"{selected_character_prompt}\n"
            f"{additional_characters_prompt}\n"
            f"{context_prompt}\n"
            f"{mission_prompt}\n"
            f"{format_prompt}"
        )

        # Set up messages
        messages = [
            system_message,
            {"role": "user", "content": full_prompt}
        ]

        logger.debug(f"Sending messages to OpenAI: {json.dumps(messages, indent=2)}")

        # Make the OpenAI API call with response_format parameter
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.9,
            max_tokens=5000,
            response_format={"type": "json_object"}  # Force JSON response format
        )

        logger.info("Successfully received response from OpenAI")
        logger.debug(f"Raw response content: {response.choices[0].message.content}")

        # Parse the generated story - with proper error handling
        try:
            # The response should now be valid JSON without any need for regex extraction
            content = response.choices[0].message.content.strip()
            result = json.loads(content)

            # Return formatted result
            formatted_result = {
                "story": json.dumps(result),
                "conflict": final_conflict,
                "setting": final_setting,
                "narrative_style": final_narrative,
                "mood": final_mood
            }
            
            logger.info("Successfully generated and formatted story")
            logger.info("Exiting generate_story function")
            return formatted_result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
            logger.error(f"Raw response content: {response.choices[0].message.content}")
            
            # Create a fallback story structure
            fallback_result = {
                "title": "Story Generation Error",
                "story": "Our storyteller encountered an error. Please try again with different parameters.",
                "choices": [
                    {
                        "text": "Try again",
                        "consequence": "Start over with new options",
                        "currency_requirements": {"💵": 0},
                        "mission_impact": "None",
                        "type": "retry"
                    }
                ],
                "characters": []
            }
            
            # Format and return fallback result
            formatted_result = {
                "story": json.dumps(fallback_result),
                "conflict": final_conflict,
                "setting": final_setting,
                "narrative_style": final_narrative,
                "mood": final_mood
            }
            
            logger.info("Using fallback story structure due to parsing error")
            return formatted_result

    except Exception as e:
        logger.error(f"Error generating story: {str(e)}", exc_info=True)
        raise Exception(f"Failed to generate story: {str(e)}")
