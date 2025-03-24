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

    def process_function_calling(self, client, model: str = "gpt-4o-mini", tools: Optional[List] = None, 
                                 temperature: float = DEFAULT_TEMPERATURE) -> Dict[str, Any]:
        """
        Handle a complete conversation flow with function calling

        Args:
            client: OpenAI client instance
            model: Model name to use
            tools: List of tool definitions for function calling
            temperature: Temperature for generation (defaults to DEFAULT_TEMPERATURE)

        Returns:
            The final response from the API
        """
        try:
            # Initial API call
            response = client.chat.completions.create(
                model=model,
                messages=self.messages,
                tools=tools,
                temperature=temperature,
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
                    temperature=temperature,
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

            return response

        except Exception as e:
            logger.error(f"Error in process_function_calling: {str(e)}")
            raise

    def _build_system_message(self, mood: str, narrative_style: str) -> str:
        """Build the system message for story generation."""
        return f"""You are a master narrative generator for our adventure game. 
Create highly detailed, layered narratives in a {mood} tone with a {narrative_style} storytelling style.

This game is set in the high-stakes world of international espionage, luxury, and intrigue. 
Players take on missions, develop relationships with various characters, and navigate complex scenarios 
where betrayal, romance, and action are common themes. The game engine tracks character relationships, 
story progress, and mission progress.

CRITICAL CHARACTER ROLE REQUIREMENTS:
1. You MUST ONLY use characters that are explicitly provided to you in the character prompts
2. NEVER invent or create new characters that are not in the database
3. If a character is not provided in the prompts, they cannot appear in the story
4. Each character has a specific role that MUST be respected:
   - Mission-giver: MUST be the one giving the mission to the player
   - Villain: MUST be the primary antagonist
   - Neutral: Can be used in supporting roles
   - Undetermined: Role is flexible but must align with traits
5. Character roles cannot be changed or swapped
6. No new characters can be introduced
7. Each character's role must be maintained throughout the story
8. Character interactions must reflect their assigned roles
9. The mission-giver must remain the mission-giver
10. The villain must remain the primary antagonist

NARRATIVE STYLE GUIDELINES:
1. Create a LENGTHY, DETAILED story introduction (at least 600-2000 words) with rich descriptions
2. ALWAYS tell the story in second person, addressing the player directly and alluding to their name and gender in the introduction
3. Use vivid sensory details, atmospheric descriptions, but do not reference a character's physical features or clothing
4. Each segment should advance the plot significantly with unexpected twists or revelations
5. Include multiple scenes within each story segment when appropriate
6. Incorporate dynamic character interactions with dialogue that reveals personality
7. Balance action, dialogue, intrigue, and character development
8. Never repeat the same scenarios, settings, or dialogue patterns
9. Create a sense of escalating stakes and tension throughout the narrative

CHARACTER INTEGRATION GUIDELINES:
1. Make character traits manifest in their dialogue, actions, and decisions
2. Show how character traits influence their relationships and interactions
3. Ensure each character's unique traits affect their role in the story
4. Make character traits visible through specific behaviors and choices
5. Use character traits to drive plot developments and conflicts
6. Make character relationships reflect their individual traits
7. When introducing characters, ONLY use those provided in the character prompts
8. Each character's role must be clearly evident in their actions and dialogue
9. Character interactions must align with their assigned roles
10. The mission-giver must be authoritative and knowledgeable
11. The villain must be threatening and pose a significant challenge

Your response MUST be valid JSON with this structure:
{{
    "story": "Main narrative text",
    "choices": [
        {{
            "choice_id": "unique_choice_id",  # REQUIRED: Unique identifier for this choice
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
        temperature: float = INITIAL_STORY_TEMPERATURE
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
        # Add system message
        self.add_system_message(self._build_system_message(mood, narrative_style))

        # Use the provided user_message which contains the detailed character information
        self.add_user_message(user_message)

        # Get response
        response = self.process_function_calling(
            client=client,
            model=MODEL_CONFIG["model"],
            temperature=MODEL_CONFIG["temperature"]
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