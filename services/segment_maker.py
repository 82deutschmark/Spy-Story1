"""
segment_maker.py - Story Continuation Service
========================================

This module handles story continuation after the initial story is created.
It uses the OpenAIContextManager to maintain conversation context and generate
coherent story continuations based on player choices.
"""

import os
import json
import random  # Added import for random
from typing import Dict, Any, List, Optional
from openai import OpenAI
from utils.context_manager import OpenAIContextManager
from utils.constants import MODEL_CONFIG
from datetime import datetime
from models.character_data import Character
from models.base import db
from sqlalchemy import func
import logging
from utils.character_manager import extract_character_traits, extract_character_name, extract_character_role, extract_character_backstory, extract_character_plot_lines, format_character_info, get_random_characters  # NEW import

logging.basicConfig(level=logging.INFO)
logging.getLogger("httpx").setLevel(logging.DEBUG)
# Configure module logger
logger = logging.getLogger(__name__)

SEGMENT_WORD_COUNT_RANGE = "500-800"  # NEW constant for segment word count range

def build_additional_characters_prompt(additional_characters: Optional[List[Dict[str, Any]]] = None) -> str:
    """Build the prompt section for additional characters."""
    if not additional_characters:
        return ""

    prompt_parts = ["\nSECONDARY NPC CHARACTERS - INCORPORATE AT LEAST ONE INTO THE NARRATIVE:\n"]
    
    for char in additional_characters:
        # Use central module functions for extraction
        char_traits = extract_character_traits(char)
        if isinstance(char_traits, str):
            char_traits = [char_traits]
        char_name = extract_character_name(char)
        char_role = extract_character_role(char)
        role_requirements = char.get("role_requirements", "")
        traits_str = ", ".join(char_traits) if char_traits else "No specified traits"
        # Retrieve backstory and plot_lines using central module functions
        backstory = extract_character_backstory(char) or "No backstory provided"
        plot_lines = extract_character_plot_lines(char)
        plot_lines_str = ", ".join(plot_lines) if plot_lines else "No plot lines provided"
        
        char_parts = [
            f"- Name: {char_name}",
            f"  Role: {char_role}",
            f"  Role Requirements: {role_requirements}",
            f"  Traits: {traits_str}",
            f"  Backstory: {backstory}",
            f"  Plot Lines: {plot_lines_str}",
            "  Suggested Usage: Include in a meaningful choice for the player character",
            "  Important: This character should introduce one of their plot_lines into the story"
        ]
        prompt_parts.extend(char_parts)

    return "\n".join(prompt_parts)

class StoryPromptBuilder:
    """Handles building story prompts."""
    
    # Modified to include protagonist_level
    @staticmethod
    def build_protagonist_info(name: Optional[str] = None, gender: Optional[str] = None, level: Optional[int] = None) -> str:
        """Build the protagonist information section."""
        if not name and not gender and not level:
            return ""
        info_lines = [
            "PROTAGONIST DETAILS:",
            f"Name: {name}" if name else "",
            f"Gender: {gender}" if gender else ""
        ]
        if level is not None:
            info_lines.append(f"Experience Level: {level}")
        return "\n".join(filter(None, info_lines))

    @staticmethod
    def build_style_info(mood: Optional[str] = None, narrative_style: Optional[str] = None) -> str:
        """Build the style information section."""
        if not mood and not narrative_style:
            return ""
            
        return f"""STYLE GUIDELINES:
Mood: {mood}
Narrative Style: {narrative_style}

NARRATIVE STYLE GUIDELINES: You are a master narrative generator for our choose your own adventure game.
1. Create LENGTHY, DETAILED story segments (at least 500-1500 words) with rich descriptions
2. Use vivid sensory details, atmospheric descriptions, and character development
3. Each segment should advance the plot significantly with unexpected twists or revelations
4. Include multiple scenes within each story segment when appropriate
5. Incorporate dynamic character interactions with dialogue that reveals backstory and plot_lines 
6. Balance action, dialogue, intrigue, and character development
7. Never repeat the same scenarios, settings, or dialogue patterns
8. Create a sense of escalating stakes and tension throughout the narrative
9. Show character development through actions and dialogue"""

    @staticmethod
    def get_json_structure() -> str:
        """Get the expected JSON response structure."""
        # Use raw string to avoid backslash issues
        return r'''{
    "narrative_text": "Continuation narrative text",
    "choices": [
        {
            "choice_id": "unique_choice_id",
            "text": "Choice description",
            "consequence": "Brief outcome description",
            "type": "direct/risky/social",
            "currency_requirements": {
                "💎": 10
            },
            "requirements": {},
            "character_id": null
        }
    ],
    "mission_update": {
        "status": "unchanged/progressed/completed/failed",
        "progress_details": "How the mission has advanced"
    }
}'''
    
    @staticmethod
    def build_story_requirements(word_count_range: str, help_instruction: str) -> List[str]:
        """Build the story requirements instructions with a custom help option."""
        requirements = [
            f"1. Create a compelling continuation of {word_count_range} words that builds upon the player's choice",
            "2. Show immediate consequences of their decision",
            "3. Advance the mission in some way (progress, setback, or complication)",
            "4. Create three distinct choices for how to proceed:",
            "   - One that advances the mission directly",
            "   - One that takes a risky approach, involving gunplay or car chases",
            help_instruction,  # custom help instruction supplied by caller
            "5. Maintain narrative consistency with previous events",
            "6. Include rich descriptions of guns and cars and atmospheric details",
            "7. Show character development through actions and dialogue",
            "8. Create unexpected twists or revelations",
            "9. Balance action, dialogue, and intrigue",
            "10. Avoid repeating previous scenarios or story beats",
            "11. Create escalating stakes and tension",
            "12. Ensure all character interactions reflect their traits and relationships",
            "13. Make dialogue choices impact the story's direction",
            "14. Show how the protagonist's choices affect other characters",
            "15. Keep the mission-giver and villain roles consistent with their previous appearances",
            "16. Use each provided NPC exactly as given: their traits, backstory, and plot lines must remain unaltered.",
            "17. Do not invent or modify character roles; all NPCs must fulfill their stated integration requirements.",
            "18. NEVER reference choice IDs (like 'choice_1') in the narrative text - describe the choice's outcome naturally",
            "19. Use only the characters provided in the prompts. DO NOT invent any new characters.",
            "20. All provided NPC details (traits, backstory, plot lines) must remain unaltered."
        ]
        return requirements

    @staticmethod
    def build_system_message(mood: str, narrative_style: str) -> Dict[str, str]:
        """Build a dedicated system message for story continuation."""
        message_parts = [
            "You are a master narrative generator for our spy thriller adventure game.",
            f"Create highly detailed, layered narratives in a {mood} tone with a {narrative_style} storytelling style.",
            "",
            "This game is set in the high-stakes world of espionage, luxury, and international intrigue.",
            "Follow these instructions exactly:",
            "",
            "1. Generate a narrative continuation that is engaging and coherent based on the player's choice.",
            "2. Your output MUST be valid JSON with exactly the following keys:",
            "   - narrative_text: A string containing the full narrative segment. (This is the key you MUST use)",
            "   - choices: An array of exactly three choice objects. Each choice object MUST include:",
            "         * choice_id: A unique identifier for the choice.",
            "         * text: The choice description.",
            "         * consequence: A brief description of the outcome if chosen.",
            "         * type: One of 'direct', 'risky', or 'social'.",
            "         * requirements: An object for any additional requirements (or empty).",
            "         * character_id: The ID of the NPC involved in the choice (must be a numeric ID, not a name)",
            "   - mission_update: An object with keys:",
            "         * status: One of 'unchanged', 'progressed', 'completed', or 'failed'.",
            "         * progress_details: A string detailing mission progress.",
            "",
            "3. Do not include any keys besides these three in your response.",
            "",
            "CRITICAL CHARACTER ROLE REQUIREMENTS:",
            "1. Use only the characters provided in the character prompts. Do not invent any new characters.",
            "2. The protagonist should not have a character_id in choices.",
            "3. Only include character_id for NPCs involved in the choice, and always use their numeric ID value, not their name.",
            "4. Respect character roles: mission-givers give missions, villains oppose the player, etc.",
            "5. Maintain character traits, backstories, and plot lines exactly as provided.",
            "",
            "NARRATIVE STYLE REQUIREMENTS:",
            "1. Tell the story in second person, addressing the player directly.",
            "2. Use vivid sensory details and atmospheric descriptions.",
            "3. Balance action, dialogue, intrigue, and character development.",
            "4. Create meaningful consequences for player choices.",
            "5. Advance the mission in some way (progress, setback, or complication).",
            "",
            "Please produce only the JSON response as specified above."
        ]
        
        return {
            "role": "system", 
            "content": "\n".join(message_parts)
        }

class StoryContinuationHandler:
    """Handles story continuation generation and validation."""
    
    def __init__(self, client, context_manager):
        """Initialize with a stateless context manager."""
        self.context_manager = context_manager
        self.client = client
    
    def validate_response(self, story_data: Dict[str, Any], random_character: Optional[Character] = None) -> Dict[str, Any]:
        """Validate and process the story response."""
        # Process choices: ensure each choice has a unique id and character_id is set to None if not needed.
        for i, choice in enumerate(story_data['choices']):
            if 'choice_id' not in choice:
                choice['choice_id'] = f"choice_{i}_{datetime.utcnow().timestamp()}"
                
            # Ensure character_id is properly formatted: either None or an integer
            if 'character_id' not in choice:
                choice['character_id'] = None
            elif choice['character_id'] is not None:
                # If it's a string but not a digit, try to find the character by name
                if isinstance(choice['character_id'], str) and not choice['character_id'].isdigit():
                    # Look up by name
                    char_name = choice['character_id']
                    char = Character.query.filter_by(character_name=char_name).first()
                    if char:
                        choice['character_id'] = char.id
                    else:
                        choice['character_id'] = None
                # If it's a digit string, convert to int
                elif isinstance(choice['character_id'], str) and choice['character_id'].isdigit():
                    choice['character_id'] = int(choice['character_id'])
                # If it's not an int at this point, set to None
                elif not isinstance(choice['character_id'], int):
                    choice['character_id'] = None
                
            # Clean up any character IDs from choice text
            if 'text' in choice:
                import re
                # Remove character IDs from choice text
                choice['text'] = re.sub(r'\(character_id:\s*\d+\)', '', choice['text'])
                # Clean up any double spaces or awkward punctuation
                choice['text'] = re.sub(r'\s+', ' ', choice['text'])
                choice['text'] = re.sub(r'\s*([.,!?])\s*', r'\1 ', choice['text'])
                
        # Clean up any embedded raw IDs from narrative_text using regex cleanup
        import re
        
        # Handle different key names for the story/narrative text
        story_text = ""
        if "narrative_text" in story_data:
            story_text = story_data["narrative_text"]
        elif "story" in story_data:
            story_text = story_data["story"]
        else:
            # If neither key exists, log error and return empty narrative
            logger.error(f"Neither 'story' nor 'narrative_text' key found in response: {story_data.keys()}")
            story_text = "Error: Story generation failed. Please try again."
            
        # Remove character IDs
        clean_text = re.sub(r'\(character_id:\s*\d+\)', '', story_text)
        # Remove choice IDs
        clean_text = re.sub(r'choice_\d+', '', clean_text)
        # Clean up any double spaces or awkward punctuation that might result
        clean_text = re.sub(r'\s+', ' ', clean_text)
        clean_text = re.sub(r'\s*([.,!?])\s*', r'\1 ', clean_text)
        
        # Return a flattened structure: only narrative_text, choices, and mission_update
        return {
            "narrative_text": clean_text,
            "choices": story_data["choices"],
            "mission_update": story_data.get("mission_update", {})
        }

    def _build_prompt(
        self,
        chosen_choice: str,
        mission_info: Dict[str, Any],
        help_instruction: str,
        story_context: Optional[str] = "",
        existing_characters: Optional[List[Dict[str, Any]]] = None,
        narrative_history: Optional[str] = None  # NEW parameter for narrative history
    ) -> str:
        """Build a consolidated prompt for story continuation."""
        prompt_parts = [
            "Continue the story based on the following details:",
            "",
            "PLAYER'S CHOICE:",
            chosen_choice,
            ""
        ]
        
        # NEW: Add narrative history if available to provide context for continuity
        if narrative_history:
            prompt_parts.extend([
                "PREVIOUS EVENTS:",
                narrative_history,
                ""
            ])
            logger.info("Added narrative history to prompt")
            
        prompt_parts.extend([
            "CURRENT MISSION:",
            f"Title: {mission_info.get('title', 'Unknown')}",
            f"Objective: {mission_info.get('objective', 'Unknown')}",
            f"Current Status: {mission_info.get('status', 'In Progress')}",
            f"Progress: {mission_info.get('progress', 0)}%"
        ])
        
        # Add character details if available - use the build_additional_characters_prompt function
        if existing_characters:
            character_prompt = build_additional_characters_prompt(existing_characters)
            if character_prompt:
                prompt_parts.extend(["", "EXISTING CHARACTERS IN STORY:", character_prompt])
        
        if story_context:
            prompt_parts.extend(["", f"STORY CONTEXT:\n{story_context}"])
        
        prompt_parts.extend([
            "",
            "STORY REQUIREMENTS:",
            *StoryPromptBuilder.build_story_requirements(SEGMENT_WORD_COUNT_RANGE, help_instruction),
            "",
            "Your response MUST be valid JSON with this structure:",
            StoryPromptBuilder.get_json_structure()
        ])
        return "\n".join(prompt_parts)

    def generate_continuation(
        self,
        previous_story: str,
        chosen_choice: str,
        mission_info: Dict[str, Any],
        mood: Optional[str] = None,
        narrative_style: Optional[str] = None,
        protagonist_name: Optional[str] = None,
        protagonist_gender: Optional[str] = None,
        protagonist_level: Optional[int] = None,
        conflict: Optional[str] = None,
        setting: Optional[str] = None,
        story_context: Optional[str] = None,
        existing_characters: Optional[List[Dict[str, Any]]] = None,
        node_count: int = 1,
        narrative_history: Optional[str] = None,
        enhanced_context: Optional[str] = None  # NEW: Add enhanced_context parameter
    ) -> Dict[str, Any]:
        """Generate a story continuation based on the player's choice."""
        logger.info("=== StoryContinuationHandler.generate_continuation called ===")
        logger.debug(f"Received node_count: {node_count}")
        logger.debug(f"Received parameters: conflict={conflict}, setting={setting}, mood={mood}, narrative_style={narrative_style}")
        logger.debug(f"Previous story length: {len(previous_story) if previous_story else 0} chars")
        logger.debug(f"Has narrative history: {bool(narrative_history)}")  # NEW: Log presence of narrative history
        
        # Get random characters to use for assistance choices
        existing_ids = {char.get("id") for char in existing_characters} if existing_characters else set()
        fresh_chars = get_random_characters(3)
        fresh_candidates = [char for char in fresh_chars if char.id not in existing_ids and char.character_role.lower() != "villain"]
        random_characters = fresh_candidates if fresh_candidates else [char for char in fresh_chars if char.character_role.lower() != "villain"]
        selected_random = random.choice(random_characters) if random_characters else None
        available_npc_names = ", ".join([char.character_name for char in random_characters]) if random_characters else "None"
        
        # Ensure selected_random.id is an integer
        char_id = selected_random.id if selected_random else 'null'
        if isinstance(char_id, str) and char_id.isdigit():
            char_id = int(char_id)
            
        # Modified help instruction to be clearer about character_id format
        help_instruction = (f"   - One that involves asking {selected_random.character_name if selected_random else 'a previously introduced character'} " +
                           f"for help (make sure the choice includes character_id field set to numeric value {char_id} and not the character name)")
        
        # Build story context 
        context_additions = []
        context_additions.append(f"AVAILABLE NPC CHOICES for assistance: {available_npc_names}")
        if story_context:
            context_additions.append(f"STORY CONTEXT:\n{story_context}")
        
        # Format existing characters for the context manager
        formatted_characters = []
        if existing_characters:
            for char in existing_characters:
                formatted_char = {
                    "id": char.get("id"),
                    "name": char.get("character_name") or char.get("name", "Unknown"),
                    "character_role": char.get("character_role") or char.get("role", "neutral"),
                    "character_traits": char.get("character_traits", {}),
                    "backstory": char.get("backstory", ""),
                    "plot_lines": char.get("plot_lines", []),
                    "description": char.get("description", "")
                }
                formatted_characters.append(formatted_char)
                
        # Extract story parameters if available
        story_params = {}
        if existing_characters and existing_characters[0].get("story_parameters"):
            params = existing_characters[0]["story_parameters"]
            conflict = conflict or params.get("conflict")
            setting = setting or params.get("setting")
            mood = mood or params.get("mood")
            narrative_style = narrative_style or params.get("narrative_style")
        
        # Ensure we have required parameters
        if not all([conflict, setting, mood, narrative_style]):
            raise ValueError("Missing required story parameters")
        
        # Build prompt with narrative history for better continuity
        prompt = self._build_prompt(
            chosen_choice=chosen_choice,
            mission_info=mission_info,
            help_instruction=help_instruction,
            story_context="\n".join(context_additions),
            existing_characters=formatted_characters,
            narrative_history=narrative_history  # NEW: Pass narrative history to prompt builder
        )
        
        logger.info("=== Calling OpenAIContextManager.generate_continuation ===")
        logger.info(f"Passing parameters to OpenAIContextManager: conflict={conflict}, setting={setting}, mood={mood}, narrative_style={narrative_style}, node_count={node_count}")
        logger.debug(f"Character count: {len(formatted_characters)}")
        
        # Generate story continuation using the stateless context manager
        story_data = self.context_manager.generate_continuation(
            client=self.client,
            user_message=prompt,
            conflict=conflict,
            setting=setting, 
            narrative_style=narrative_style,
            mood=mood,
            node_count=node_count,
            mission_info=mission_info,
            character_info=formatted_characters,
            enhanced_context=enhanced_context  # NEW: Pass enhanced context
        )
        
        logger.info("=== Received response from OpenAIContextManager ===")
        logger.debug(f"Response story length: {len(story_data.get('narrative_text', '')) if story_data else 0} chars")
        logger.debug(f"Response choices count: {len(story_data.get('choices', [])) if story_data else 0}")
        
        validated_data = self.validate_response(story_data, selected_random)
        logger.info("=== Returning validated response ===")
        
        return validated_data

def get_openai_client():
    """Get an OpenAI client with the current API key."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API key is required for story generation")
    return OpenAI(api_key=api_key)

def validate_mission_info(mission_info: Dict[str, Any]) -> bool:
    """Validate the mission info structure."""
    required_fields = ['title', 'objective', 'status']
    return all(field in mission_info for field in required_fields)

def _build_system_message(mood: str = None, narrative_style: str = None, protagonist_name: Optional[str] = None, protagonist_gender: Optional[str] = None) -> str:
    """Build the system message for story continuation using the unified system message."""
    return StoryPromptBuilder.build_system_message(mood or "default mood", narrative_style or "default narrative style")["content"]

def generate_continuation(
    previous_story: str,
    chosen_choice: str,
    mission_info: Dict[str, Any],
    mood: Optional[str] = None,
    narrative_style: Optional[str] = None,
    protagonist_name: Optional[str] = None,
    protagonist_gender: Optional[str] = None,
    protagonist_level: Optional[int] = None,
    conflict: Optional[str] = None,
    setting: Optional[str] = None,
    story_context: Optional[str] = None,
    existing_characters: Optional[List[Dict[str, Any]]] = None,
    node_count: int = 1,
    narrative_history: Optional[str] = None,
    enhanced_context: Optional[str] = None  # NEW: Add enhanced_context parameter
) -> Dict[str, Any]:
    """Generate a story continuation based on the player's choice."""
    logger.info("=== generate_continuation function called ===")
    logger.info(f"Core parameters:")
    logger.info(f"  conflict: {conflict}")
    logger.info(f"  setting: {setting}")
    logger.info(f"  mood: {mood}")
    logger.info(f"  narrative_style: {narrative_style}")
    logger.info(f"  node_count: {node_count}")
    
    logger.debug(f"Parameters:")
    logger.debug(f"  chosen_choice: {chosen_choice}")
    logger.debug(f"  protagonist_name: {protagonist_name}")
    logger.debug(f"  protagonist_gender: {protagonist_gender}")
    logger.debug(f"  protagonist_level: {protagonist_level}")
    logger.debug(f"  story_context length: {len(story_context) if story_context else 0} chars")
    logger.debug(f"  mission_info: {json.dumps(mission_info, indent=2)}")
    logger.debug(f"  has narrative history: {bool(narrative_history)}")  # NEW: Log if narrative history exists
    
    if existing_characters:
        char_info_list = [
            {
                'id': char.get('id'),
                'name': char.get('character_name') or char.get('name', 'Unknown'),
                'role': char.get('character_role') or char.get('role', 'neutral')
            } for char in existing_characters
        ]
        logger.debug(f"  existing_characters: {json.dumps(char_info_list, indent=2)}")
    
    logger.info("Creating StoryContinuationHandler (stateless)")
    context_manager = OpenAIContextManager()
    client = get_openai_client()
    
    # Ensure we have a valid client
    if not client:
        raise RuntimeError("Failed to initialize OpenAI client")
        
    # Leverage our handler class for continuation generation
    handler = StoryContinuationHandler(client, context_manager)
    
    # Generate continuation with all available parameters
    return handler.generate_continuation(
        previous_story=previous_story,
        chosen_choice=chosen_choice,
        mission_info=mission_info,
        mood=mood,
        narrative_style=narrative_style,
        protagonist_name=protagonist_name,
        protagonist_gender=protagonist_gender,
        protagonist_level=protagonist_level,
        conflict=conflict,
        setting=setting,
        story_context=story_context,
        existing_characters=existing_characters,
        node_count=node_count,
        narrative_history=narrative_history,
        enhanced_context=enhanced_context  # NEW: Pass enhanced_context
    )