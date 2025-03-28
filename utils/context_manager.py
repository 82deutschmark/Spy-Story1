import logging
from typing import List, Dict, Any, Optional
import json
from utils.constants import DEFAULT_TEMPERATURE, INITIAL_STORY_TEMPERATURE, MODEL_CONFIG

logger = logging.getLogger(__name__)

class OpenAIContextManager:
    """
    Helper class to manage conversation context for OpenAI API calls.
    This ensures that history is maintained between related API calls.
    """

    def __init__(self, system_prompt: str = ""):
        """Initialize with an optional system prompt"""
        self.messages = []
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})

    def add_user_message(self, content: str) -> None:
        """Add a user message to the conversation history"""
        self.messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content: str) -> None:
        """Add an assistant message to the conversation history"""
        self.messages.append({"role": "assistant", "content": content})

    def add_system_message(self, content: str) -> None:
        """Add or update the system message while preserving existing parameters"""
        # If there's already a system message, extract any existing parameters
        existing_params = ""
        if self.messages and self.messages[0]["role"] == "system":
            existing_content = self.messages[0]["content"]
            # Look for the "Stored Story Parameters" section
            if "Stored Story Parameters:" in existing_content:
                param_start = existing_content.find("Stored Story Parameters:")
                existing_params = existing_content[param_start:]
                # Remove the parameters from the existing content
                existing_content = existing_content[:param_start].strip()
                # Only merge if the new content is different
                if content != existing_content:
                    content = f"{existing_content}\n\n{content}"
                else:
                    content = existing_content
            else:
                # If no parameters section, only merge if different
                if content != existing_content:
                    content = f"{existing_content}\n\n{content}"
                else:
                    content = existing_content

        # Add the parameters back if they existed
        if existing_params:
            content = f"{content}\n\n{existing_params}"

        # Update or insert the system message
        if self.messages and self.messages[0]["role"] == "system":
            self.messages[0]["content"] = content
        else:
            self.messages.insert(0, {"role": "system", "content": content})

    def get_messages(self) -> List[Dict[str, str]]:
        """Get the current conversation history"""
        return self.messages

    def clear_context(self) -> None:
        """Clear the conversation history except for the system message"""
        if self.messages and self.messages[0]["role"] == "system":
            system_message = self.messages[0]
            self.messages = [system_message]
        else:
            self.messages = []

    def truncate_context(self, max_messages: int = 10) -> None:
        """Truncate the conversation history to avoid token limits"""
        if len(self.messages) <= max_messages:
            return

        # Always keep the system message if present
        if self.messages[0]["role"] == "system":
            system_message = self.messages[0]
            # Keep the most recent messages up to max_messages-1
            self.messages = [system_message] + self.messages[-(max_messages-1):]
        else:
            # No system message, just keep the most recent ones
            self.messages = self.messages[-max_messages:]

    def process_function_calling(self, client, model: str = MODEL_CONFIG["model"], tools: Optional[List] = None) -> Dict[str, Any]:
        """
        Handle a complete conversation flow with function calling

        Args:
            client: OpenAI client instance
            model: Model name to use
            tools: List of tool definitions for function calling

        Returns:
            The final response from the API
        """
        try:
            # Log the messages being sent to OpenAI
            logger.info("=== OpenAI API Request ===")
            logger.info(f"Model: {model}")
            logger.info("Messages:")
            for msg in self.messages:
                logger.info(f"Role: {msg['role']}")
                logger.info(f"Content: {msg['content']}")
                logger.info("---")
            if tools:
                logger.info(f"Tools: {json.dumps(tools, indent=2)}")
            logger.info("========================")

            # Initial API call - ensure at least one message contains 'json' for response_format compatibility
            # Check if any message contains the word 'json'
            json_keyword_present = any('json' in msg.get('content', '').lower() for msg in self.messages if isinstance(msg.get('content'), str))
            
            # Create API call parameters
            api_params = {
                "model": model,
                "messages": self.messages,
            }
            
            # Only add response_format if json keyword is present
            if json_keyword_present:
                api_params["response_format"] = {"type": "json_object"}
            
            # Add tools if provided
            if tools:
                api_params["tools"] = tools
                
            # Make the API call with the prepared parameters
            response = client.chat.completions.create(**api_params)

            # Log the raw response from OpenAI
            logger.info("=== OpenAI API Response ===")
            logger.info(f"Response: {response}")
            logger.info("=========================")

            # Clean the response content if it contains markdown
            content = response.choices[0].message.content
            if content.startswith('```json'):
                content = content[7:]  # Remove ```json
            if content.endswith('```'):
                content = content[:-3]  # Remove ```
            content = content.strip()

            # Update the response with cleaned content
            response.choices[0].message.content = content

            # Add assistant's response to conversation history
            if content:
                self.add_assistant_message(content)

            # Check if function calling was triggered
            tool_calls = response.choices[0].message.tool_calls

            if not tool_calls:
                # No function calling, return the response directly
                return response

            # Process function calls
            is_completed = False

            while not is_completed:
                # Add the tool call to the conversation
                self.messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [
                        {
                            "id": tool_call.id,
                            "type": tool_call.type,
                            "function": {
                                "name": tool_call.function.name,
                                "arguments": tool_call.function.arguments
                            }
                        } for tool_call in tool_calls
                    ]
                })

                # Here you would execute the actual functions
                # For now, just log that we'd process them
                logger.info(f"Would process function calls: {tool_calls}")

                # Make another API call with the function results
                # Check if any message contains the word 'json'
                json_keyword_present = any('json' in msg.get('content', '').lower() for msg in self.messages if isinstance(msg.get('content'), str))
                
                # Create API call parameters
                api_params = {
                    "model": model,
                    "messages": self.messages,
                }
                
                # Only add response_format if json keyword is present
                if json_keyword_present:
                    api_params["response_format"] = {"type": "json_object"}
                
                # Add tools if provided
                if tools:
                    api_params["tools"] = tools
                    
                # Make the API call with the prepared parameters
                response = client.chat.completions.create(**api_params)

                # Clean the response content again
                content = response.choices[0].message.content
                if content.startswith('```json'):
                    content = content[7:]
                if content.endswith('```'):
                    content = content[:-3]
                content = content.strip()

                # Update the response with cleaned content
                response.choices[0].message.content = content

                # Check if we're done with function calling
                tool_calls = response.choices[0].message.tool_calls
                if not tool_calls:
                    is_completed = True
                    # Add the final response to the conversation
                    if content:
                        self.add_assistant_message(content)

            return response

        except Exception as e:
            logger.error(f"Error in process_function_calling: {str(e)}")
            raise

    def _build_system_message(self, mood: str, narrative_style: str) -> str:
        message_parts = [
            "You are a master narrative generator for our adventure game, always talk to the user in the second person as the protagonist of the story.",
            f"Create a highly detailed, layered narrative in a {mood} tone with a {narrative_style} storytelling style.",
            "",
            "This game is set in a high-stakes world of high tech crime,espionage and intrigue. Follow these instructions exactly:",
            "",
            "1. Generate a narrative continuation that is engaging and coherent based on the previous story, plot lines, missions and choices.",
            "2. Your output MUST be valid JSON with exactly the following keys:",
            "   - narrative_text: A string containing the full narrative segment.",
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
            "",
            "Please produce only the JSON response as specified above."
        ]
        return "\n".join(message_parts)

    def generate_initial_story(
        self,
        user_message: str,
        conflict: str,
        setting: str,
        narrative_style: str,
        mood: str,
        character_info: Dict[str, Any],
        client=None,
        temperature: float = INITIAL_STORY_TEMPERATURE,
        custom_system_prompt: str = "",
        mission_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate the initial opening of a story."""
        # Clear previous conversation context to ensure a fresh prompt
        self.clear_context()
        
        # Use the custom system prompt directly when provided, instead of merging
        if custom_system_prompt:
            system_prompt = custom_system_prompt
        else:
            # Only fall back to our internal method if no custom prompt
            system_prompt = self._build_system_message(mood, narrative_style)

        # Add the system message
        self.add_system_message(system_prompt)

        # Add story parameters including mission info if available
        story_params = {
            'conflict': conflict,
            'setting': setting,
            'narrative_style': narrative_style,
            'mood': mood,
            'characters': character_info
        }
        if mission_info:
            story_params['mission'] = mission_info
        
        self.update_story_parameters(story_params)

        # Add the user message
        self.add_user_message(user_message)

        # Get response
        response = self.process_function_calling(
            client=client,
            model=MODEL_CONFIG["model"]
        )

        # Parse and validate the response
        content = response.choices[0].message.content
        if content.startswith('```json'):
            content = content[7:]  # Remove ```json
        if content.endswith('```'):
            content = content[:-3]  # Remove ```
        content = content.strip()

        # Log the raw content to inspect what was returned:
        logging.debug(f"Raw OpenAI response content: {content}")
        try:
            story_data = json.loads(content)
        except json.JSONDecodeError as e:
            logging.error(f"JSON decode error: {str(e)} with content: {content}")
            # Escape problematic characters for debugging
            escaped_content = content.replace("\n", "\\n").replace("\r", "\\r")
            logging.error(f"Escaped JSON content for inspection: {escaped_content}")
            raise

        # Normalize: if the API returned key "story" but not "narrative_text", rename it.
        if "story" in story_data and "narrative_text" not in story_data:
            story_data["narrative_text"] = story_data.pop("story")

        # Add the response to conversation history
        self.add_assistant_message(content)

        return story_data

    def update_story_parameters(self, parameters: Dict[str, Any]) -> None:
        """Update the system message with stored story parameters from the DB."""
        param_block = (
            f"\n\nStored Story Parameters:\n"
            f"CONFLICT: {parameters.get('conflict')}\n"
            f"SETTING: {parameters.get('setting')}\n"
            f"NARRATIVE_STYLE: {parameters.get('narrative_style')}\n"
            f"MOOD: {parameters.get('mood')}"
        )

        # Add mission information if available
        if 'mission' in parameters:
            mission = parameters['mission']
            param_block += (
                f"\n\nCurrent Mission:\n"
                f"NAME: {mission.get('name')}\n"
                f"DESCRIPTION: {mission.get('description')}\n"
                f"STATUS: {mission.get('status')}\n"
                f"OBJECTIVES: {', '.join(mission.get('objectives', []))}\n"
                f"COMPLETION_CRITERIA: {mission.get('completion_criteria')}"
            )

        # Add character information if available
        if 'characters' in parameters:
            param_block += "\n\nActive Characters:"
            characters = parameters['characters']
            if isinstance(characters, dict):
                for char_id, char_info in characters.items():
                    if isinstance(char_info, dict):
                        # Handle dictionary format
                        name = char_info.get('name', str(char_info))
                        role = char_info.get('role', '')
                        param_block += f"\n{char_id}: {name} - {role}"
                    else:
                        # Handle simple value format
                        param_block += f"\n{char_id}: {str(char_info)}"
            elif isinstance(characters, list):
                # Handle list format
                for char_info in characters:
                    if isinstance(char_info, dict):
                        char_id = char_info.get('id', str(char_info))
                        name = char_info.get('name', str(char_info))
                        role = char_info.get('role', '')
                        param_block += f"\n{char_id}: {name} - {role}"
                    else:
                        param_block += f"\n{str(char_info)}"

        # Add the parameters to the system message
        if self.messages and self.messages[0]["role"] == "system":
            # Check if parameters already exist to avoid duplication
            if "Stored Story Parameters:" not in self.messages[0]["content"]:
                self.messages[0]["content"] += param_block
        else:
            self.add_system_message(param_block)

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