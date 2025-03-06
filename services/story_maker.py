import os
import json
from openai import OpenAI
import logging
from typing import Dict, List, Tuple, Optional, Any

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
        ("🐿️", "Squirrel gang's mischief"),
        ("🧙‍♂️", "Rat wizard's devious plots"),
        ("🦃", "Turkey's clumsy adventures"),
        ("🐔", "Chicken's clever conspiracies")
    ],
    "settings": [
        ("🌳", "Deep Forest"),
        ("🌾", "Sunny Pasture"),
        ("🏡", "Homestead"),
        ("🌲", "Mysterious Woods")
    ],
    "narrative_styles": [
        ("😎", "GenZ fresh style"),
        ("✌️", "Old hippie 1960s vibe"),
        ("🤘", "Mix of both")
    ],
    "moods": [
        ("😄", "Joyful and playful"),
        ("😲", "Thrilling and mysterious"),
        ("😎", "Cool and laid-back"),
        ("😂", "Funny and quirky")
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
    story_context: Optional[str] = None
) -> Dict[str, Any]:
    """Generate a story based on selected or custom parameters and optional character info"""
    if not api_key:
        raise ValueError("OpenAI API key not found. Please add it to your environment variables.")

    # Use custom values if provided, otherwise use selected options
    final_conflict = custom_conflict or conflict
    final_setting = custom_setting or setting
    final_narrative = custom_narrative or narrative_style
    final_mood = custom_mood or mood

    # Build the story prompt
    character_prompt = ""
    if character_info:
        character_prompt = (
            f"\nInclude the character '{character_info['name']}' in the story. "
            f"This character has the following traits: {', '.join(character_info['traits'])}. "
            f"Their appearance is described as: {character_info['description']}"
        )

    context_prompt = ""
    if story_context and previous_choice:
        context_prompt = (
            f"\nPrevious story context: {story_context}\n"
            f"Player chose: {previous_choice}\n"
            "Continue the story based on this choice."
        )

    prompt = (
        f"Primary Conflict: {final_conflict}\n"
        f"Setting: {final_setting}\n"
        f"Narrative Style: {final_narrative}\n"
        f"Mood: {final_mood}\n"
        f"{character_prompt}\n"
        f"{context_prompt}\n\n"
        "Create an interactive story segment that ends with exactly two distinct choices for the player. "
        "Each choice should lead to different potential story branches. "
        "The story should be engaging and incorporate the selected mood and narrative style. "
        "Make the choices meaningful and impactful to the story's progression."
    )

    try:
        # Call OpenAI API to generate the story using new client syntax
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a master storyteller creating an interactive Choose Your Own Adventure story. "
                        "Each story segment should end with exactly two distinct choices that will affect the next part of the story. "
                        "Your responses should be in JSON format with the following structure:\n"
                        "{\n"
                        "  'title': 'Episode title',\n"
                        "  'story': 'The story text',\n"
                        "  'choices': [\n"
                        "    {'text': 'First choice description', 'consequence': 'Brief hint about outcome'},\n"
                        "    {'text': 'Second choice description', 'consequence': 'Brief hint about outcome'}\n"
                        "  ],\n"
                        "  'characters': ['List of character names featured in this segment']\n"
                        "}"
                    )
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
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
