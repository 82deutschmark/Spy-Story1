###
### story_maker.py - Initial Story Generation Service (Refactored)
# ==============================================================

#### IMPORTANT: This module is the core story generation engine that creates the initial story.
###### This version consolidates duplicate instructions and prompts for better maintainability.

import os
import json
import logging
import random
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any

from openai import OpenAI
from services.state_manager import GameStateManager
from services.character_evolution_service import (
    evolve_character_traits,
    update_character_relationships,
    create_character_evolution
)
from utils.character_manager import (
    extract_character_traits,
    extract_plot_lines,
    extract_character_style,
    extract_character_name,
    extract_character_role,
    extract_character_backstory,
    extract_character_plot_lines,
    get_random_characters
)
from utils.validation_utils import validate_story_parameters
from utils.context_manager import OpenAIContextManager
from database import db
from models import StoryGeneration, Character, PlotArc, Mission

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.DEBUG)

# --- Shared Prompt Constants ---
CHARACTER_INTEGRATION_REQUIREMENTS = [
    "This NPC MUST be used in the story according to their specified role",
    "Make this NPC's traits manifest in their dialogue and actions",
    "Show their backstory through their experiences and knowledge",
    "Reflect their plot lines in their motivations and actions",
    "Ensure their traits influence their decisions and reactions",
    "Make their presence meaningful to the plot",
    "Show how their traits affect their relationship with the player character",
    "Use their traits to create interesting conflicts or opportunities",
    "Do not modify or change this NPC's role or personality",
    "This NPC must remain consistent with their provided traits and backstory",
    "This NPC's role must be clearly evident in their actions and dialogue",
    "This NPC must maintain their assigned role throughout the story",
    "This NPC's interactions must align with their role requirements",
    "This NPC cannot be replaced or substituted with other characters",
]

CHARACTER_DIALOGUE_GUIDELINES = [
    "Make their speech patterns reflect their traits",
    "Show their backstory through their expertise in conversations",
    "Reveal their plot lines through their motivations and goals",
    "Let their backstory influence their perspective and opinions",
    "Make their dialogue choices reflect their values",
    "Show their emotional intelligence through social interactions",
    "Reveal their motivations through their words and actions",
    "Make their dialogue choices impact the story's direction",
    "Ensure their dialogue reflects their assigned role",
    "Make their speech patterns match their role requirements"
]

IMPORTANT_CHARACTER_USAGE_RULES = [
    "You MUST use only the characters provided in the prompts; do not invent new characters.",
    "The mission-giver must remain as given and the villain must be used as provided.",
    "All character traits, backstories, and plot lines must remain unmodified.",
    "You MUST use the mission-giver character to give the initial mission, which targets one of the villain characters.",
    "The mission should have a clear objective like to steal something, kill someone, or obtain info or all three.",
    "The mission should have a deadline of two days and a consequence for failure.",
    "The villain should not appear directly in the story until later in the game; introduce them first via other character dialogue.",
    "You MUST NOT invent or create any unsourced characters; select from the characters provided in the character prompts.",
    "The protagonist should communicate with the other characters by seeking them out or they will seek the protagonist out.",
    "The other characters should have a reason to be hostile or helpful to the protagonist, and use their traits, plot lines, and backstory to enrich the story.",
    "The mission-giver reluctantly agrees to give the player the mission and reminds them not to screw it up again, alluding to a previous fiasco.",
    "The villain must be well-protected and pose a significant challenge, but also be pathetic and incompetent and the object of disgust not fear.",
    "The villain is hated by the mission-giver for reasons that are business, political, ideological, personal, or any combination thereof.",
    "The villain should have a weakness that the player can exploit.",
    "The villain should have a backstory that explains their plan or motivation, but generally they are a super rich scumbag who will stop at nothing to get what they want.",
    "Do not describe the villain's physical appearance, only their role and motivation.",
    "The mission-giver is a rich person, or a high-level spy or a government agent with a lot of resources and power. They need the protagonist for a discreet job.",
    "The mission-giver should already have a strained relationship with the player character, who they view as a reckless and impulsive amateur.",
    "The mission-giver is always talking about geopolitical tensions and macroeconomic trends and esoteric financial strategies in one or two complex sentences."
]

STORY_INTRO_GUIDELINES = [
    "Generate a LENGTHY, DETAILED story introduction (at least 12000-15000 words) with good story structure.",
    "Always tell the story in second person, addressing the player directly and alluding to their name and gender naturally through dialogue.",
    "Use vivid sensory details, atmospheric descriptions, and action-packed fight scenes, but do not reference a character's physical features or clothing.",
    "This segment should set the stage for the story, introduce the characters, and provide a clear objective for the player.",
    "The story should be mission-driven but true to the narrative style, mood, and setting.",
    "Incorporate dynamic character interactions with dialogue that reveals personality.",
    "Balance action, dialogue, intrigue, and character development, ending with a cliffhanger with three choices."
]

# Story generation options for UI display
STORY_OPTIONS = {
    "conflicts": [
        ("💼", "Corporate espionage"),
        ("🤵", "Double agent exposed"),
        ("🧪", "Bioweapon heist"),
        ("💰", "Trillion-dollar ransom"),
        ("🔍", "Hidden conspiracy"),
        ("🕵️", "Government overthrow"),
        ("🌌", "Space station takeover"),
        ("🧠", "Mind control experiment"),
    ],
    "settings": [
        ("🗼", "Modern Europe"),
        ("🏙️", "Neo-noir Cyber Metropolis"),
        ("🌌", "Space Station"),
        ("🏝️", "Chain of Private Islands"),
        ("🏙️", "New York City"),
        ("🚢", "Luxury Cruise Liner"),
        ("❄️", "Arctic Research Base"),
        ("🏰", "Moscow Underworld"),
        ("🏜️", "1920s Europe"),
        ("🌋", "Volcanic Lair"),
    ],
    "narrative_styles": [
        ("🤪", "Modern irreverence (e.g., Christopher Moore)"),
        ("🤪", "Metafictional absurdity (e.g., Jasper Fforde)"),
        ("🤪", "Contemporary satire (e.g., Gary Shteyngart)"),
        ("🤪", "Historical playfulness (e.g., Tom Holt)"),
        ("🤪", "Darkly absurd (e.g., David Wong)"),
        ("🤪", "Quirky offbeat humor (e.g., Simon Rich)"),
        ("🤪", "Absurdist Comedy (e.g., Douglas Adams, Terry Pratchett)"),
        ("😎", "Spy Thriller (e.g., John le Carré, Ian Fleming)"),
        ("🔥", "Steamy Romance (e.g., Nora Roberts, E.L. James)"),
        ("🎭", "Surreal Narrative (e.g., Haruki Murakami, Franz Kafka)"),
        ("🎬", "Action Adventure (e.g., Tom Clancy, Robert Ludlum)"),
        ("🕵️", "Noir Detective (e.g., Dennis Lehane, Michael Connelly)"),
        ("🏙️", "Urban Grit (e.g., S. A. Cosby, Colson Whitehead)"),
        ("🤖", "Bleak, dystopic, and thought-provoking (e.g., Orwell, Huxley)"),
        ("🐉", "Grand, epic, and full of adventure"),
        ("📖", "Deep, introspective, and emotionally profound"),
        ("✨", "Enchanting, whimsical, and full of wonder"),
        ("👻", "Eerily unsettling and cosmic in scale"),
        ("🗺️", "Legendary, epic, and mythic")
    ],
    "moods": [
        ("😜", "Witty and irreverent with offbeat humor"),
        ("🤯", "Mind-bending and playful with layered meta humor"),
        ("😏", "Sharp, satirical, and cutting with modern wit"),
        ("🏰", "Lighthearted and whimsical with a nod to history"),
        ("😈", "Gritty, dark, and absurdly humorous"),
        ("🤡", "Eccentric, quirky, and delightfully offbeat"),
        ("🤣", "Wildly imaginative and hilariously absurd"),
        ("🕶️", "Tense, secretive, and cool"),
        ("💋", "Passionate, sensual, and emotionally charged"),
        ("🌌", "Dreamlike, enigmatic, and surreal"),
        ("💥", "High-octane, thrilling, and adventurous"),
        ("🕵️", "Mysterious, brooding, and gritty"),
        ("🏙️", "Raw, edgy, and distinctly urban"),
        ("🤖", "Bleak, dystopic, and thought-provoking"),
        ("🐉", "Grand, epic, and full of adventure"),
        ("📖", "Deep, introspective, and emotionally profound"),
        ("✨", "Enchanting, whimsical, and full of wonder"),
        ("👻", "Eerily unsettling and cosmic in scale"),
        ("🗺️", "Legendary, epic, and mythic")
    ],
}

def get_openai_client() -> OpenAI:
    """Initialize and return an OpenAI client using the API key from the environment."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        error_msg = "OPENAI_API_KEY is missing. Ensure it is configured in the production environment."
        logger.error(error_msg)
        raise ValueError(error_msg)
    client = OpenAI(api_key=api_key)
    if client is None:
        logger.error("Failed to create OpenAI client")
        raise ValueError("Failed to create OpenAI client")
    return client

# Initialize game state manager
state_manager = GameStateManager()

# --- Character Prompt Builders ---
class CharacterPromptBuilder:
    """Build prompts for characters."""
    
    @staticmethod
    def build_character_prompt(character_info: Optional[Dict[str, Any]] = None) -> str:
        if not character_info:
            return ""
        
        traits = character_info.get("character_traits", {})
        backstory = character_info.get("backstory", "Not specified")
        plot_lines = character_info.get("plot_lines", ["Tries to get the protagonist to help with their own mission or plan"])
        role = character_info.get("role", "Unknown")
        role_requirements = character_info.get("role_requirements", "")
        
        # Format traits
        if isinstance(traits, dict):
            trait_descriptions = [f"{trait} (strength: {value})" for trait, value in traits.items() if value > 0]
        else:
            traits_list = [traits] if isinstance(traits, str) else traits
            trait_descriptions = [str(trait) for trait in traits_list]
            
        prompt_lines = [
            "FEATURED NPC CHARACTER:",
            f"Name: {extract_character_name(character_info)}",
            f"Role: {role}",
            f"Role Requirements: {role_requirements}",
            "",
            "CHARACTER DETAILS:",
            f"Traits: {', '.join(trait_descriptions) if trait_descriptions else 'Not specified'}",
            f"Backstory: {backstory}",
            f"Plot Lines: {', '.join(plot_lines) if plot_lines else 'Not specified'}",
            "",
            "CHARACTER INTEGRATION REQUIREMENTS:"
        ]
        prompt_lines.extend([f"{i+1}. {req}" for i, req in enumerate(CHARACTER_INTEGRATION_REQUIREMENTS)])
        prompt_lines.append("")
        prompt_lines.append("CHARACTER DIALOGUE GUIDELINES:")
        prompt_lines.extend([f"{i+1}. {guideline}" for i, guideline in enumerate(CHARACTER_DIALOGUE_GUIDELINES)])
        
        return "\n".join(prompt_lines)
    
    @staticmethod
    def build_additional_characters_prompt(additional_characters: Optional[List[Dict[str, Any]]] = None) -> str:
        if not additional_characters:
            return ""
        
        prompt_lines = ["SECONDARY NPC CHARACTERS - INCORPORATE AT LEAST ONE INTO THE NARRATIVE:"]
        for char in additional_characters:
            traits = extract_character_traits(char)
            if isinstance(traits, str):
                traits = [traits]
            traits_str = ", ".join(traits) if traits else "No specified traits"
            name = extract_character_name(char)
            role = extract_character_role(char)
            role_requirements = char.get("role_requirements", "")
            backstory = extract_character_backstory(char) or "No backstory provided"
            plot_lines = extract_character_plot_lines(char)
            plot_lines_str = ", ".join(plot_lines) if plot_lines else "No plot lines provided"
            
            char_lines = [
                f"- Name: {name}",
                f"  Role: {role}",
                f"  Role Requirements: {role_requirements}",
                f"  Traits: {traits_str}",
                f"  Backstory: {backstory}",
                f"  Plot Lines: {plot_lines_str}",
                "  Suggested Usage: Include in a meaningful choice for the player character",
                "  Important: This character should introduce one of their plot lines into the story"
            ]
            prompt_lines.extend(char_lines)
        return "\n".join(prompt_lines)

# --- Story Prompt Builders ---
class StoryPromptBuilder:
    """Build prompts for story generation."""
    
    @staticmethod
    def build_system_message(mood: str, narrative_style: str) -> Dict[str, str]:
        message_lines = [
            "You are a master narrative generator for our adventure game.",
            f"Create highly detailed, layered narratives in a {mood} tone with a {narrative_style} storytelling style.",
            "",
            "This game is set in a world of ruthless business, international espionage, luxury, and intrigue.",
            "Players take on missions, develop relationships with various characters, and navigate complex scenarios",
            "where betrayal, romance, and action are common themes.",
            "",
            "CRITICAL CHARACTER ROLE REQUIREMENTS:",
            "1. Use only characters provided in the prompts.",
            "2. Do not invent or create new characters.",
            "3. Respect each character's specific role and traits."
        ]
        return {"role": "system", "content": "\n".join(message_lines)}
    
    @staticmethod
    def build_story_prompt(
        conflict: str,
        setting: str,
        narrative_style: str,
        mood: str,
        character_info: Optional[Dict[str, Any]] = None,
        additional_characters: Optional[List[Dict[str, Any]]] = None,
        protagonist_name: Optional[str] = None,
        protagonist_gender: Optional[str] = None,
        protagonist_level: Optional[int] = 1,
        story_context: Optional[str] = None
    ) -> str:
        protagonist_section = []
        if protagonist_name and protagonist_gender:
            protagonist_section = [
                "PROTAGONIST DETAILS:",
                f"Name: {protagonist_name}",
                f"Gender: {protagonist_gender}"
            ]
        
        prompt_sections = [
            "Generate the first segment of the choose your own adventure story with the following parameters:",
            "",
            f"CONFLICT: {conflict}",
            f"SETTING: {setting}",
            f"NARRATIVE STYLE: {narrative_style}",
            f"MOOD: {mood}",
            "",
            "\n".join(protagonist_section) if protagonist_section else "",
            "",
            "CHARACTERS THAT MUST BE USED IN THE STORY:",
            CharacterPromptBuilder.build_character_prompt(character_info),
            "",
            CharacterPromptBuilder.build_additional_characters_prompt(additional_characters),
            "",
            "STORY CONTEXT:",
            story_context or (
                "This is the first segment of the story, featuring a charismatic, reckless, fearless rogue agent with a checkered past and devil-may-care attitude. "
                "They are recruited by a mission-giver who claims to have powerful friends and works for a secret organization to take down a powerful villain threatening the world."
            ),
            "",
            "IMPORTANT CHARACTER USAGE RULES:"
        ]
        prompt_sections.extend([f"{i+1}. {rule}" for i, rule in enumerate(IMPORTANT_CHARACTER_USAGE_RULES)])
        prompt_sections.append("")
        prompt_sections.append("STORY INTRODUCTION GUIDELINES:")
        prompt_sections.extend([f"{i+1}. {guideline}" for i, guideline in enumerate(STORY_INTRO_GUIDELINES)])
        prompt_sections.append("End the segment by providing exactly three distinct choices for how to proceed.")
        
        return "\n".join(filter(None, prompt_sections))

# --- Story Generation ---
class StoryGenerator:
    """Handles story generation and processing."""
    
    def __init__(self, context_manager: Optional[OpenAIContextManager] = None, client: Optional[OpenAI] = None):
        self.context_manager = context_manager or OpenAIContextManager()
        self.client = client or get_openai_client()

    def process_choices(self, story_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and process story choices."""
        if not isinstance(story_data, dict):
            logger.error(f"Invalid story_data type: {type(story_data)}")
            return {"choices": [], "story": "Error processing story data"}
        
        choices = story_data.get("choices", [])
        if not isinstance(choices, list):
            logger.error(f"Invalid choices type: {type(choices)}")
            story_data["choices"] = []
        else:
            for i, choice in enumerate(choices):
                if not isinstance(choice, dict):
                    logger.error(f"Invalid choice type at index {i}: {type(choice)}")
                    continue
                if "id" not in choice and "choice_id" not in choice:
                    choice["choice_id"] = f"choice_{i}_{datetime.utcnow().timestamp()}"
                if "text" in choice and isinstance(choice["text"], str):
                    try:
                        choice["text"] = choice["text"].encode('utf-8', errors='replace').decode('utf-8')
                    except Exception as e:
                        logger.error(f"Error encoding choice text: {str(e)}")
                        choice["text"] = "Choice option (encoding error)"
        return story_data

    def generate_story(
        self,
        conflict: str,
        setting: str,
        narrative_style: str,
        mood: str,
        character_info: Optional[Dict[str, Any]] = None,
        additional_characters: Optional[List[Dict[str, Any]]] = None,
        custom_conflict: Optional[str] = None,
        custom_setting: Optional[str] = None,
        custom_narrative: Optional[str] = None,
        custom_mood: Optional[str] = None,
        protagonist_name: Optional[str] = None,
        protagonist_gender: Optional[str] = None,
        protagonist_level: Optional[int] = 1,
        story_context: Optional[str] = None,
        client: Optional[OpenAI] = None
    ) -> Dict[str, Any]:
        # Update client if provided
        if client:
            self.client = client

        final_conflict = custom_conflict or conflict
        final_setting = custom_setting or setting
        final_narrative = custom_narrative or narrative_style
        final_mood = custom_mood or mood
        
        if additional_characters is None:
            additional_characters = get_random_characters(3)
        
        story_prompt = StoryPromptBuilder.build_story_prompt(
            conflict=final_conflict,
            setting=final_setting,
            narrative_style=final_narrative,
            mood=final_mood,
            character_info=character_info,
            additional_characters=additional_characters,
            protagonist_name=protagonist_name,
            protagonist_gender=protagonist_gender,
            protagonist_level=protagonist_level,
            story_context=story_context
        )
        
        story_data = self.context_manager.generate_initial_story(
            conflict=final_conflict,
            setting=final_setting,
            narrative_style=final_narrative,
            mood=final_mood,
            character_info=character_info,
            client=self.client,
            user_message=story_prompt
        )
        
        story_data = self.process_choices(story_data)
        return {
            "conflict": final_conflict,
            "setting": final_setting,
            "narrative_style": final_narrative,
            "mood": final_mood,
            "stories": story_data,
            "choices": story_data.get("choices", [])
        }

def get_story_options() -> Dict[str, List[Tuple[str, str]]]:
    """Return available story options for UI display."""
    return STORY_OPTIONS

def generate_story(**kwargs) -> Dict[str, Any]:
    """Generate a new story with the given parameters."""
    client = kwargs.pop('client', None)
    generator = StoryGenerator(client=client)
    story_data = generator.generate_story(**kwargs)
    # NEW: Flatten and explicitly set story parameters using user input
    flattened = {
        "narrative_text": story_data.get("stories", {}).get("story", story_data.get("story", "")),
        "choices": story_data.get("stories", {}).get("choices", story_data.get("choices", [])),
        "conflict": kwargs.get("conflict", story_data.get("conflict")),
        "setting": kwargs.get("setting", story_data.get("setting")),
        "narrative_style": kwargs.get("narrative_style", story_data.get("narrative_style")),
        "mood": kwargs.get("mood", story_data.get("mood"))
    }
    return flattened

__all__ = ['generate_story', 'get_story_options']

