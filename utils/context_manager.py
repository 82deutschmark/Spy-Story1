import logging
from typing import List, Dict, Any, Optional

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
            
    def add_user_message(self, content: str or List[Dict]) -> None:
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
                                 temperature: float = 0.7) -> Dict[str, Any]:
        """
        Handle a complete conversation flow with function calling
        
        Args:
            client: OpenAI client instance
            model: Model name to use
            tools: List of tool definitions for function calling
            temperature: Temperature for generation
            
        Returns:
            The final response from the API
        """
        try:
            # Initial API call
            response = client.chat.completions.create(
                model=model,
                messages=self.messages,
                tools=tools,
                temperature=temperature
            )
            
            # Add assistant's response to conversation history
            if response.choices[0].message.content:
                self.add_assistant_message(response.choices[0].message.content)
                
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
                    temperature=temperature
                )
                
                # Check if we're done with function calling
                tool_calls = response.choices[0].message.tool_calls
                if not tool_calls:
                    is_completed = True
                    # Add the final response to the conversation
                    if response.choices[0].message.content:
                        self.add_assistant_message(response.choices[0].message.content)
            
            return response
            
        except Exception as e:
            logger.error(f"Error in process_function_calling: {str(e)}")
            raise
