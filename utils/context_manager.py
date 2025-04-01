import logging
from typing import List, Dict, Any, Optional
import json
from utils.constants import MODEL_CONFIG, DEFAULT_OPENAI_MODEL
import sys
from openai import OpenAI

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
    Stateless service for OpenAI API interactions.
    This class should NOT contain any business logic - only API handling.
    """
    
    def process_api_call(
        self,
        client: OpenAI,
        messages: List[Dict[str, str]],
        response_format: str = "json_object",
        model: str = DEFAULT_OPENAI_MODEL
    ) -> Dict[str, Any]:
        """
        Process a single API call to OpenAI.
        This is the ONLY method that should interact with the API.
        
        Args:
            client: OpenAI client instance
            messages: List of message dictionaries
            response_format: Expected response format
            model: Model to use
            
        Returns:
            Dict containing the API response
        """
        try:
            logger.info("=== Making API Call ===")
            logger.debug(f"Using model: {model}")
            logger.debug(f"Response format: {response_format}")
            
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": response_format} if response_format == "json_object" else None
            )
            
            # Extract the response content
            content = response.choices[0].message.content
            
            # If JSON response is expected, parse it
            if response_format == "json_object":
                try:
                    return json.loads(content)
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON response: {str(e)}")
                    return {"error": "Failed to parse JSON response", "raw_content": content}
            
            return {"content": content}
            
        except Exception as e:
            logger.error(f"API call failed: {str(e)}")
            raise RuntimeError(f"API call failed: {str(e)}")

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