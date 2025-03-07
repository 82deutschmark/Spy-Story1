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

    # Build the story prompt with character information
    character_prompt = ""
    if character_info:
        main_char = character_info.get('main_character', {})
        supporting_chars = character_info.get('supporting_characters', [])
        
        if main_char:
            character_prompt = (
                f"\nMain Character: '{main_char.get('name', '')}' who has the following traits: "
                f"{', '.join(main_char.get('traits', []))}. "
                f"Their appearance is described as: {main_char.get('description', '')}"
            )
        
        if supporting_chars:
            character_prompt += "\n\nSupporting Characters:"
            for i, char in enumerate(supporting_chars):
                character_prompt += (
                    f"\n{i+1}. '{char.get('name', '')}' who has the following traits: "
                    f"{', '.join(char.get('traits', []))}. "
                    f"Their appearance is described as: {char.get('description', '')}"
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
        "Create an engaging interactive story segment for a Choose Your Own Adventure (CYOA) story. "
        "This is an ongoing narrative where player choices determine the story's direction. "
        "The story must end with exactly two distinct and meaningful choices for the player. "
        "Each choice should lead to significantly different potential story branches. "
        "Incorporate rich visual descriptions and character development. "
        "Remember that this is part of a larger narrative universe that may eventually be ported to a mobile app. "
        "Make the choices impactful to the story's progression and avoid choices that would lead to quick endings."
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

        # Log the raw response content for debugging
        logger.debug(f"OpenAI raw response: {response.choices[0].message.content}")
        
        try:
            # Parse and return the generated story
            result = json.loads(response.choices[0].message.content)
            return {
                "story": json.dumps(result),  # Convert dict to JSON string for database storage
                "conflict": final_conflict,
                "setting": final_setting,
                "narrative_style": final_narrative,
                "mood": final_mood
            }
        except json.JSONDecodeError as json_err:
            logger.error(f"JSON parse error: {json_err}. Raw content: {response.choices[0].message.content}")
            # Create a fallback result with the raw content
            fallback_result = {
                "title": "Story Generation",
                "story": response.choices[0].message.content,
                "choices": [
                    {"text": "Continue the adventure", "consequence": "See what happens next"},
                    {"text": "Try a different approach", "consequence": "Start a new path"}
                ],
                "characters": ["Pawel", "Pawleen"]
            }
            return {
                "story": json.dumps(fallback_result),
                "conflict": final_conflict,
                "setting": final_setting,
                "narrative_style": final_narrative,
                "mood": final_mood
            }

    except Exception as e:
        logger.error(f"Error generating story: {str(e)}")
        raise Exception(f"Failed to generate story: {str(e)}")
