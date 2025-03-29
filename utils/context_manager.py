import logging
from typing import List, Dict, Any, Optional
import json
from utils.constants import DEFAULT_TEMPERATURE, INITIAL_STORY_TEMPERATURE, MODEL_CONFIG
import sys

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

    def build_story_context(self, conflict: str, setting: str, mission_info: Optional[Dict[str, Any]] = None, characters: Optional[Dict[str, Any]] = None) -> str:
        """Build a context string with story parameters."""
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
                f"TITLE: {mission_info.get('title', 'Unknown')}",
                f"OBJECTIVE: {mission_info.get('objective', 'Unknown')}",
                f"STATUS: {mission_info.get('status', 'in_progress')}",
                f"PROGRESS: {mission_info.get('progress', 0)}"
            ])

        # Add character information if available
        if characters:
            context_parts.append("")
            context_parts.append("Active Characters:")
            for char in characters:
                if isinstance(char, dict):
                    char_id = char.get('id', '')
                    name = char.get('name', '') or char.get('character_name', '')
                    role = char.get('role', '') or char.get('character_role', '')
                    context_parts.append(f"{char_id}: {name} - {role}")

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
            
        # Build messages with node count to track depth
        system_message = self.build_continuation_system_message(mood, narrative_style, node_count)
        context = self.build_story_context(conflict, setting, mission_info, character_info)
        
        messages = [
            {"role": "system", "content": f"{system_message}\n\n{context}"},
            {"role": "user", "content": user_message}
        ]
        
        logger.info("=== Generating Story Continuation ===")
        logger.info(f"Node Count: {node_count}")
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