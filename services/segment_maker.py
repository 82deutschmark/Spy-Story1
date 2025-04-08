"""
segment_maker.py - Story Continuation Service
========================================

DEPRECATED: This module is deprecated and will be removed in future versions.
All functionality has been migrated to utils/context_manager.py and utils/narrative_analyzer.py.
Please update your imports to use those modules instead.

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
from utils.story_context_rules import StoryContext, StoryContextRules
import warnings

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
    def build_protagonist_info(name: Optional[str] = None, gender: Optional[str] = None) -> str:
        """Build the protagonist information section."""
        if not name and not gender:
            return ""
        info_lines = [
            "PROTAGONIST DETAILS:",
            f"Name: {name}" if name else "",
            f"Gender: {gender}" if gender else ""
        ]
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
    def build_story_context(
        conflict: str,
        setting: str,
        mission_info: Optional[Dict[str, Any]] = None,
        character_info: Optional[Dict[str, Any]] = None,
        narrative_history: Optional[str] = None,
        node_count: int = 1,
        previous_choices: Optional[List[str]] = None,
        character_interactions: Optional[Dict[str, List[str]]] = None
    ) -> str:
        """Build the story context for story generation."""
        # Create a StoryContext object with all available information
        context = StoryContext(
            conflict=conflict,
            setting=setting,
            mission_info=mission_info or {},
            character_info=character_info or [],
            narrative_history=narrative_history,
            node_count=node_count,
            previous_choices=previous_choices,
            character_interactions=character_interactions
        )
        
        # Build all context rules
        continuity_rules = StoryContextRules.build_continuity_rules(context)
        character_rules = StoryContextRules.build_character_rules(context.character_info)
        mission_rules = StoryContextRules.build_mission_rules(context.mission_info)
        
        # Combine all rules into a comprehensive context
        context_parts = [
            "STORY CONTEXT AND RULES:",
            "",
            continuity_rules,
            "",
            character_rules,
            "",
            mission_rules,
            "",
            "NARRATIVE HISTORY:",
            narrative_history if narrative_history else "No previous narrative history available."
        ]
        
        return "\n".join(context_parts)

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
            "CRITICAL REQUIREMENTS:",
            "1. Maintain strict continuity with previous events and choices",
            "2. Show clear consequences of player choices on the mission",
            "3. Keep character behavior and relationships consistent",
            "4. Reference past interactions and events when relevant",
            "5. Show how choices affect both immediate and long-term outcomes",
            "6. Maintain escalating stakes and tension",
            "7. Balance action, dialogue, and character development",
            "8. Create meaningful choices that advance the story",
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
    
    def _extract_character_interactions(self, narrative_text: str, characters: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Extract character interactions from narrative text."""
        interactions = {}
        
        # Create a mapping of character names to their full info
        char_map = {char.get('name', '').lower(): char for char in characters}
        
        # Split narrative into sentences
        sentences = narrative_text.split('.')
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Check each character
            for char_name, char_info in char_map.items():
                if char_name in sentence.lower():
                    if char_name not in interactions:
                        interactions[char_name] = []
                    interactions[char_name].append(sentence)
                    
        return interactions
    
    def _extract_previous_choices(self, narrative_text: str) -> List[str]:
        """Extract previous choices from narrative text."""
        choices = []
        
        # Look for choice-related phrases
        choice_indicators = [
            "you chose to",
            "you decided to",
            "you opted to",
            "you selected",
            "you picked",
            "you went with"
        ]
        
        sentences = narrative_text.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            for indicator in choice_indicators:
                if indicator in sentence.lower():
                    # Clean up the choice text
                    choice = sentence.lower().replace(indicator, '').strip()
                    if choice:
                        choices.append(choice)
                        
        return choices

    def _process_mission_update(self, mission_update: Dict[str, Any], mission: Any) -> Dict[str, Any]:
        """Process and validate mission updates from the story continuation."""
        if not mission_update:
            return {"status": "unchanged", "progress_details": "No mission progress in this segment"}
            
        status = mission_update.get('status', 'unchanged')
        progress_details = mission_update.get('progress_details', '')
        
        # Validate status
        valid_statuses = ['unchanged', 'progressed', 'completed', 'failed']
        if status not in valid_statuses:
            status = 'unchanged'
            
        # Calculate progress change based on status
        progress_change = 0
        if status == 'progressed':
            progress_change = 25  # Significant progress
        elif status == 'completed':
            progress_change = 100 - (mission.progress if mission else 0)  # Complete the mission
        elif status == 'failed':
            progress_change = -50  # Major setback
            
        # Update mission progress if needed
        if progress_change != 0:
            current_progress = (mission.progress if mission else 0)
            new_progress = max(0, min(100, current_progress + progress_change))
            
            # If mission is a model instance, use its update_progress method
            if hasattr(mission, 'update_progress'):
                mission.update_progress(new_progress, progress_details)
            else:
                # If it's a dictionary, update it directly
                mission['progress'] = new_progress
                if 'progress_updates' not in mission:
                    mission['progress_updates'] = []
                mission['progress_updates'].append({
                    'progress': new_progress,
                    'timestamp': datetime.utcnow().isoformat(),
                    'description': progress_details
                })
            
            # Update mission status if completed or failed
            if status in ['completed', 'failed']:
                if hasattr(mission, 'status'):
                    mission.status = status
                    if status == 'completed':
                        mission.completed_at = datetime.utcnow()
                else:
                    mission['status'] = status
                    if status == 'completed':
                        mission['completed_at'] = datetime.utcnow().isoformat()
                    
        return {
            "status": status,
            "progress_details": progress_details,
            "progress_change": progress_change,
            "new_progress": (mission.progress if mission else 0)
        }

    def validate_response(self, story_data: Dict[str, Any], mission: Any, random_character: Optional[Character] = None) -> Dict[str, Any]:
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
        
        # Process mission update
        mission_update = self._process_mission_update(story_data.get("mission_update", {}), mission)
        
        # Return a flattened structure: only narrative_text, choices, and mission_update
        return {
            "narrative_text": clean_text,
            "choices": story_data["choices"],
            "mission_update": mission_update
        }

    def _build_prompt(
        self,
        chosen_choice: str,
        mission: Any,
        help_instruction: str,
        story_context: Optional[str] = "",
        existing_characters: Optional[List[Dict[str, Any]]] = None,
        narrative_history: Optional[str] = None
    ) -> str:
        """Build a consolidated prompt for story continuation."""
        prompt_parts = [
            "Continue the story based on the following details:",
            "",
            "PLAYER'S CHOICE:",
            chosen_choice,
            ""
        ]
        
        # Add narrative history if available
        if narrative_history:
            prompt_parts.extend([
                "PREVIOUS EVENTS:",
                narrative_history,
                ""
            ])
            logger.info("Added narrative history to prompt")
            
        # Build mission context from Mission model
        prompt_parts.extend([
            "CURRENT MISSION:",
            f"Title: {mission.title if mission else 'Unknown'}",
            f"Objective: {mission.objective if mission else 'Unknown'}",
            f"Current Status: {mission.status if mission else 'Unknown'}",
            f"Progress: {mission.progress if mission else 0}%",
            f"Difficulty: {mission.difficulty if mission else 'Not specified'}",
            f"Deadline: {mission.deadline if mission else 'No specific deadline'}"
        ])
        
        # Add reward information if available
        if mission and mission.reward_currency and mission.reward_amount:
            prompt_parts.extend([
                "",
                "REWARD INFORMATION:",
                f"Currency: {mission.reward_currency}",
                f"Amount: {mission.reward_amount}"
            ])
        
        # Add progress history if available
        if mission and mission.progress_updates:
            prompt_parts.extend([
                "",
                "RECENT PROGRESS UPDATES:"
            ])
            for update in (mission.progress_updates or [])[-3:]:  # Show last 3 updates
                timestamp = update.get('timestamp', 'Unknown time')
                progress = update.get('progress', 0)
                description = update.get('description', '')
                prompt_parts.append(f"- {timestamp}: {progress}% - {description}")
        
        # Add character details if available
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
        mission: Any,
        mood: Optional[str] = None,
        narrative_style: Optional[str] = None,
        protagonist_name: Optional[str] = None,
        protagonist_gender: Optional[str] = None,
        conflict: Optional[str] = None,
        setting: Optional[str] = None,
        story_context: Optional[str] = None,
        existing_characters: Optional[List[Dict[str, Any]]] = None,
        node_count: int = 1,
        narrative_history: Optional[str] = None,
        enhanced_context: Optional[str] = None,
        help_instruction: str = "   - One that involves seeking help from an NPC"
    ) -> Dict[str, Any]:
        """Generate a story continuation based on the player's choice."""
        logger.info("=== StoryContinuationHandler.generate_continuation called ===")
        logger.debug(f"Received node_count: {node_count}")
        logger.debug(f"Received parameters: conflict={conflict}, setting={setting}, mood={mood}, narrative_style={narrative_style}")
        logger.debug(f"Previous story length: {len(previous_story) if previous_story else 0} chars")
        logger.debug(f"Has narrative history: {bool(narrative_history)}")  # NEW: Log presence of narrative history
        
        # Extract character interactions and previous choices
        character_interactions = self._extract_character_interactions(previous_story, existing_characters or [])
        previous_choices = self._extract_previous_choices(previous_story)
        
        # Build continuation prompt
        prompt = self._build_prompt(
            chosen_choice=chosen_choice,
            mission=mission,
            help_instruction=help_instruction,
            story_context=story_context,
            existing_characters=existing_characters,
            narrative_history=narrative_history
        )
        
        # Build messages for API call
        system_message = StoryPromptBuilder.build_system_message(mood or "default mood", narrative_style or "default narrative style")
        
        # Create StoryContext from Mission model
        logger.info(f"Type of 'mission' parameter BEFORE calling StoryContext.from_mission: {type(mission)}")
        context = StoryContext.from_mission(
            mission,
            conflict=conflict,
            setting=setting,
            character_info=existing_characters,
            narrative_history=narrative_history,
            node_count=node_count,
            previous_choices=previous_choices,
            character_interactions=character_interactions
        )
        
        messages = [
            {"role": "system", "content": f"{system_message['content']}\n\n{StoryContextRules.build_continuity_rules(context)}"},
            {"role": "user", "content": prompt}
        ]
        
        # Use context manager for API call
        response = self.context_manager.process_api_call(
            self.client,
            messages,
            response_format="json_object",
            model=MODEL_CONFIG["model"]
        )
        
        # Process and validate the response
        validated_data = self.validate_response(response, mission)
        logger.debug(f"Validated continuation data: {json.dumps(validated_data, indent=2)}")
        
        return validated_data

class StoryContinuationHandler:
    """Handles story continuation generation and validation."""
    
    def __init__(self, client, context_manager):
        """Initialize with a stateless context manager."""
        self.context_manager = context_manager
        self.client = client
    
    def _extract_character_interactions(self, narrative_text: str, characters: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Extract character interactions from narrative text."""
        interactions = {}
        
        # Create a mapping of character names to their full info
        char_map = {char.get('name', '').lower(): char for char in characters}
        
        # Split narrative into sentences
        sentences = narrative_text.split('.')
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Check each character
            for char_name, char_info in char_map.items():
                if char_name in sentence.lower():
                    if char_name not in interactions:
                        interactions[char_name] = []
                    interactions[char_name].append(sentence)
                    
        return interactions
    
    def _extract_previous_choices(self, narrative_text: str) -> List[str]:
        """Extract previous choices from narrative text."""
        choices = []
        
        # Look for choice-related phrases
        choice_indicators = [
            "you chose to",
            "you decided to",
            "you opted to",
            "you selected",
            "you picked",
            "you went with"
        ]
        
        sentences = narrative_text.split('.')
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            for indicator in choice_indicators:
                if indicator in sentence.lower():
                    # Clean up the choice text
                    choice = sentence.lower().replace(indicator, '').strip()
                    if choice:
                        choices.append(choice)
                        
        return choices

    def _process_mission_update(self, mission_update: Dict[str, Any], mission: Any) -> Dict[str, Any]:
        """Process and validate mission updates from the story continuation."""
        if not mission_update:
            return {"status": "unchanged", "progress_details": "No mission progress in this segment"}
            
        status = mission_update.get('status', 'unchanged')
        progress_details = mission_update.get('progress_details', '')
        
        # Validate status
        valid_statuses = ['unchanged', 'progressed', 'completed', 'failed']
        if status not in valid_statuses:
            status = 'unchanged'
            
        # Calculate progress change based on status
        progress_change = 0
        if status == 'progressed':
            progress_change = 25  # Significant progress
        elif status == 'completed':
            progress_change = 100 - (mission.progress if mission else 0)  # Complete the mission
        elif status == 'failed':
            progress_change = -50  # Major setback
            
        # Update mission progress if needed
        if progress_change != 0:
            current_progress = (mission.progress if mission else 0)
            new_progress = max(0, min(100, current_progress + progress_change))
            
            # If mission is a model instance, use its update_progress method
            if hasattr(mission, 'update_progress'):
                mission.update_progress(new_progress, progress_details)
            else:
                # If it's a dictionary, update it directly
                mission['progress'] = new_progress
                if 'progress_updates' not in mission:
                    mission['progress_updates'] = []
                mission['progress_updates'].append({
                    'progress': new_progress,
                    'timestamp': datetime.utcnow().isoformat(),
                    'description': progress_details
                })
            
            # Update mission status if completed or failed
            if status in ['completed', 'failed']:
                if hasattr(mission, 'status'):
                    mission.status = status
                    if status == 'completed':
                        mission.completed_at = datetime.utcnow()
                else:
                    mission['status'] = status
                    if status == 'completed':
                        mission['completed_at'] = datetime.utcnow().isoformat()
                    
        return {
            "status": status,
            "progress_details": progress_details,
            "progress_change": progress_change,
            "new_progress": (mission.progress if mission else 0)
        }

    def validate_response(self, story_data: Dict[str, Any], mission: Any, random_character: Optional[Character] = None) -> Dict[str, Any]:
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
        
        # Process mission update
        mission_update = self._process_mission_update(story_data.get("mission_update", {}), mission)
        
        # Return a flattened structure: only narrative_text, choices, and mission_update
        return {
            "narrative_text": clean_text,
            "choices": story_data["choices"],
            "mission_update": mission_update
        }

    def _build_prompt(
        self,
        chosen_choice: str,
        mission: Any,
        help_instruction: str,
        story_context: Optional[str] = "",
        existing_characters: Optional[List[Dict[str, Any]]] = None,
        narrative_history: Optional[str] = None
    ) -> str:
        """Build a consolidated prompt for story continuation."""
        prompt_parts = [
            "Continue the story based on the following details:",
            "",
            "PLAYER'S CHOICE:",
            chosen_choice,
            ""
        ]
        
        # Add narrative history if available
        if narrative_history:
            prompt_parts.extend([
                "PREVIOUS EVENTS:",
                narrative_history,
                ""
            ])
            logger.info("Added narrative history to prompt")
            
        # Build mission context from Mission model
        prompt_parts.extend([
            "CURRENT MISSION:",
            f"Title: {mission.title if mission else 'Unknown'}",
            f"Objective: {mission.objective if mission else 'Unknown'}",
            f"Current Status: {mission.status if mission else 'Unknown'}",
            f"Progress: {mission.progress if mission else 0}%",
            f"Difficulty: {mission.difficulty if mission else 'Not specified'}",
            f"Deadline: {mission.deadline if mission else 'No specific deadline'}"
        ])
        
        # Add reward information if available
        if mission and mission.reward_currency and mission.reward_amount:
            prompt_parts.extend([
                "",
                "REWARD INFORMATION:",
                f"Currency: {mission.reward_currency}",
                f"Amount: {mission.reward_amount}"
            ])
        
        # Add progress history if available
        if mission and mission.progress_updates:
            prompt_parts.extend([
                "",
                "RECENT PROGRESS UPDATES:"
            ])
            for update in (mission.progress_updates or [])[-3:]:  # Show last 3 updates
                timestamp = update.get('timestamp', 'Unknown time')
                progress = update.get('progress', 0)
                description = update.get('description', '')
                prompt_parts.append(f"- {timestamp}: {progress}% - {description}")
        
        # Add character details if available
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
        mission: Any,
        mood: Optional[str] = None,
        narrative_style: Optional[str] = None,
        protagonist_name: Optional[str] = None,
        protagonist_gender: Optional[str] = None,
        conflict: Optional[str] = None,
        setting: Optional[str] = None,
        story_context: Optional[str] = None,
        existing_characters: Optional[List[Dict[str, Any]]] = None,
        node_count: int = 1,
        narrative_history: Optional[str] = None,
        enhanced_context: Optional[str] = None,
        help_instruction: str = "   - One that involves seeking help from an NPC"
    ) -> Dict[str, Any]:
        """Generate a story continuation based on the player's choice."""
        logger.info("=== StoryContinuationHandler.generate_continuation called ===")
        logger.debug(f"Received node_count: {node_count}")
        logger.debug(f"Received parameters: conflict={conflict}, setting={setting}, mood={mood}, narrative_style={narrative_style}")
        logger.debug(f"Previous story length: {len(previous_story) if previous_story else 0} chars")
        logger.debug(f"Has narrative history: {bool(narrative_history)}")  # NEW: Log presence of narrative history
        
        # Extract character interactions and previous choices
        character_interactions = self._extract_character_interactions(previous_story, existing_characters or [])
        previous_choices = self._extract_previous_choices(previous_story)
        
        # Build continuation prompt
        prompt = self._build_prompt(
            chosen_choice=chosen_choice,
            mission=mission,
            help_instruction=help_instruction,
            story_context=story_context,
            existing_characters=existing_characters,
            narrative_history=narrative_history
        )
        
        # Build messages for API call
        system_message = StoryPromptBuilder.build_system_message(mood or "default mood", narrative_style or "default narrative style")
        
        # Create StoryContext from Mission model
        logger.info(f"Type of 'mission' parameter BEFORE calling StoryContext.from_mission: {type(mission)}")
        context = StoryContext.from_mission(
            mission,
            conflict=conflict,
            setting=setting,
            character_info=existing_characters,
            narrative_history=narrative_history,
            node_count=node_count,
            previous_choices=previous_choices,
            character_interactions=character_interactions
        )
        
        messages = [
            {"role": "system", "content": f"{system_message['content']}\n\n{StoryContextRules.build_continuity_rules(context)}"},
            {"role": "user", "content": prompt}
        ]
        
        # Use context manager for API call
        response = self.context_manager.process_api_call(
            self.client,
            messages,
            response_format="json_object",
            model=MODEL_CONFIG["model"]
        )
        
        # Process and validate the response
        validated_data = self.validate_response(response, mission)
        logger.debug(f"Validated continuation data: {json.dumps(validated_data, indent=2)}")
        
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
    """
    DEPRECATED: Build the system message for story continuation using the unified system message.
    
    Use OpenAIContextManager.build_continuation_system_message instead.
    """
    warnings.warn(
        "_build_system_message in segment_maker is deprecated. Use OpenAIContextManager.build_continuation_system_message instead.",
        DeprecationWarning,
        stacklevel=2
    )
    return StoryPromptBuilder.build_system_message(mood or "default mood", narrative_style or "default narrative style")["content"]

def generate_continuation(
    previous_story: str,
    chosen_choice: str,
    mission: Any,
    mood: Optional[str] = None,
    narrative_style: Optional[str] = None,
    protagonist_name: Optional[str] = None,
    protagonist_gender: Optional[str] = None,
    conflict: Optional[str] = None,
    setting: Optional[str] = None,
    story_context: Optional[str] = None,
    existing_characters: Optional[List[Dict[str, Any]]] = None,
    node_count: int = 1,
    narrative_history: Optional[str] = None,
    enhanced_context: Optional[str] = None,
    help_instruction: str = "   - One that involves seeking help from an NPC"
) -> Dict[str, Any]:
    """
    DEPRECATED: Generate a story continuation based on the player's choice.
    
    This function is deprecated and will be removed in future versions.
    Please use OpenAIContextManager.generate_continuation instead.
    """
    warnings.warn(
        "generate_continuation in segment_maker is deprecated. Use OpenAIContextManager.generate_continuation instead.", 
        DeprecationWarning, 
        stacklevel=2
    )
    
    # Log the deprecation
    logger.warning("Using deprecated segment_maker.generate_continuation. Please update to OpenAIContextManager.")
    
    # Create temporary context manager to handle the request
    context_manager = OpenAIContextManager()
    client = get_openai_client()
    
    # Forward to new implementation - use the narrative_history or enhanced_context (whichever is available)
    context_to_use = enhanced_context or narrative_history or story_context
    
    return context_manager.generate_continuation(
        client=client,
        user_message=chosen_choice,
        conflict=conflict or "Unknown",
        setting=setting or "Unknown",
        narrative_style=narrative_style or "default narrative style",
        mood=mood or "default mood",
        node_count=node_count,
        mission_info=mission,
        character_info=existing_characters,
        enhanced_context=context_to_use,
        previous_story=previous_story  # Pass the previous story for analysis
    )