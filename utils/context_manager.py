"""
OpenAI Context Manager for Story Game
====================================

Handles OpenAI API interactions for story generation and continuation.
This module is stateless and does not store any contextual information between requests.
All state must be provided for each operation.
"""

import logging
import json
import sys
from typing import List, Dict, Any, Optional, Callable
from functools import wraps
from utils.constants import DEFAULT_TEMPERATURE, INITIAL_STORY_TEMPERATURE, MODEL_CONFIG
from utils.narrative_analyzer import (
    extract_character_interactions, 
    extract_previous_choices, 
    clean_story_response, 
    process_mission_update
)
from utils.logging_config import configure_minimal_logging

# Configure module-level logger
logger = logging.getLogger(__name__)

# Verbosity control for logging - set to False for production use
VERBOSE_LOGGING = False

def configure_logging(debug_mode=False):
    """Configure logging using the centralized configuration."""
    configure_minimal_logging(debug_mode)
    
    if debug_mode:
        logger.info("OpenAI context manager logging configured in debug mode")
    else:
        logger.info("OpenAI context manager logging configured in minimal mode")

# Configure logging once during module import with minimal verbosity
configure_logging(debug_mode=False)

def log_operation(func):
    """Decorator for logging method entry/exit with controlled verbosity."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        if not VERBOSE_LOGGING:
            return func(*args, **kwargs)
            
        func_name = func.__name__
        logger.info(f"=== Starting {func_name} ===")
        
        # Extract relevant parameters for logging (avoiding large text fields)
        log_params = {}
        for k, v in kwargs.items():
            if k not in ['user_message', 'previous_story', 'enhanced_context']:
                if isinstance(v, str) and len(v) > 100:
                    log_params[k] = f"{v[:50]}...{v[-50:]}" if len(v) > 100 else v
                else:
                    log_params[k] = v
                    
        if log_params:
            logger.debug(f"Parameters: {json.dumps(log_params, default=str)}")
        
        result = func(*args, **kwargs)
        
        logger.info(f"=== Completed {func_name} ===")
        return result
    return wrapper


class OpenAIContextManager:
    """
    Stateless helper class for OpenAI API interactions.
    
    This class handles formatting requests, building appropriate prompts,
    and processing responses for story generation and continuation.
    It does NOT store state between requests - all state must be
    provided by the caller for each operation.
    """

    def __init__(self):
        """Initialize a stateless context manager."""
        # No internal state is stored

    def build_initial_system_message(self, mood: str, narrative_style: str) -> str:
        """Build system message for initial story creation."""
        message_parts = [
            "You are a master narrative generator for our spy thriller adventure game.",
            f"Create highly detailed, layered narratives in a {mood} tone with a {narrative_style} storytelling style.",
            "",
            "This game is set in the high-stakes world of espionage, luxury, and international intrigue.",
            "Follow these instructions exactly:",
            "",
            "1. Generate a NEW STORY OPENING that is engaging and compelling.",
            "2. Your output MUST be valid JSON with exactly the following keys:",
            "   - story: A string containing the full narrative segment.",
            "   - choices: An array of exactly three choice objects. Each choice object MUST include:",
            "         * choice_id: A unique identifier for the choice.",
            "         * text: The choice description.",
            "         * consequence: A brief description of the outcome if chosen.",
            "         * type: One of 'direct', 'risky', or 'social'.",
            "         * requirements: An object for any additional requirements (or empty).",
            "         * character_id: The ID of the NPC involved in the choice (omit for protagonist choices)",
            "   - mission_update: An object with keys:",
            "         * status: One of 'unchanged', 'progressed', 'completed', or 'failed'.",
            "         * progress_details: A string detailing mission progress.",
            "",
            "3. Do not include any keys besides these three in your response.",
            "",
            "CRITICAL CHARACTER ROLE REQUIREMENTS:",
            "1. Use only the characters provided in the character prompts. Do not invent any new characters.",
            "2. The protagonist should not have a character_id in choices.",
            "3. Only include character_id for NPCs involved in the choice.",
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
        
        return "\n".join(message_parts)
        
    def build_continuation_system_message(self, mood: str, narrative_style: str, node_count: int) -> str:
        """Build system message for story continuation."""
        # Ensure node_count is valid and never 0
        if not isinstance(node_count, int) or node_count < 1:
            logger.warning(f"Invalid node_count {node_count}, defaulting to 1")
            node_count = 1
            
        message_parts = [
            "You are a master narrative generator for our spy thriller adventure game.",
            f"Create highly detailed, layered narratives in a {mood} tone with a {narrative_style} storytelling style.",
            f"This is CONTINUATION #{node_count} of an existing story, not a new story.",
            "",
            "This game is set in the high-stakes world of espionage, luxury, and international intrigue.",
            "Follow these instructions exactly:",
            "",
            "1. Generate a narrative CONTINUATION that is engaging and coherent based on the player's choice.",
            "2. Your output MUST be valid JSON with exactly the following keys:",
            "   - story: A string containing the full narrative segment.",
            "   - choices: An array of exactly three choice objects. Each choice object MUST include:",
            "         * choice_id: A unique identifier for the choice.",
            "         * text: The choice description.",
            "         * consequence: A brief description of the outcome if chosen.",
            "         * type: One of 'direct', 'risky', or 'social'.",
            "         * requirements: An object for any additional requirements (or empty).",
            "         * character_id: The ID of the NPC involved in the choice (omit for protagonist choices)",
            "   - mission_update: An object with keys:",
            "         * status: One of 'unchanged', 'progressed', 'completed', or 'failed'.",
            "         * progress_details: A string detailing mission progress.",
            "",
            "3. Do not include any keys besides these three in your response.",
            "",
            "CRITICAL CHARACTER ROLE REQUIREMENTS:",
            "1. Use only the characters provided in the character prompts. Do not invent any new characters.",
            "2. The protagonist should not have a character_id in choices.",
            "3. Only include character_id for NPCs involved in the choice.",
            "4. Respect character roles: mission-givers give missions, villains oppose the player, etc.",
            "5. Maintain character traits, backstories, and plot lines exactly as provided.",
            "",
            "SECONDARY CHARACTER INTEGRATION REQUIREMENTS:",
            "1. You MUST incorporate at least one neutral or supporting character in every story segment.",
            "2. Always include at least one choice that involves seeking help from or interacting with a neutral character.",
            "3. Each neutral character should introduce one of their plot_lines into the narrative.",
            "4. The neutral character's dialogue should reveal aspects of their backstory and personality traits.",
            "5. Neutral characters should provide meaningful interaction opportunities and plot development.",
            "6. Ensure all character interactions precisely reflect their specific traits, role requirements, and backstories.",
            "7. Do not invent new traits or backstories - use ONLY what is provided in character information.",
            "8. For every neutral character introduced, include them in a meaningful choice for the player character.",
            "9. When using secondary characters, ensure they maintain their established roles and personalities.",
            "",
            "NARRATIVE STYLE REQUIREMENTS:",
            "1. Tell the story in second person, addressing the player directly.",
            "2. Create a DETAILED story segment of 500-700 words that builds upon the player's choice.",
            "3. Use vivid sensory details and atmospheric descriptions.",
            "4. Balance action, dialogue, intrigue, and character development.",
            "5. Include multiple scenes within each story segment when appropriate.",
            "6. Create a sense of escalating stakes and tension.",
            "7. Focus primarily on advancing the main mission while weaving in character interactions.",
            "8. Ensure the narrative flows naturally from the player's previous choices to the new set of choices.",
            "",
            "Please produce only the JSON response as specified above."
        ]
        
        return "\n".join(message_parts)

    def build_story_context(
        self, 
        conflict: str, 
        setting: str, 
        mission_info: Optional[Dict[str, Any]] = None, 
        character_info: Optional[Dict[str, Any]] = None,
        character_interactions: Optional[Dict[str, List[str]]] = None,
        previous_choices: Optional[List[str]] = None
    ) -> str:
        """
        Build a context string with story parameters.
        
        Args:
            conflict: Primary story conflict
            setting: Story setting
            mission_info: Optional mission information dictionary
            character_info: Optional character information list
            character_interactions: Optional dictionary of character interactions
            previous_choices: Optional list of previous player choices
        
        Returns:
            Formatted context string for system prompts
        """
        context_parts = [
            "Stored Story Parameters:",
            f"CONFLICT: {conflict}",
            f"SETTING: {setting}"
        ]

        # Add mission information if available
        if mission_info:
            context_parts.extend([
                "",
                "Current Mission:",
                f"TITLE: {(mission_info.get('title', 'Unknown') if hasattr(mission_info, 'get') else getattr(mission_info, 'title', 'Unknown'))}",
                f"OBJECTIVE: {(mission_info.get('objective', 'Unknown') if hasattr(mission_info, 'get') else getattr(mission_info, 'objective', 'Unknown'))}",
                f"STATUS: {(mission_info.get('status', 'in_progress') if hasattr(mission_info, 'get') else getattr(mission_info, 'status', 'in_progress'))}",
                f"PROGRESS: {(mission_info.get('progress', 0) if hasattr(mission_info, 'get') else getattr(mission_info, 'progress', 0))}"
            ])

        # Add character information if available
        if character_info:
            context_parts.append("")
            context_parts.append("Active Characters:")
            for char in character_info:
                if isinstance(char, dict):
                    char_id = char.get('id', '')
                    name = char.get('name', '') or char.get('character_name', '')
                    role = char.get('role', '') or char.get('character_role', '')
                    context_parts.append(f"{char_id}: {name} - {role}")
                    
        # Add character interactions if available
        if character_interactions:
            context_parts.append("")
            context_parts.append("Recent Character Interactions:")
            for char_name, interactions in character_interactions.items():
                if interactions:
                    context_parts.append(f"{char_name.title()}:")
                    # Include the most recent interactions (up to 3)
                    for interaction in interactions[:3]:
                        context_parts.append(f"- {interaction}")
        
        # Add previous choices if available
        if previous_choices:
            context_parts.append("")
            context_parts.append("Previous Player Choices:")
            for choice in previous_choices[:3]:  # Include up to 3 recent choices
                context_parts.append(f"- {choice}")

        return "\n".join(context_parts)

    @log_operation
    def generate_initial_story(
        self,
        client,
        user_message: str,
        conflict: str,
        setting: str,
        narrative_style: str,
        mood: str,
        character_info: Optional[Dict[str, Any]] = None,
        temperature: float = None,
        mission_info: Optional[Dict[str, Any]] = None,
        model: str = None
    ) -> Dict[str, Any]:
        """
        Generate the initial opening of a story.
        
        This method is stateless - all required data must be provided.
        
        Args:
            client: OpenAI client instance
            user_message: User prompt for story generation
            conflict: Primary story conflict
            setting: Story setting
            narrative_style: Narrative style
            mood: Story mood
            character_info: Optional character information
            temperature: Optional temperature parameter for OpenAI
            mission_info: Optional mission information
            model: Optional model name
            
        Returns:
            Dict containing the generated story data
        """
        # Set defaults
        if model is None:
            model = MODEL_CONFIG.get("model", "gpt-4")
        if temperature is None:
            temperature = INITIAL_STORY_TEMPERATURE
            
        # Build messages
        system_message = self.build_initial_system_message(mood, narrative_style)
        context = self.build_story_context(conflict, setting, mission_info, character_info)
        
        messages = [
            {"role": "system", "content": f"{system_message}\n\n{context}"},
            {"role": "user", "content": user_message}
        ]
        
        # Use the enhanced process_api_call method
        story_data = self.process_api_call(
            client=client,
            messages=messages,
            model=model,
            temperature=temperature,
            response_format="json_object"
        )
        
        # Normalize: if the API returned key "story" but not "narrative_text", rename it
        if "story" in story_data and "narrative_text" not in story_data:
            story_data["narrative_text"] = story_data.pop("story")
        
        return story_data

    @log_operation
    def generate_continuation(
        self,
        client,
        user_message: str,
        conflict: str,
        setting: str,
        narrative_style: str,
        mood: str,
        node_count: int,
        mission_info: Optional[Dict[str, Any]] = None,
        character_info: Optional[Dict[str, Any]] = None,
        enhanced_context: Optional[str] = None,
        previous_story: Optional[str] = None,  # New parameter to analyze
        temperature: float = None,
        model: str = None
    ) -> Dict[str, Any]:
        """
        Generate a continuation of an existing story.
        
        This method is stateless - all required data must be provided.
        
        Args:
            client: OpenAI client instance
            user_message: User prompt containing the player's choice
            conflict: Primary story conflict
            setting: Story setting
            narrative_style: Narrative style
            mood: Story mood
            node_count: Current node count in the story (for depth tracking)
            mission_info: Optional mission information
            character_info: Optional character information
            enhanced_context: Optional enhanced context from database
            previous_story: The previous story text for narrative analysis
            temperature: Optional temperature parameter for OpenAI
            model: Optional model name
            
        Returns:
            Dict containing the generated continuation data
        """
        # Set defaults
        if model is None:
            model = MODEL_CONFIG.get("model", "gpt-4")
        if temperature is None:
            temperature = DEFAULT_TEMPERATURE
        
        # Extract narrative elements if previous story is provided
        story_elements = {}
        if previous_story and character_info:
            story_elements = self.extract_story_elements(previous_story, character_info)
            
        # Build messages with node count to track depth
        system_message = self.build_continuation_system_message(mood, narrative_style, node_count)
        context = self.build_story_context(
            conflict, 
            setting, 
            mission_info, 
            character_info,
            character_interactions=story_elements.get('character_interactions'),
            previous_choices=story_elements.get('previous_choices')
        )
        
        # Add enhanced context if available
        user_content = user_message
        if enhanced_context:
            user_content = f"STORY CONTEXT:\n{enhanced_context}\n\nPLAYER CHOICE:\n{user_message}"
        
        messages = [
            {"role": "system", "content": f"{system_message}\n\n{context}"},
            {"role": "user", "content": user_content}
        ]
        
        # Use the enhanced process_api_call method
        story_data = self.process_api_call(
            client=client,
            messages=messages,
            model=model,
            temperature=temperature,
            response_format="json_object"
        )
        
        # Process and clean the response
        if mission_info:
            story_data = self.process_story_response(story_data, mission_info)
        
        # Normalize: if the API returned key "story" but not "narrative_text", rename it
        if "story" in story_data and "narrative_text" not in story_data:
            story_data["narrative_text"] = story_data.pop("story")
        
        return story_data

    def extract_story_elements(self, previous_story: str, existing_characters: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Extract elements from previous story text for context enhancement.
        
        Args:
            previous_story: The previous story narrative text
            existing_characters: List of character information
            
        Returns:
            Dictionary with extracted elements:
            - character_interactions
            - previous_choices
        """
        character_interactions = extract_character_interactions(previous_story, existing_characters)
        previous_choices = extract_previous_choices(previous_story)
        
        return {
            "character_interactions": character_interactions,
            "previous_choices": previous_choices
        }

    def process_story_response(self, story_data: Dict[str, Any], mission: Any) -> Dict[str, Any]:
        """
        Process and clean the story response data.
        
        Args:
            story_data: Raw story data from the API
            mission: Mission model or dictionary
            
        Returns:
            Processed story data
        """
        cleaned_data = clean_story_response(story_data)
        
        # Process mission updates
        mission_update = process_mission_update(cleaned_data.get("mission_update", {}), mission)
        cleaned_data["mission_update"] = mission_update
        
        return cleaned_data

    @log_operation
    def process_api_call(self, client, messages: List[Dict[str, str]], model: str = None, temperature: float = None, response_format: str = "json_object") -> Dict[str, Any]:
        """
        Process an API call with the given parameters.
        
        Args:
            client: OpenAI client instance
            messages: List of message dictionaries
            model: Optional model name
            temperature: Optional temperature parameter
            response_format: Response format type, default "json_object"
            
        Returns:
            Dict containing the processed API response
        """
        # Set defaults
        if model is None:
            model = MODEL_CONFIG.get("model", "gpt-4")
        if temperature is None:
            temperature = DEFAULT_TEMPERATURE
            
        # Build API parameters
        api_params = {
            "model": model,
            "messages": messages
        }
        
        # Add response_format for compatible models (structured JSON)
        if response_format and not model.startswith("o3-"):
            api_params["response_format"] = {"type": response_format}
        
        # Only include temperature for models that support it
        if not model.startswith("o3-"):
            api_params["temperature"] = temperature
            
        # Make the API call
        try:
            response = client.chat.completions.create(**api_params)
            
            # Process the response
            content = response.choices[0].message.content
            
            # Log response summary
            if VERBOSE_LOGGING:
                logger.info(f"Response received: {len(content)} characters, token usage: {response.usage}")
            
            # Handle function calling or structured JSON directly if available
            if response_format == "json_object":
                try:
                    # Try to parse the JSON content directly
                    return self._safe_parse_json(content)
                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error: {str(e)}")
                    logger.error(f"Raw content (first 100 chars): {content[:100]}...")
                    raise
            else:
                return {"text": content}
                
        except Exception as e:
            logger.error(f"API call error: {str(e)}")
            raise

    def _safe_parse_json(self, content: str) -> Dict[str, Any]:
        """
        Safely parse JSON content from API response.
        
        Args:
            content: String containing JSON content
            
        Returns:
            Dict parsed from JSON
        """
        # Clean the content if needed
        if content.startswith('```json'):
            content = content[7:]  # Remove ```json
        if content.endswith('```'):
            content = content[:-3]  # Remove ```
                
        content = content.strip()
        
        # Try parsing the JSON
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to recover malformed JSON
            # Replace any single quotes with double quotes
            fixed_content = content.replace("'", '"')
            # Try parsing again
            try:
                return json.loads(fixed_content)
            except json.JSONDecodeError:
                # If still failing, log and re-raise
                logger.error("Failed to parse JSON even after attempting to fix malformed quotes")
                raise


class GameState:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.user_progress = self._load_user_progress()
        self.current_story = None
        self.current_node = None
        self.active_missions = []
        self._context_manager = OpenAIContextManager()
        self.reload_state()

    def get_context_manager(self) -> OpenAIContextManager:
        """Get the OpenAIContextManager for this story."""
        return self._context_manager
        
    def get_enhanced_context(self, node_id=None, max_tokens=150000, include_character_interactions=True) -> str:
        """
        Get enhanced context for the current or specified story node.
        
        This method retrieves context from summaries, previous nodes, and 
        extracts character interactions for improved narrative continuity.
        
        Args:
            node_id: Optional specific node to get context for (defaults to current node)
            max_tokens: Maximum tokens for context
            include_character_interactions: Whether to include character interactions
            
        Returns:
            Enhanced context string suitable for the OpenAI prompt
        """
        from models.context_summary import NodeContextSummary
        
        # Use current node if none specified
        node_id = node_id or (self.current_node.id if self.current_node else None)
        if not node_id:
            return ""
            
        # Find optimal summary based on token budget
        context_parts = []
        
        summary = NodeContextSummary.get_optimal_summary(node_id, max_tokens)
        if summary:
            context_parts.append(f"PREVIOUS EVENTS SUMMARY:\n{summary.summary_text}")
            
        # Extract character interactions from the current node if available
        if include_character_interactions and self.current_node and hasattr(self.current_node, 'narrative_text'):
            # Get characters from active missions
            characters = []
            for mission in self.active_missions:
                if hasattr(mission, 'characters'):
                    characters.extend(mission.characters)
            
            # Only attempt extraction if we have both narrative text and characters
            if characters and self.current_node.narrative_text:
                # Use the new extract_story_elements method from context_manager
                story_elements = self._context_manager.extract_story_elements(
                    self.current_node.narrative_text, 
                    characters
                )
                
                # Add character interactions
                char_interactions = story_elements.get('character_interactions', {})
                if char_interactions:
                    context_parts.append("\nRECENT CHARACTER INTERACTIONS:")
                    for char_name, interactions in char_interactions.items():
                        if interactions:
                            context_parts.append(f"{char_name.title()}: {interactions[0]}")
                
                # Add previous choices
                prev_choices = story_elements.get('previous_choices', [])
                if prev_choices:
                    context_parts.append("\nPREVIOUS CHOICES:")
                    for choice in prev_choices[:2]:
                        context_parts.append(f"- {choice}")
                        
        return "\n".join(context_parts)

    def _load_user_progress(self):
        """Load user progress from database."""
        # Imported here to avoid circular imports
        from models import UserProgress
        
        return UserProgress.query.filter_by(user_id=self.user_id).first()
        
    def reload_state(self):
        """Reload game state from database."""
        # Import models here to avoid circular imports
        from models import StoryGeneration, StoryNode, Mission
        
        if not self.user_progress:
            return
            
        # Load current story
        if self.user_progress.current_story_id:
            self.current_story = StoryGeneration.query.get(self.user_progress.current_story_id)
            
        # Load current node
        if self.user_progress.current_node_id:
            self.current_node = StoryNode.query.get(self.user_progress.current_node_id)
            
        # Load active missions
        self.active_missions = Mission.query.filter_by(
            user_id=self.user_id,
            status='active'
        ).all()