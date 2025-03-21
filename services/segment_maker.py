"""
segment_maker.py - Story Continuation Service
========================================

This module handles story continuation after the initial story is created.
It uses the OpenAIContextManager to maintain conversation context and generate
coherent story continuations based on player choices.
"""

import os
import json
from typing import Dict, Any, List, Optional
from openai import OpenAI
from utils.context_manager import OpenAIContextManager
from utils.constants import MODEL_CONFIG
from datetime import datetime
from models.character_data import Character
from models.base import db
from sqlalchemy import func

class CharacterFormatter:
    """Handles character formatting for story prompts."""
    
    @staticmethod
    def format_character_info(character: Character) -> str:
        """Format a character's information for story prompts."""
        if not character:
            return ""
            
        traits_str = ', '.join(character.character_traits) if character.character_traits else 'None'
        
        return f"""
AVAILABLE CHARACTER FOR CHOICE:
Name: {character.character_name}
Role: {character.character_role}
ID: {character.id}  # CRITICAL: This ID must be included in the character_id field of the choice
Traits: {traits_str}
Backstory: {character.backstory or 'Unknown'}

CHARACTER USAGE REQUIREMENTS:
1. This character MUST be used in one of the choices as "Ask {character.character_name} for help" or similar
2. The choice MUST include the character's ID ({character.id}) in its character_id field
3. The character's ID must be preserved exactly as shown above
4. Do not modify or change the character's ID in any way
"""

    @staticmethod
    def get_random_character() -> Optional[Character]:
        """Get a random character suitable for story choices."""
        return Character.query.filter(
            Character.character_role.in_(['neutral', 'undetermined', 'mission-giver'])
        ).order_by(func.random()).first()

    @staticmethod
    def validate_character_choice(choice: Dict[str, Any], expected_character_id: Optional[int]) -> bool:
        """Validate a choice's character ID."""
        if not expected_character_id:
            return True
            
        choice_character_id = choice.get('character_id')
        return not (choice_character_id and str(choice_character_id) != str(expected_character_id))

class StoryPromptBuilder:
    """Handles building story prompts."""
    
    @staticmethod
    def build_protagonist_info(name: Optional[str] = None, gender: Optional[str] = None) -> str:
        """Build the protagonist information section."""
        if not name and not gender:
            return ""
            
        return f"""PROTAGONIST DETAILS:
Name: {name}
Gender: {gender}

PROTAGONIST INTEGRATION REQUIREMENTS:
1. Address the protagonist directly as "you" throughout the narrative
2. Make the protagonist's gender influence their interactions and experiences
3. Ensure the protagonist's name is used naturally in dialogue and descriptions
4. Mission information is provided to you, and you must use it to create a story that is consistent with the mission.
5. Make the protagonist's choices feel meaningful and impactful

PROTAGONIST PERSPECTIVE GUIDELINES:
1. Write in second person, addressing the player directly as "you"
2. The protagonist is a user of the game, and the story is about their adventures.
3. Create situations that challenge the protagonist's beliefs and values"""

    @staticmethod
    def build_style_info(mood: Optional[str] = None, narrative_style: Optional[str] = None) -> str:
        """Build the style information section."""
        if not mood and not narrative_style:
            return ""
            
        return f"""STYLE GUIDELINES:
Mood: {mood}
Narrative Style: {narrative_style}

NARRATIVE STYLE GUIDELINES: You are a master narrative generator for our choose your own adventure game.
1. Create LENGTHY, DETAILED story segments (at least 10000-15000 words) with rich descriptions
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
        return '''
{
    "story": "Continuation narrative text",
    "choices": [
        {
            "choice_id": "unique_choice_id",  # REQUIRED: Unique identifier for this choice
            "text": "Choice description",
            "consequence": "Brief outcome description",
            "type": "direct/risky/social",
            "currency_requirements": {
                "💎": 10
            },
            "requirements": {},
            "character_id": null  # REQUIRED: ID of the character involved in this choice, or null if none
        }
    ],
    "mission_update": {
        "status": "unchanged/progressed/completed/failed",
        "progress_details": "How the mission has advanced"
    }
}'''

class StoryContinuationHandler:
    """Handles story continuation generation and validation."""
    
    def __init__(self, context_manager: Optional[OpenAIContextManager] = None):
        self.context_manager = context_manager or OpenAIContextManager()
        self.client = get_openai_client()
    
    def validate_response(self, story_data: Dict[str, Any], random_character: Optional[Character] = None) -> Dict[str, Any]:
        """Validate and process the story response."""
        # Process choices
        for i, choice in enumerate(story_data['choices']):
            if 'choice_id' not in choice:
                choice['choice_id'] = f"choice_{i}_{datetime.utcnow().timestamp()}"
            if 'character_id' not in choice:
                choice['character_id'] = None
                
        # Create final story data structure matching story_maker.py
        return {
            "stories": {
                "story": story_data["story"],
                "choices": story_data["choices"],
                "mission_update": story_data["mission_update"]
            },
            "choices": story_data["choices"]  # Also expose choices at root level for easier access
        }
    
    def build_continuation_prompt(
        self,
        previous_story: str,
        chosen_choice: str,
        mission_info: Dict[str, Any],
        random_character: Optional[Character] = None,
        story_context: Optional[str] = None
    ) -> str:
        """Build the continuation prompt."""
        random_char_name = random_character.character_name if random_character else 'a previously introduced character'
        
        return f"""Continue the story based on:

PREVIOUS EVENTS:
{previous_story[:500]}...

PLAYER'S CHOICE:
{chosen_choice}

CURRENT MISSION:
Title: {mission_info.get('title', 'Unknown')}
Objective: {mission_info.get('objective', 'Unknown')}
Current Status: {mission_info.get('status', 'In Progress')}

{CharacterFormatter.format_character_info(random_character) if random_character else ''}

{f'STORY CONTEXT:\n{story_context}\n' if story_context else ''}

STORY REQUIREMENTS:
1. Create a compelling continuation of 15000-18000 words that builds upon the player's choice
2. Show immediate consequences of their decision
3. Advance the mission in some way (progress, setback, or complication)
4. Create three distinct choices for how to proceed:
   - One that advances the mission directly
   - One that takes a risky approach, involving gunplay or car chases
   - One that involves asking {random_char_name} for help (MUST include character_id: {random_character.id if random_character else 'null'})
5. Maintain narrative consistency with previous events
6. Include rich descriptions of guns and cars and atmospheric details, but not of characters or their look or clothing
7. Show character development through actions and dialogue
8. Create unexpected twists or revelations
9. Balance action, dialogue, and intrigue
10. Avoid repeating previous scenarios or story beats
11. Create escalating stakes and tension
12. Ensure all character interactions reflect their traits and relationships
13. Make dialogue choices impact the story's direction
14. Show how the protagonist's choices affect other characters
15. Keep the mission-giver and villain roles consistent with their previous appearances

Your response MUST be valid JSON with this structure:
{StoryPromptBuilder.get_json_structure()}"""

    def generate_continuation(
        self,
        previous_story: str,
        chosen_choice: str,
        mission_info: Dict[str, Any],
        mood: Optional[str] = None,
        narrative_style: Optional[str] = None,
        protagonist_name: Optional[str] = None,
        protagonist_gender: Optional[str] = None,
        story_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a story continuation based on the player's choice."""
        # Get a random character for choices
        random_character = CharacterFormatter.get_random_character()
        
        # Initialize context manager if needed
        if not self.context_manager:
            self.context_manager = OpenAIContextManager()
            self.context_manager.add_system_message(_build_system_message(
                mood=mood,
                narrative_style=narrative_style,
                protagonist_name=protagonist_name,
                protagonist_gender=protagonist_gender
            ))
        
        # Build and add the continuation prompt
        continuation_prompt = self.build_continuation_prompt(
            previous_story=previous_story,
            chosen_choice=chosen_choice,
            mission_info=mission_info,
            random_character=random_character,
            story_context=story_context
        )
        self.context_manager.add_user_message(continuation_prompt)
        
        # Get the response
        response = self.context_manager.process_function_calling(
            client=self.client,
            model=MODEL_CONFIG["model"],
            temperature=MODEL_CONFIG["temperature"]
        )
        
        # Parse and validate the response
        story_data = json.loads(response.choices[0].message.content)
        return self.validate_response(story_data, random_character)

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
    story_context: Optional[str] = None
) -> Dict[str, Any]:
    """Generate a story continuation of 8000-11000 words based on the player's choice."""
    handler = StoryContinuationHandler(context_manager)
    return handler.generate_continuation(
        previous_story=previous_story,
        chosen_choice=chosen_choice,
        mission_info=mission_info,
        mood=mood,
        narrative_style=narrative_style,
        protagonist_name=protagonist_name,
        protagonist_gender=protagonist_gender,
        story_context=story_context
    ) 