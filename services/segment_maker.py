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

SEGMENT_WORD_COUNT_RANGE = "800-1000"  # NEW constant for segment word count range

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
            "  Important: This character should introduce one of thier plot_lines into the story"
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
1. Create LENGTHY, DETAILED story segments (at least 1000-1500 words) with rich descriptions
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
    "story": "Continuation narrative text",
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
            # --- Added integration requirements to match story_maker ---
            "16. Use each provided NPC exactly as given: their traits, backstory, and plot lines must remain unaltered.",
            "17. Do not invent or modify character roles; all NPCs must fulfill their stated integration requirements."
        ]
        return requirements

class StoryContinuationHandler:
    """Handles story continuation generation and validation."""
    
    def __init__(self, context_manager: Optional[OpenAIContextManager] = None):
        self.context_manager = context_manager or OpenAIContextManager()
        self.client = get_openai_client()
    
    def validate_response(self, story_data: Dict[str, Any], random_character: Optional[Character] = None) -> Dict[str, Any]:
        """Validate and process the story response."""
        # Process choices: ensure each choice has a unique id and character_id is set to None if not needed.
        for i, choice in enumerate(story_data['choices']):
            if 'choice_id' not in choice:
                choice['choice_id'] = f"choice_{i}_{datetime.utcnow().timestamp()}"
            if 'character_id' not in choice:
                choice['character_id'] = None
        # NEW: Remove any embedded raw IDs from narrative_text using a regex cleanup.
        import re
        clean_text = re.sub(r'\(character_id:\s*\d+\)', '', story_data["story"])
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
        story_context: Optional[str] = ""
    ) -> str:
        """Build a consolidated prompt for story continuation."""
        prompt_parts = [
            "Continue the story based on the following details:",
            "",
            "PLAYER'S CHOICE:",
            chosen_choice,
            "",
            "CURRENT MISSION:",
            f"Title: {mission_info.get('title', 'Unknown')}",
            f"Objective: {mission_info.get('objective', 'Unknown')}",
            f"Current Status: {mission_info.get('status', 'In Progress')}"
        ]
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
        story_context: Optional[str] = None,
        existing_characters: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Generate a story continuation based on the player's choice."""
        existing_ids = {char.get("id") for char in existing_characters} if existing_characters else set()
        fresh_chars = get_random_characters(3)
        fresh_candidates = [char for char in fresh_chars if char.id not in existing_ids]
        random_characters = fresh_candidates if fresh_candidates else fresh_chars
        selected_random = random.choice(random_characters) if random_characters else None
        available_npc_names = ", ".join([char.character_name for char in random_characters]) if random_characters else "None"
        
        if not self.context_manager:
            system_message = "\n".join([
                "You are a master narrative generator for our choose your own adventure game.",
                "You excel at continuing stories based on player choices, maintaining narrative consistency while introducing fresh developments and unexpected twists.",
                StoryPromptBuilder.build_protagonist_info(protagonist_name, protagonist_gender, protagonist_level),
                StoryPromptBuilder.build_style_info(mood, narrative_style),
                "Your response MUST be valid JSON with this structure:",
                StoryPromptBuilder.get_json_structure()
            ])
            self.context_manager = OpenAIContextManager(system_message)
        
        help_instruction = f"   - One that involves asking {selected_random.character_name if selected_random else 'a previously introduced character'} for help (MUST include character_id: {selected_random.id if selected_random else 'null'})"
        extra = f"AVAILABLE NPC CHOICES for assistance: {available_npc_names}\n"
        if story_context:
            extra += f"STORY CONTEXT:\n{story_context}\n"
        
        base_prompt = self._build_prompt(chosen_choice, mission_info, help_instruction, extra)
        self.context_manager.add_user_message(base_prompt)
        response = self.context_manager.process_function_calling(
            client=self.client,
            model=MODEL_CONFIG["model"],
            temperature=MODEL_CONFIG["temperature"]
        )
        story_data = json.loads(response.choices[0].message.content)
        return self.validate_response(story_data, selected_random)

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
    """Build the system message for story continuation."""
    return f"""You are a master narrative generator for our choose your own adventure game.
You excel at continuing stories based on player choices, maintaining narrative
consistency while introducing fresh developments and unexpected twists.

{StoryPromptBuilder.build_protagonist_info(protagonist_name, protagonist_gender)}

{StoryPromptBuilder.build_style_info(mood, narrative_style)}

Your response MUST be valid JSON with this structure:
{StoryPromptBuilder.get_json_structure()}"""

def generate_continuation(
    previous_story: str,
    chosen_choice: str,
    mission_info: Dict[str, Any],
    context_manager: Optional[OpenAIContextManager] = None,
    mood: Optional[str] = None,
    narrative_style: Optional[str] = None,
    protagonist_name: Optional[str] = None,
    protagonist_gender: Optional[str] = None,
    protagonist_level: Optional[int] = None,
    story_context: Optional[str] = None,
    existing_characters: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    handler = StoryContinuationHandler(context_manager)
    return handler.generate_continuation(
        previous_story,
        chosen_choice,
        mission_info,
        mood,
        narrative_style,
        protagonist_name,
        protagonist_gender,
        protagonist_level,
        story_context,
        existing_characters
    )