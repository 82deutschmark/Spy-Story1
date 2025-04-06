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
from services.character_evolution import (
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
    get_random_characters  # NEW: Use same function from character_manager
)
import logging
from datetime import datetime
from database import db
from models import StoryGeneration, Character, PlotArc, Mission
from utils.validation_utils import validate_story_parameters
from utils.context_manager import OpenAIContextManager
import random  # Existing import

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.DEBUG)

def get_openai_client():
    """Get an OpenAI client with the current API key."""
    try:
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
    except Exception as e:
        logger.error(f"Error initializing OpenAI client: {str(e)}")
        raise

# Initialize state manager
state_manager = GameStateManager()

# Export the functions that should be available to other modules
__all__ = ['generate_story', 'get_story_options']

class CharacterPromptBuilder:
    """Handles building character-related prompts."""
    
    @staticmethod
    def build_character_prompt(character_info: Optional[Dict[str, Any]] = None) -> str:
        """Build the character prompt for story generation with basic details only."""
        if not character_info:
            return ""

        # Get the exact fields from the DB (note: no role_requirements in DB)
        character_traits = character_info.get("character_traits", {})
        backstory = character_info.get("backstory", "")
        plot_lines = character_info.get("plot_lines", [])
        # Use the DB column 'character_role' via extraction function
        role = extract_character_role(character_info)

        # Build trait descriptions
        trait_descriptions = []
        if isinstance(character_traits, dict):
            for trait, value in character_traits.items():
                # Check if value is a number or can be converted to one
                try:
                    # Try to convert to number if it's a string
                    if isinstance(value, str) and value.strip().isdigit():
                        value = int(value)
                    
                    # Only include positive numeric values
                    if isinstance(value, (int, float)) and value > 0:
                        trait_descriptions.append(f"{trait} (strength: {value})")
                    # Include non-numeric values as is
                    elif isinstance(value, str) and value.strip():
                        trait_descriptions.append(f"{trait}: {value}")
                except (ValueError, TypeError):
                    # If conversion fails, include the trait without a strength value
                    if value:  # Only include non-empty values
                        trait_descriptions.append(trait)
        elif isinstance(character_traits, (list, str)):
            traits_list = [character_traits] if isinstance(character_traits, str) else character_traits
            for trait in traits_list:
                trait_descriptions.append(str(trait))

        # Build the prompt parts with basic details only (removed role_requirements)
        prompt_parts = [
            "FEATURED NPC CHARACTER:",
            f"Name: {extract_character_name(character_info)}",
            f"Role: {role}",
            "",
            "CHARACTER DETAILS:",
            f"Traits: {', '.join(trait_descriptions) if trait_descriptions else 'Not specified'}",
            f"Backstory: {backstory if backstory else 'Not specified'}",
            f"Plot Lines: {', '.join(plot_lines) if plot_lines else 'Tries to get the protagonist to help them with a personal mission'}"
        ]
        
        return "\n".join(prompt_parts)

    @staticmethod
    def build_additional_characters_prompt(additional_characters: Optional[List[Dict[str, Any]]] = None) -> str:
        """Build the prompt section for additional characters with basic details only."""
        if not additional_characters:
            return ""

        prompt_parts = ["\nSECONDARY NPC CHARACTERS:"]
        
        for char in additional_characters:
            char_traits = extract_character_traits(char)
            if isinstance(char_traits, str):
                char_traits = [char_traits]
            char_name = extract_character_name(char)
            char_role = extract_character_role(char)
            backstory = extract_character_backstory(char) or "Not specified"
            plot_lines = extract_character_plot_lines(char)
            plot_lines_str = ", ".join(plot_lines) if plot_lines else "Not specified"
            traits_str = ", ".join(char_traits) if char_traits else "Not specified"
            char_parts = [
                f"- Name: {char_name}",
                f"  Role: {char_role}",
                f"  Traits: {traits_str}",
                f"  Backstory: {backstory}",
                f"  Plot Lines: {plot_lines_str}"
            ]
            prompt_parts.extend(char_parts)

        return "\n".join(prompt_parts)

class StoryPromptBuilder:
    """Handles building story prompts."""
    
    @staticmethod
    def build_system_message(mood: str, narrative_style: str) -> Dict[str, str]:
        """Build the system message for story generation."""
        message_parts = [
            "You are a master narrative generator for our humourous, satirical, and absurd adventure game.",
            f"Create highly detailed, layered narratives in a {mood} tone with a {narrative_style} storytelling style.",
            "",
            "This game is set in the high-stakes world of ruthless business, international espionage, luxury, and intrigue.",
            "Players take on missions, develop relationships with various characters, and navigate complex scenarios",
            "where betrayal, romance, and action are common themes. The game engine tracks character relationships,",
            "story progress, and mission progress.",
            "",
            "CRITICAL CHARACTER ROLE REQUIREMENTS:",
            "1. You MUST ONLY use characters that are explicitly provided to you in the character prompts",
            "2. NEVER invent or create new characters that are not in the prompts",
            "3. If a character is a villain they should not suddenly enter a scene or location, they need to be well protected and hard to locate ",
            "4. Each character has a specific {char_role} that should be respected:",
            "   - Mission-giver: MUST be the one giving the mission to the player",
            "   - Villain: MUST be the primary antagonists",
            "   - Neutral: Can be used in supporting roles",
            "   - Undetermined: Role is flexible and might change based on the story or betray the player",
            "5. The mission-giver must remain the mission-giver",
            "6. The villains must remain the primary antagonist",
            "",
            "CHARACTER AUTHENTICITY:",
            "7. Maintain all {traits_str}, backstories, and plot lines exactly as provided",
            "8. Use character traits to influence dialogue and actions",
            "9. Weave backstories into experiences and knowledge",
            "10. Express plot lines through motivations and goals",
            "11. Create meaningful character interactions and conflicts",
            "",
            "MISSION AND RELATIONSHIP GUIDELINES:",
            "12. Mission must have clear objectives (steal/kill/obtain/destroy) and target one of the villains",
            "13. Include a reasonable deadline and failure consequences",
            "14. Make villain well-protected but pathetically incompetent, they should not appear directly in the first segment",
            "15. Mission-giver should be exasperated but reluctant and reference past failures",
            "16. Mission-giver uses complex language about geopolitics/economics that bores the protagonist",
            "17. Characters must express reasons for helping or opposing the protagonist",
            "",
            "NARRATIVE REQUIREMENTS:",
            "19. ALWAYS tell the story in second person, alluding to their {protagonist_name} and {protagonist_gender} naturally via dialogue",
            "20. Use vivid sensory details and atmospheric descriptions",
            "21. Begin with meeting the mission-giver, then the protagonist goes to see the character selected by the user",
            "22. Balance action, dialogue, intrigue, and character development",
            "23. End with a cliffhanger and exactly three distinct choices",
            "",
            "OUTPUT FORMAT REQUIREMENTS:",
            "24. Your response MUST be valid JSON with narrative_text, choices, and mission_update fields",
            "25. Each choice in the JSON must have a unique choice_id, descriptive text, and consequence",
            "26. If a choice involves a character, set the character_id field to that character's numeric ID (an integer, not a name)",
            "27. Character IDs are numbers that identify characters in the database - NEVER use character names as character_id values"
        ]
        
        return {
            "role": "system",
            "content": "\n".join(message_parts)
        }

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
        story_context: Optional[str] = None
    ) -> str:
        """Build the story prompt for initial story generation."""
        # Build protagonist parts
        protagonist_parts = []
        if protagonist_name:
            protagonist_parts.append(f"PROTAGONIST NAME: {protagonist_name}")
        if protagonist_gender:
            protagonist_parts.append(f"PROTAGONIST GENDER: {protagonist_gender}")

        # Build the main prompt parts
        prompt_parts = [
            "Generate the first segment of the choose your own adventure game story with the following parameters:",
            "",
            f"CONFLICT: {conflict}",
            f"SETTING: {setting}",
            f"NARRATIVE STYLE: {narrative_style}",
            f"MOOD: {mood}",
            "",
            "\n".join(protagonist_parts) if protagonist_parts else "",
            "",
            "CHARACTERS THAT MUST BE USED IN THE STORY:",
            CharacterPromptBuilder.build_character_prompt(character_info),
            "",
            CharacterPromptBuilder.build_additional_characters_prompt(additional_characters),
            "",
            "STORY CONTEXT:",
            story_context if story_context else "This is the first segment of the story, the protagonist is a charismatic, reckless, fearless rogue agent with a checkered past, and a devil-may-care attitude. They are recruited by a mission-giver who claims to have powerful friends and works for a secret organization to take down a powerful villain who is threatening the world with a diabolical plan.",
            "",
            "Create a LENGTHY, DETAILED story introduction (at least 1000-2500 words) with good story structure",
            "Introduce the character selected by the user after the mission has been given",
            "Begin with {protagonist_name} receiving a mission from the mission-giver.",
            "The mission-giver must explicitly mention the villain's name and the mission objective",
            "The mission should be clearly restated at the end of the segment as the choices are considered",
            "End the segment by providing exactly three distinct choices for how to proceed."
        ]
        
        return "\n".join(prompt_parts)

class StoryGenerator:
    """Handles story generation and processing."""
    
    def __init__(self, client: Optional[OpenAI] = None):
        self.client = client or get_openai_client()
        self.context_manager = OpenAIContextManager()

    def process_choices(self, story_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process and validate story choices."""
        if not isinstance(story_data, dict):
            logger.error(f"Invalid story_data type: {type(story_data)}")
            return {"choices": [], "story": "Error processing story data"}
            
        if "choices" in story_data:
            if not isinstance(story_data["choices"], list):
                logger.error(f"Invalid choices type: {type(story_data['choices'])}")
                story_data["choices"] = []
            else:
                for i, choice in enumerate(story_data["choices"]):
                    # If choice is a string, try to parse it as JSON
                    if isinstance(choice, str):
                        try:
                            choice_parsed = json.loads(choice)
                            story_data["choices"][i] = choice_parsed
                        except Exception as ex:
                            logger.error(f"Error parsing choice at index {i}: {str(ex)}")
                            story_data["choices"][i] = {}
                            continue
                    elif not isinstance(choice, dict):
                        logger.error(f"Invalid choice type at index {i}: {type(choice)}")
                        continue
                        
                    # Ensure each choice has an ID
                    if "id" not in choice and "choice_id" not in choice:
                        story_data["choices"][i]["choice_id"] = f"choice_{i}_{datetime.utcnow().timestamp()}"
                    
                    # Validate character_id - ensure it's an integer or null, never a name
                    if "character_id" in choice:
                        char_id = choice["character_id"]
                        if char_id is not None:
                            # If it's a string but not a digit, try to find the character by name
                            if isinstance(char_id, str) and not char_id.isdigit():
                                logger.info(f"Found possible character name instead of ID: {char_id}")
                                # Look up by name
                                char = Character.query.filter_by(character_name=char_id).first()
                                if char:
                                    choice["character_id"] = char.id
                                    logger.info(f"Converted character name '{char_id}' to ID: {char.id}")
                                else:
                                    choice["character_id"] = None
                                    logger.warning(f"Character name '{char_id}' not found, setting to None")
                            # If it's a digit string, convert to int
                            elif isinstance(char_id, str) and char_id.isdigit():
                                choice["character_id"] = int(char_id)
                            # If it's not an int at this point, set to None
                            elif not isinstance(char_id, int):
                                choice["character_id"] = None
                                logger.warning(f"Invalid character_id type: {type(char_id)}, setting to None")
                    else:
                        # Set default if missing
                        choice["character_id"] = None
                        
                    # Encode the text properly
                    if "text" in choice and isinstance(choice["text"], str):
                        try:
                            choice["text"] = choice["text"].encode('utf-8', errors='replace').decode('utf-8')
                        except Exception as e:
                            logger.error(f"Error encoding choice text: {str(e)}")
                            choice["text"] = "Choice option (encoding error)"
        else:
            story_data["choices"] = []
            
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
        story_context: Optional[str] = None,
        client: Optional[OpenAI] = None
    ) -> Dict[str, Any]:
        """Generate a new story with the given parameters."""
        if client:
            self.client = client

        final_conflict = custom_conflict or conflict
        final_setting = custom_setting or setting
        final_narrative = custom_narrative or narrative_style
        final_mood = custom_mood or mood
        
        # NEW: If no additional characters provided, pull a robust cast from our DB
        if additional_characters is None:
            additional_characters = get_random_characters(3)
            
        # Build the story prompt
        story_prompt = StoryPromptBuilder.build_story_prompt(
            conflict=final_conflict,
            setting=final_setting,
            narrative_style=final_narrative,
            mood=final_mood,
            character_info=character_info,
            additional_characters=additional_characters,
            protagonist_name=protagonist_name,
            protagonist_gender=protagonist_gender,
            story_context=story_context
        )
        
        # Get protagonist info for context
        protagonist = {
            "name": protagonist_name,
            "gender": protagonist_gender
        }
        
        # Generate initial story using stateless context manager
        story_data = self.context_manager.generate_initial_story(
            client=self.client,
            user_message=story_prompt,
            conflict=final_conflict,
            setting=final_setting,
            narrative_style=final_narrative,
            mood=final_mood,
            character_info=character_info
        )
        
        # Process and validate choices
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
    
    logger.info("=== generate_story function called ===")
    logger.debug(f"Story generation parameters: {json.dumps(kwargs, default=str, indent=2)}")
    
    story_data = generator.generate_story(**kwargs)
    
    # Extract narrative text from the correct location in the response
    stories = story_data.get("stories", {})
    narrative = stories.get("narrative_text") or stories.get("story") or story_data.get("narrative_text") or story_data.get("story") or ""
    
    # Flatten the response consistently
    flattened = {
        "narrative_text": narrative,
        "choices": stories.get("choices", []) or story_data.get("choices", [])
    }
    flattened.update({
        "conflict": story_data.get("conflict"),
        "setting": story_data.get("setting"),
        "narrative_style": story_data.get("narrative_style"),
        "mood": story_data.get("mood")
    })
    
    logger.debug(f"Final flattened story response: {json.dumps(flattened, indent=2)}")
    return flattened

# --- STORY_OPTIONS moved to the end of the file ---

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
        ("👽", "Dystopian Sci-Fi (e.g., George Orwell, Aldous Huxley)"),
        ("⚔️", "Epic Fantasy (e.g., J.R.R. Tolkien, George R.R. Martin)"),
        ("🎻", "Literary Drama (e.g., Fyodor Dostoevsky, Virginia Woolf)"),
        ("🧙", "Magical Adventure (e.g., J.K. Rowling, C.S. Lewis)"),
        ("🪐", "Cosmic Horror (e.g., H.P. Lovecraft, Clive Barker)"),
        ("🗺️", "Mythic Quest (e.g., Robert Jordan, Guy Gavriel Kay)"),
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
