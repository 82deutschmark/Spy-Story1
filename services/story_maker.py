import os
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from openai import OpenAI
import random

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
        ("💣", "Double agent exposed"),
        ("💼", "Corporate espionage"),
        ("🧪", "Bioweapon heist"),
        ("💰", "Trillion-dollar ransom"),
        ("🔍", "Assassination conspiracy"),
        ("🕵️", "Government overthrow"),
        ("🌌", "Space station takeover"),
        ("🧠", "Mind control experiment")
    ],
    "settings": [
        ("🗼", "DC Offices"),
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

def get_story_options() -> Dict[str, List[Tuple[str, str]]]:
    """Return available story options for UI display"""
    return STORY_OPTIONS

def extract_character_traits(character_data: Dict[str, Any]) -> List[str]:
    """Extract character traits from different data structures"""
    traits = character_data.get('character_traits', [])
    if not traits and 'traits' in character_data:
        traits = character_data['traits']
    return traits

def extract_plot_lines(character_data: Dict[str, Any]) -> List[str]:
    """Extract plot lines from different data structures"""
    plot_lines = character_data.get('plot_lines', [])
    if not plot_lines and 'plot_lines' in character_data:
        plot_lines = character_data['plot_lines']
    return plot_lines

def extract_character_style(character_data: Dict[str, Any]) -> str:
    """Extract character visual style/description from different data structures"""
    style = character_data.get('style', '')
    if not style and character_data.get('visual_description'):
        style = character_data.get('visual_description')
    return style

def extract_character_name(character_data: Dict[str, Any]) -> str:
    """Extract character name from different data structures"""
    return character_data.get('name', character_data.get('character_name', 'Unnamed Character'))

def extract_character_role(character_data: Dict[str, Any]) -> str:
    """Extract character role from different data structures"""
    return character_data.get('role', character_data.get('character_role', 'neutral'))

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
    protagonist_gender: Optional[str] = None
) -> Dict[str, Any]:
    """Generate a story based on selected or custom parameters and character info"""
    if not api_key:
        raise ValueError("OpenAI API key not found. Please add it to your environment variables.")

    # Use custom values if provided, otherwise use selected options
    final_conflict = custom_conflict or conflict
    final_setting = custom_setting or setting
    final_narrative = custom_narrative or narrative_style
    final_mood = custom_mood or mood

    # Build character information for the prompt
    selected_character_prompt = ""
    if character_info and character_info.get('name'):
        # Extract character data using helper functions
        traits = extract_character_traits(character_info)
        plot_lines = extract_plot_lines(character_info)
        style = extract_character_style(character_info)

        # Build the character prompt section with all available data
        selected_character_prompt = (
            f"\nSelected Character to Feature:\n"
            f"Name: {character_info['name']}\n"
            f"Role: {character_info.get('role', 'neutral')}\n"
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

    # Core story universe description
    # Handle protagonist information
    protagonist_info = ""
    if protagonist_name and protagonist_gender:
        protagonist_info = f"You are {protagonist_name}, a {protagonist_gender} agent who is totally debauched, woefully ignorant, but very charismatic, arrogant, and constantly receives romantic advances from practically everybody you meet. "
    else:
        protagonist_info = "You are a charismatic but incompetent agent who constantly receives romantic advances from practically everybody you meet. "

    # Create a more mission-focused story universe
    universe_prompt = (
        f"This is set in the hormone-fueled high stakes sexy dramatic international spy network. {protagonist_info}"
        "The story is set in the year 2070, and the world is in the midst of a global crisis that you are never really sure about. "
        "The world is in a state of emergency, and you believe the only way to save it is to party hard, seduce as many people as possible, and have James Bond style adventures with crazy action scenes and gunfights, "
        "involving more and more beautiful people and increasingly ridiculous scenarios and global settings.\n\n"
        "All the characters are constantly betraying each other and having romantic flings. The narrative should be told directly to the reader (using 'you'), be over-the-top, "
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
        "Create an engaging story segment that:\n"
        "1. Features the reader as 'you' (second-person narrative) as the main story driver\n"
        "2. Introduces the selected character (if provided) into a complex international spy scenario\n"
        "3. IMPORTANT: If plot lines are provided for the character, you MUST incorporate at least one into the story\n"
        "4. " + (f"Since there are already {len(additional_characters) + (1 if character_info else 0)} characters in this story, only include a new character in choices if absolutely necessary for the plot" if len(additional_characters) + (1 if character_info else 0) >= 4 else
        "IMPORTANT: Include one new character from the database in the choices when needed") + "\n"
        "5. Includes betrayal, romantic flings, and over-the-top action sequences\n"
        "6. Uses the character's traits to guide their behavior and dialogue\n"
        "7. CRITICAL: The story MUST begin with a mission-giver character assigning a mission to the player with these components:\n"
        "   - A clear objective (steal an item, sabotage a plan, investigate a location, etc.)\n"
        "   - A specific target character who has the 'villain' role\n"
        "   - A reward in one of the game currencies (💵, 💷, 💶, 💴)\n"
        "   - A deadline or sense of urgency\n"
        "   - The mission should be central to the plot and referenced throughout the story\n"
        "8. In many story segments, include characters offering to trade currencies with the player:\n"
        "   - Characters can offer to trade dollars (💵), pounds (💷), euros (💶), or yen (💴) for the player's diamonds (💎)\n"
        "   - Make offers sound enticing but slightly suspicious\n"
        "   - Each diamond (💎) is worth €1000 (💶) or ¥150000 (💴)\n"
        "   - Include a specific exchange rate in the offer (e.g., '5 diamonds for 5,000 euros')\n"
        "   - These offers should feel like they're tied to the mission or other character motivations\n"
        "9. Provides exactly two meaningful choice options that:\n"
        "   - Lead to different potential outcomes (each one should sound sexy and dangerous)\n"
        "   - Stay true to the characters' established traits\n"
        "   - Relate to at least one of the plot lines if provided\n"
        "   - IMPORTANT: Include one new character from the database in the choices when needed\n"
        "   - REQUIRED: Each choice must have a random dollar (💵) cost between $1000-$20000\n"
        "   - Avoid dead ends but escalate the ridiculousness with each choice\n"
        "10. Include clear consequences for each choice that involve romantic encounters, betrayal, or absurd action scenarios\n"
        "11. If player has an active mission, reference it and potentially provide progress updates\n\n"
        "Format the response as a JSON object with:\n"
        "{\n"
        "  'title': 'Episode title',\n"
        "  'story': 'The story text',\n"
        "  'choices': [\n"
        "    {\n"
        "      'text': 'First choice',\n"
        "      'consequence': 'Brief outcome hint',\n"
        "      'currency_requirements': {'💵': 1000 + random.randint(0, 19000)}\n"
        "    },\n"
        "    {\n"
        "      'text': 'Second choice',\n"
        "      'consequence': 'Brief outcome hint',\n"
        "      'currency_requirements': {'💵': 1000 + random.randint(0, 19000)}\n"
        "    }\n"
        "  ],\n"
        "  'currency_trade_offer': {\n"
        "    'text': 'Optional currency trade offer from a character',\n"
        "    'from_currency': '💎',\n"
        "    'to_currency': '💵 or 💷',\n"
        "    'rate': 'Proposed exchange rate'\n"
        "  },\n"
        "  'mission': {\n"
        "    'title': 'Mission title (if this episode contains a mission)',\n"
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

    try:
        # Note: gpt-4o is the newest model, released May 13, 2024.
        # do not change this unless explicitly requested by the user

        # Prepare messages with system prompt and user query
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a master storyteller creating stories set in a sexy, high-stakes international spy network in 2070. "
                    "Your stories address the reader directly using second-person narrative ('you' instead of 'the protagonist'). "
                    "The reader plays as a charismatic but incompetent agent who constantly receives romantic advances "
                    "while navigating an over-the-top world of betrayal, action, and absurdity. Keep the tone dramatic and provocative, "
                    "with excessive action scenes, romantic encounters, and ridiculous plot twists. The protagonist doesn't care about "
                    "the global crisis, they just want to party hard and have James Bond style adventures. "
                    "Include missions from mission-giver characters (like Dr. Ugh) that target villain characters in the database. "
                    "These missions should offer currency rewards and have clear objectives. "
                    "You can adapt to both predefined choices and custom user inputs, seamlessly incorporating their creative ideas "
                    "into the ongoing narrative while maintaining the established tone and character traits."
                )
            },
            {"role": "user", "content": prompt}
        ]

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
            response_format={"type": "json_object"}
        )

        # Add the response to the message history for potential future continuations
        messages.append({
            "role": "assistant",
            "content": response.choices[0].message.content
        })

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