import logging
from typing import List, Dict, Any, Optional
import json
from utils.constants import DEFAULT_TEMPERATURE, INITIAL_STORY_TEMPERATURE, MODEL_CONFIG
import sys
from utils.narrative_analyzer import extract_character_interactions, extract_previous_choices, clean_story_response, process_mission_update

def configure_logging():
    """Ensure logs are directed to the console with proper formatting."""
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Check if handlers already exist to avoid duplicates
    if not root_logger.handlers:
        # Create console handler and set level
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        
        # Create formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        console_handler.setFormatter(formatter)
        
        # Add handler to logger
        root_logger.addHandler(console_handler)
    
    # Ensure httpx logger is set to DEBUG for API requests/responses
    logging.getLogger("httpx").setLevel(logging.DEBUG)
    logging.getLogger("openai").setLevel(logging.DEBUG)
    
    # Test log
    logging.info("Logging configured for OpenAI context manager")

# Configure logging
configure_logging()

logger = logging.getLogger(__name__)
# Set up detailed logging for OpenAI API interactions
logging.getLogger("httpx").setLevel(logging.DEBUG)

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
        else:
            logger.info(f"Using node_count={node_count} for continuation")
            
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
        from utils.constants import MODEL_CONFIG, INITIAL_STORY_TEMPERATURE
        import json
        import logging
        
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
        
        logger.info("=== Generating Initial Story ===")
        logger.info(f"Conflict: {conflict}")
        logger.info(f"Setting: {setting}")
        logger.info(f"Narrative Style: {narrative_style}")
        logger.info(f"Mood: {mood}")
        
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
        from utils.constants import MODEL_CONFIG, DEFAULT_TEMPERATURE
        import json
        import logging
        
        # Set defaults
        if model is None:
            model = MODEL_CONFIG.get("model", "gpt-4")
        if temperature is None:
            temperature = DEFAULT_TEMPERATURE
        
        # Extract narrative elements if previous story is provided
        story_elements = {}
        if previous_story and character_info:
            story_elements = self.extract_story_elements(previous_story, character_info)
            logger.info(f"Extracted character interactions and previous choices from narrative")
            
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
            logger.info(f"Using enhanced context of {len(enhanced_context)} characters")
        
        messages = [
            {"role": "system", "content": f"{system_message}\n\n{context}"},
            {"role": "user", "content": user_content}
        ]
        
        logger.info("=== Generating Story Continuation ===")
        logger.info(f"Node Count: {node_count}")
        logger.info(f"Conflict: {conflict}")
        logger.info(f"Setting: {setting}")
        logger.info(f"Narrative Style: {narrative_style}")
        logger.info(f"Mood: {mood}")
        logger.info(f"Enhanced Context Used: {enhanced_context is not None}")
        
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

    def process_api_call(self, client, messages: List[Dict[str, str]], model: str = None, temperature: float = None, response_format: str = "json_object") -> Dict[str, Any]:
        """Process an API call with the given parameters."""
        from utils.constants import MODEL_CONFIG, DEFAULT_TEMPERATURE
        import json
        import logging
        
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
        
        # Add response_format for compatible models
        if response_format and not model.startswith("o3-"):
            api_params["response_format"] = {"type": response_format}
        
        # Only include temperature for models that support it
        if not model.startswith("o3-"):
            api_params["temperature"] = temperature
        
        # ENHANCED LOGGING: Log the full API request parameters
        logger.info("=" * 80)
        logger.info("OpenAI API REQUEST")
        logger.info("=" * 80)
        logger.info(f"Model: {model}")
        logger.info(f"Temperature: {temperature}")
        
        # Format messages for clear viewing in logs
        formatted_messages = []
        for msg in messages:
            # Truncate content if it's too long for the logs
            content = msg.get('content', '')
            if len(content) > 1000:
                content_preview = content[:500] + "... [truncated] ..." + content[-500:]
                formatted_msg = {**msg, 'content': content_preview}
            else:
                formatted_msg = msg
            formatted_messages.append(formatted_msg)
        
        # Log the full request parameters in JSON format
        logger.info("REQUEST PAYLOAD:")
        logger.info(json.dumps(api_params, indent=2, default=str))
        logger.info("-" * 80)
        
        # Make the API call
        try:
            logger.info(f"Sending request to OpenAI API at {model}...")
            response = client.chat.completions.create(**api_params)
            
            # Process the response
            content = response.choices[0].message.content
            
            # Log response summary
            logger.info("RESPONSE RECEIVED:")
            logger.info(f"Usage: {response.usage}")
            logger.info(f"Content length: {len(content)}")
            logger.debug(f"Raw response content: {content[:500]}..." if len(content) > 500 else f"Raw response content: {content}")
            
            # Clean the content if needed
            if content.startswith('```json'):
                content = content[7:]  # Remove ```json
            if content.endswith('```'):
                content = content[:-3]  # Remove ```
                
            content = content.strip()
            
            try:
                result = json.loads(content)
                logger.info("Successfully parsed JSON response")
                logger.info("=" * 80)
                return result
            except json.JSONDecodeError as e:
                logging.error(f"JSON decode error: {str(e)} with content: {content}")
                escaped_content = content.replace("\n", "\\n").replace("\r", "\\r")
                logging.error(f"Escaped JSON content for inspection: {escaped_content}")
                logging.error("=" * 80)
                raise
                
        except Exception as e:
            logger.error(f"API call error: {str(e)}")
            logger.error("=" * 80)
            raise

def test_api_logging():
    """
    Helper function to test API request logging.
    
    This function can be called from anywhere in the application to perform a simple
    API call that will demonstrate the logging setup. The function should be called 
    with an OpenAI client.
    
    Example usage:
        from openai import OpenAI
        from utils.context_manager import test_api_logging
        
        client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        test_api_logging(client)
    """
    import os
    from openai import OpenAI
    
    logger.info("Running API logging test function")
    
    # Check if OpenAI API key is available
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        logger.error("No OpenAI API key found in environment. Set OPENAI_API_KEY.")
        return
    
    # Create client
    client = OpenAI(api_key=api_key)
    
    # Create context manager
    context_manager = OpenAIContextManager()
    
    # Test message - Note: must include "json" for json_object response format
    messages = [
        {"role": "system", "content": "You are a helpful assistant. Respond with JSON."},
        {"role": "user", "content": "Send a simple hello world response in JSON format that includes the current time."}
    ]
    
    try:
        # Process API call using our enhanced logging
        result = context_manager.process_api_call(
            client=client,
            messages=messages,
            model="gpt-3.5-turbo",
            temperature=0.7
        )
        
        logger.info("Test completed successfully!")
        logger.info(f"Result: {result}")
    except Exception as e:
        logger.error(f"Test failed with error: {str(e)}")
        
    logger.info("API logging test function complete")


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
        
    def get_enhanced_context(self, node_id=None, max_tokens=1000, include_character_interactions=True) -> str:
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
        
        return "\n\n".join(context_parts)
        
    def _load_user_progress(self):
        """Load user progress from database."""
        # Implementation depends on your database model
        return {}
        
    def reload_state(self):
        """Reload game state from database."""
        # Implementation depends on your database model
        pass