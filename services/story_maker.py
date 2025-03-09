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
        ("💣", "Double agent exposed"),
        ("💼", "Corporate espionage"),
        ("🧪", "Bioweapon heist"),
        ("💰", "Trillion-dollar ransom"),
        ("🔍", "Assassination conspiracy"),
        ("🕵️", "Elite spy tournament"),
        ("🌌", "Space station takeover"),
        ("🧠", "Mind control experiment")
    ],
    "settings": [
        ("🗼", "Neo-Tokyo Nightclub"),
        ("🏝️", "Private Luxury Island"),
        ("🏙️", "Dubai Mega-Skyscraper"),
        ("🚢", "Orbital Cruise Liner"),
        ("❄️", "Arctic Research Base"),
        ("🏰", "Monaco Casino"),
        ("🏜️", "Sahara Desert Compound"),
        ("🌋", "Volcanic Lair")
    ],
    "narrative_styles": [
        ("😎", "Snarky action hero"),
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
        # Extract character traits with fallback options for different data structures
        traits = character_info.get('character_traits', [])
        if not traits and 'traits' in character_info:
            traits = character_info['traits']
        
        # Extract plot lines with fallback options
        plot_lines = character_info.get('plot_lines', [])
        if not plot_lines and 'plot_lines' in character_info:
            plot_lines = character_info['plot_lines']
        
        # Get character style/visual description
        style = character_info.get('style', '')
        if not style and character_info.get('visual_description'):
            style = character_info.get('visual_description')
            
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
            char_traits = char.get('character_traits', [])
            if isinstance(char_traits, str):
                # Handle case where traits might be a string
                char_traits = [char_traits]
            
            char_name = char.get('name', char.get('character_name', 'Unnamed Character'))
            char_role = char.get('role', char.get('character_role', 'neutral'))
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
        protagonist_info = f"The story revolves around {protagonist_name}, a {protagonist_gender} protagonist who is totally incompetent, woefully ignorant, but very charismatic, arrogant, and constantly receives romantic advances from practically everybody they meet. "
    
    universe_prompt = (
        f"This is set in the hormone-fueled high stakes sexy dramatic international spy network. {protagonist_info}"
        "The story is set in the year 2070, and the world is in the midst of a global crisis that the protagonist doesn't care enough to understand. "
        "The world is in a state of emergency, and the only way to save it is to party hard, have James Bond style adventures with crazy action scenes and gunfights, "
        "involving more and more beautiful people and increasingly ridiculous scenarios and global settings.\n\n"
        "All the characters are constantly betraying each other and having romantic flings. The narrative should be over-the-top, "
        "with excessive action scenes, dramatic romantic encounters, and constant plot twists where allies become enemies and vice versa.\n\n"
        "Each character has international connections and unique skills they use in increasingly absurd ways."
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
        "1. Features the incompetent but charismatic protagonist as the main story driver\n"
        "2. Introduces the selected character (if provided) into a ridiculous international spy scenario\n"
        "3. IMPORTANT: If plot lines are provided for the character, you MUST incorporate at least one into the story\n"
        "4. CRITICAL: If additional characters from the database are provided, you MUST introduce at least one new character from this list into the story\n"
        "5. Includes betrayal, romantic flings, and over-the-top action sequences\n"
        "6. Uses the character's traits to guide their behavior and dialogue\n"
        "7. Provides exactly two meaningful choice options that:\n"
        "   - Lead to different potential outcomes (one should be more absurd than the other)\n"
        "   - Stay true to the characters' established traits\n"
        "   - Relate to at least one of the plot lines if provided\n"
        "   - IMPORTANT: Include at least one new character from the database in the choices when possible\n"
        "   - Avoid dead ends but escalate the ridiculousness with each choice\n"
        "8. Include clear consequences for each choice that involve romantic encounters, betrayal, or absurd action scenarios\n\n"
        "Format the response as a JSON object with:\n"
        "{\n"
        "  'title': 'Episode title',\n"
        "  'story': 'The story text',\n"
        "  'choices': [\n"
        "    {'text': 'First choice', 'consequence': 'Brief outcome hint'},\n"
        "    {'text': 'Second choice', 'consequence': 'Brief outcome hint'}\n"
        "  ],\n"
        "  'characters': ['List of character names featured, including new characters']\n"
        "}"
    )

    try:
        # Note: gpt-4o is the newest model, released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a master storyteller creating stories set in a hormone-fueled, high-stakes international spy network in 2070. "
                        "Your stories feature a charismatic but incompetent protagonist who constantly receives romantic advances "
                        "while navigating an over-the-top world of betrayal, action, and absurdity. Keep the tone dramatic and provocative, "
                        "with excessive action scenes, romantic encounters, and ridiculous plot twists. The protagonist doesn't care about "
                        "the global crisis, they just want to party hard and have James Bond style adventures. "
                        "You can adapt to both predefined choices and custom user inputs, seamlessly incorporating their creative ideas "
                        "into the ongoing narrative while maintaining the established tone and character traits."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.9,
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