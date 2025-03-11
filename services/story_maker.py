import os
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from openai import OpenAI

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
    if not api_key:
        raise ValueError("OpenAI API key not found. Please add it to your environment variables.")

    # Log the story generation request to help debug
    logger.debug(f"Generating story with conflict: {conflict}, setting: {setting}, using character: {extract_character_name(character_info) if character_info else 'None'}")

    # Use custom values if provided, otherwise use selected options
    final_conflict = custom_conflict or conflict
    final_setting = custom_setting or setting
    final_narrative = custom_narrative or narrative_style
    final_mood = custom_mood or mood

    # Handle protagonist information
    protagonist_info = ""
    if protagonist_name and protagonist_gender:
        protagonist_info = f"You are {protagonist_name}, a {protagonist_gender} agent who is very charismatic, arrogant, and constantly receives romantic advances from practically everybody you meet. "
    else:
        protagonist_info = "You are a charismatic but reckless agent who constantly receives romantic advances from practically everybody you meet. "

    # Build character information for the prompt
    selected_character_prompt = ""
    if character_info and extract_character_name(character_info):
        # Extract character data using helper functions
        traits = extract_character_traits(character_info)
        plot_lines = extract_plot_lines(character_info)
        style = extract_character_style(character_info)

        # Build the character prompt section with all available data
        selected_character_prompt = (
            f"\nSelected Character to Feature:\n"
            f"Name: {extract_character_name(character_info)}\n"
            f"Role: {extract_character_role(character_info)}\n"
            f"Traits: {', '.join(traits)}\n"
            f"Visual Description: {style}\n"
        )

        # Add plot lines with emphasis to ensure they're incorporated into the story
        if plot_lines:
            selected_character_prompt += f"Suggested Plot Lines (MUST USE AT LEAST ONE):\n"
            for plot in plot_lines:
                selected_character_prompt += f"- {plot}\n"

    # Build information about additional characters from the database
    additional_characters_prompt = ""
    if additional_characters and len(additional_characters) > 0:
        additional_characters_prompt = "\nAdditional Characters from Database (MUST INCLUDE AT LEAST ONE NEW CHARACTER):\n"
        for char in additional_characters:
            char_traits = extract_character_traits(char)
            if isinstance(char_traits, str):
                # Handle case where traits might be a string
                char_traits = [char_traits]

            char_name = extract_character_name(char)
            char_role = extract_character_role(char)
            traits_str = ', '.join(char_traits) if char_traits else 'No specified traits'

            additional_characters_prompt += (
                f"- Name: {char_name}\n"
                f"  Role: {char_role}\n"
                f"  Traits: {traits_str}\n"
            )

    # Add context from previous choices if available
    context_prompt = ""
    if story_context and previous_choice:
        # Check if it's a custom choice
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

    # Create a more mission-focused story universe
    universe_prompt = (
        f"This is set in the high stakes sexy dramatic international world of business, espionage, luxury, and parties. {protagonist_info}"
        "The world is mostly as we know it, but there is some future tech and many of the villains have powerful global properties. "
        "The world is in a state of emergency, and you believe the only way to save it is to party hard, seduce as many people as possible, and have James Bond style adventures with crazy action scenes and gunfights, "
        "involving more and more beautiful people and increasingly ridiculous scenarios and global settings.\n\n"
        "All the characters are constantly betraying each other and seducing each other. The narrative should be told directly to the reader (using 'you'), be over-the-top, "
        "with excessive action scenes, dramatic romantic encounters, and constant plot twists where allies become enemies and vice versa.\n\n"
        "Each character has international connections and unique skills they use in increasingly absurd ways.\n\n"
        "IMPORTANT: The story should begin with a mission giver character (any character with the 'mission-giver' role) giving the player a mission. This mission should be a central plot point. The mission giver should be different for different playthroughs. They reluctantly task you with missions targeting villains while reminding you not to screw up again. These missions offer currency rewards when completed."
    )

    # Construct the main prompt
    prompt = (
        f"Primary Conflict: {final_conflict}\n"
        f"Setting: {final_setting}\n"
        f"Narrative Style: {final_narrative}\n"
        f"Mood: {final_mood}\n\n"
        f"{universe_prompt}\n"
        f"{selected_character_prompt}\n"
        f"{additional_characters_prompt}\n"
        f"{context_prompt}\n\n"
        "Create an engaging story introduction that:\n"
        f"1. Features the reader as 'you' (second-person narrative) as the main story driver with {final_narrative} narrative style\n"
        "2. Introduces the selected character (if provided) into a complex international spy scenario\n"
        "3. IMPORTANT: If plot lines are provided for the character, you MUST incorporate at least one into the story\n"
        "4. " + (f"Since there are already {len(additional_characters) + (1 if character_info else 0)} characters in this story, only include a new character in choices if absolutely necessary for the plot" if len(additional_characters) + (1 if character_info else 0) >= 4 else
                "IMPORTANT: Include one new character from the database in the choices when needed") + "\n"
        "5. Includes betrayal, romantic flings, and over-the-top action sequences\n"
        "6. Uses the character's traits to guide their behavior and dialogue\n"
        "7. CRITICAL: The story MUST begin with a mission-giver character assigning a mission to the player with these components:\n"
        "   - A clear objective (steal an item, sabotage a plan, investigate a location, etc.)\n"
        "   - A specific target character who has the 'villain' role\n"
        "   - A large reward in one of the game currencies (💵, 💷, 💶, 💴)\n"
        "   - A deadline or sense of urgency\n"
        "   - The mission should be central to the plot and referenced throughout the story\n"
        "   - IMPORTANT: The mission giver should be different for different playthroughs. They reluctantly task you with missions targeting villains while reminding you not to screw up again.\n"

        "9. Provides three meaningful choice options that MUST relate to the mission:\n"
        "   - One 'mission-advancing' choice: Clear progress on the primary objective\n" 
        "   - One 'risky' choice: High risk/reward or possible mission failure\n"
        "   - One 'alternative' choice: Indirect help, intel gathering, new allies, or a delay\n"
        "   - Lead to different potential outcomes (each one should sound sexy and dangerous)\n"
        "   - Stay true to the characters' established traits\n"
        "   - Relate to at least one of the plot lines or missions \n"
        "   - IMPORTANT: One choice must allude to maybe needing outside help and introduce a new character from the database \n"
        "   - REQUIRED: Each choice must have a dollar (💵) cost starting at $500, with increased costs for choices that: involve powerful characters, have higher risk/reward, include exotic locations, or advanced technology\n"
        "   - Avoid dead ends but escalate the ridiculousness with each choice\n"
        "10. Include clear consequences for each choice that involve romantic encounters, betrayal, or absurd action scenarios\n"
        "11. If player has an active mission, reference it and potentially provide progress updates\n\n"
        "Format the response as a JSON object with:\n"
        "{\n"
        "  'title': 'Episode title',\n"
        "  'story': 'The story text with integrated mission assignment',\n"
        "  'choices': [\n"
        "    {\n"
        "      'text': 'First choice related to the mission',\n"
        "      'consequence': 'Brief outcome hint',\n"
        "      'currency_requirements': {'💵': 500 + random.randint(0, min(1000, 200 * (protagonist_level or 1)))},\n"
        "      'mission_impact': 'Describe how this choice affects the mission (advancing it)',\n"
        "      'type': 'mission-advancing'\n"
        "    },\n"
        "    {\n"
        "      'text': 'Second choice with high risk/reward',\n"
        "      'consequence': 'Possible danger or unexpected outcome',\n"
        "      'currency_requirements': {'💵': 750 + random.randint(0, min(1500, 300 * (protagonist_level or 1)))},\n"
        "      'mission_impact': 'High risk impact on mission (potential failure or big success)',\n"
        "      'type': 'risky'\n"
        "    },\n"
        "    {\n"
        "      'text': 'Third choice, an alternative approach',\n"
        "      'consequence': 'Outcome hint, like gaining allies or resources',\n"
        "      'currency_requirements': {'💵': 600 + random.randint(0, min(1200, 250 * (protagonist_level or 1)))},\n"
        "      'mission_impact': 'Alternative path that may help indirectly',\n"
        "      'type': 'alternative'\n"
        "    }\n"
        "  ],\n"
        "  'mission': {\n"
        "    'title': 'Mission title',\n"
        "    'description': 'Detailed mission description',\n"
        "    'giver': 'Name of character who gave the mission',\n"
        "    'giver_id': 'ID of the character who gave the mission',\n"
        "    'target': 'Name of target character (villain)',\n"
        "    'target_id': 'ID of target character',\n"
        "    'objective': 'What the player must do',\n"
        "    'reward_currency': 'Currency symbol (💎, 💵, etc.)',\n"
        "    'reward_amount': 'Amount of reward',\n"
        "    'deadline': 'Narrative deadline description',\n"
        "    'difficulty': 'Easy, Medium, or Hard'\n"
        "  },\n"
        "  'characters': ['List of character names featured, including new characters']\n"
        "}"
    )

    # Make the OpenAI API call
    try:
        messages = [{"role": "user", "content": prompt}]

        # If story_context exists, it means we're continuing a story, so we should include previous context
        if story_context:
            # Insert the context as part of the message history
            messages.insert(1, {"role": "assistant", "content": f"Previous story context: {story_context}"})

            if previous_choice:
                messages.insert(2, {"role": "user", "content": f"Player chose: {previous_choice}"})

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.9,
            max_tokens=5000,
            response_format={"type": "json_object"}
        )

        # Parse and return the generated story
        result = json.loads(response.choices[0].message.content)
        return {
            "story": json.dumps(result),  # Convert dict to JSON string for database storage
            "conflict": final_conflict,
            "setting": final_setting,
            "narrative_style": final_narrative,
            "mood": final_mood
        }

    except Exception as e:
        logger.error(f"Error generating story: {str(e)}")
        raise Exception(f"Failed to generate story: {str(e)}")