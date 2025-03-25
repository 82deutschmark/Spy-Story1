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
        self.story_parameters = {}  # NEW: Store story parameters
        if system_prompt:
            self.messages.append({"role": "system", "content": system_prompt})

    def add_user_message(self, content: str) -> None:
        """Add a user message to the conversation history"""
        self.messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content: str) -> None:
        """Add an assistant message to the conversation history"""
        self.messages.append({"role": "assistant", "content": content})

    def add_system_message(self, content: str) -> None:
        """Add or update the system message"""
        # If there's already a system message, update it
        if self.messages and self.messages[0]["role"] == "system":
            self.messages[0]["content"] = content
        else:
            # Otherwise, insert at the beginning
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

    def _inject_story_parameters(self) -> None:
        # Inject latest story parameters as part of the system message.
        if self.story_parameters:
            injection = f"Story Parameters: {json.dumps(self.story_parameters)}"
            if self.messages and self.messages[0]["role"] == "system":
                if injection not in self.messages[0]["content"]:
                    self.messages[0]["content"] += "\n" + injection
            else:
                self.add_system_message(injection)

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
            # NEW: Always inject latest story parameters before making API call.
            self._inject_story_parameters()
            # Initial API call
            response = client.chat.completions.create(
                model=model,
                messages=self.messages,
                tools=tools,
                response_format={"type": "json_object"}
            )

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
                # In a real implementation, you'd include the actual function results
                response = client.chat.completions.create(
                    model=model,
                    messages=self.messages,
                    tools=tools,
                    response_format={"type": "json_object"}
                )

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

            # NEW: Only inject story_parameters if not already provided in response JSON
            try:
                content_json = json.loads(response.choices[0].message.content)
                if not all(key in content_json for key in ['conflict', 'setting', 'narrative_style', 'mood']):
                    content_json.update(self.story_parameters)
                    response.choices[0].message.content = json.dumps(content_json)
            except Exception:
                pass

            return response

        except Exception as e:
            logger.error(f"Error in process_function_calling: {str(e)}")
            raise

    def _build_system_message(self, mood: str, narrative_style: str) -> str:
        """Build the system message for story generation."""
        additional_instructions = (
            "IMPORTANT: Only use characters provided explicitly in the prompts. "
            "DO NOT invent or introduce any new characters under any circumstances."
        )
        return f"""You are a master narrative generator for our adventure game.
Create highly detailed, layered narratives in a {mood} tone with a {narrative_style} storytelling style.

This game is set in the high-stakes world of international espionage, luxury, and intrigue.
Players take on missions, develop relationships with various characters, and navigate complex scenarios.
{additional_instructions}

CRITICAL CHARACTER ROLE REQUIREMENTS:
1. You MUST ONLY use characters that are directly provided in the character prompts.
2. NEVER invent or create new characters that are not from the provided data.
3. Each character's role must be strictly maintained.

NARRATIVE STYLE GUIDELINES:
1. Create a LENGTHY, DETAILED story introduction (at least 600-2000 words) with rich descriptions
2. ALWAYS tell the story in second person, addressing the player directly
3. Use vivid sensory details and atmospheric descriptions
4. Advance the plot with unexpected twists and developments

Your response MUST be valid JSON with this structure:
{{
    "story": "Main narrative text",
    "choices": [
        {{
            "choice_id": "unique_choice_id",
            "text": "Choice description",
            "consequence": "Brief outcome description",
            "type": "direct/risky/social",
            "currency_requirements": {{
                "💎": 10
            }},
            "requirements": {{}}
        }}
    ],
    "mission_update": {{
        "status": "unchanged/progressed/completed/failed",
        "progress_details": "How the mission has advanced"
    }}
}}"""

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
        custom_system_prompt: str = ""  # NEW parameter for custom instructions
    ) -> Dict[str, Any]:
        """Generate the initial opening of a story.

        Args:
            user_message: Critical information about the story to be generated including characters
            conflict: The main conflict of the story
            setting: The setting where the story takes place
            narrative_style: The style of narrative to use
            mood: The mood of the story
            character_info: Required information about the NPCs in the story (mission-giver, villain, etc.)
            client: OpenAI client instance
            temperature: Temperature for generation

        Returns:
            Dict containing the generated story data
        """
        # NEW: Store parameters for later use
        self.story_parameters = {
            "conflict": conflict,
            "setting": setting,
            "narrative_style": narrative_style,
            "mood": mood
        }
        # Build the default system message
        default_sys = self._build_system_message(mood, narrative_style)
        # Merge with custom system instructions if provided
        if custom_system_prompt:
            merged_sys = f"{default_sys}\n{custom_system_prompt}"
        else:
            merged_sys = default_sys

        # Instead of overwriting, check if there is already a system message
        if self.messages and self.messages[0]["role"] == "system":
            # Merge with the existing system prompt
            self.messages[0]["content"] = f"{self.messages[0]['content']}\n{merged_sys}"
        else:
            self.add_system_message(merged_sys)

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

        # Add the response to conversation history
        self.add_assistant_message(content)

        return story_data

    def update_story_parameters(self, new_params: Dict[str, str]) -> None:
        """
        Force-update the story parameters so they are always injected into the API call.
        """
        self.story_parameters = new_params
        updated_system = (
            f"CONFLICT: {new_params.get('conflict')}\n"
            f"SETTING: {new_params.get('setting')}\n"
            f"NARRATIVE STYLE: {new_params.get('narrative_style')}\n"
            f"MOOD: {new_params.get('mood')}"
        )
        # Guarantee the updated system message is in place.
        self.add_system_message(updated_system)

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