
import os
import json
import logging
from openai import OpenAI
from typing import List, Dict, Any, Optional

# Configure logging
logger = logging.getLogger(__name__)

# Get OpenAI API key from environment variables
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    logger.warning("OpenAI API key not found. Please add it to your environment variables.")

# Initialize OpenAI client
client = OpenAI(api_key=api_key)

def get_story_options(images: List) -> Dict[str, List[str]]:
    """
    Generate story options (conflicts, settings, styles, moods) based on character/scene images
    
    Args:
        images: List of ImageAnalysis objects
    
    Returns:
        Dict with lists of options for conflicts, settings, narrative_styles, and moods
    """
    if not api_key:
        logger.error("OpenAI API key not found. Cannot generate story options.")
        return {}
    
    try:
        # Extract character information from images
        characters_info = []
        scenes_info = []
        
        for img in images:
            if img.image_type == 'character':
                character_data = {
                    'name': img.character_name,
                    'role': img.character_role,
                    'traits': img.character_traits,
                    'plot_lines': img.plot_lines
                }
                characters_info.append(character_data)
            elif img.image_type == 'scene':
                scene_data = {
                    'type': img.scene_type,
                    'setting': img.setting,
                    'dramatic_moments': img.dramatic_moments
                }
                scenes_info.append(scene_data)
        
        # Create prompt
        prompt = f"""
        Generate story options for a Choose Your Own Adventure story based on the following characters and scenes:
        
        Characters:
        {json.dumps(characters_info, indent=2)}
        
        Scenes:
        {json.dumps(scenes_info, indent=2)}
        
        Provide JSON with the following lists:
        1. conflicts: 5 potential main conflicts for the story
        2. settings: 5 potential settings that would work well
        3. narrative_styles: 5 potential narrative styles (e.g., humorous, dark, whimsical)
        4. moods: 5 potential moods for the story
        
        Each item in the lists should be a string.
        """
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a creative writing assistant specializing in interactive fiction."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        # Parse result
        result = json.loads(response.choices[0].message.content)
        return result
        
    except Exception as e:
        logger.error(f"Error generating story options: {str(e)}")
        return {}

def generate_story(images: List, conflict: str, setting: str, narrative_style: str, mood: str, 
                previous_choice: Optional[str] = None, story_context: Optional[str] = None) -> Dict[str, Any]:
    """
    Generate a story segment based on images and parameters
    
    Args:
        images: List of ImageAnalysis objects
        conflict: The primary conflict of the story
        setting: The setting of the story
        narrative_style: The narrative style
        mood: The emotional tone/mood
        previous_choice: If continuing a story, the previous choice made
        story_context: If continuing a story, the previous story content
    
    Returns:
        Dict containing story segment and metadata
    """
    if not api_key:
        logger.error("OpenAI API key not found. Cannot generate story.")
        return {}
    
    try:
        # Extract character information from images
        characters_info = []
        scenes_info = []
        
        for img in images:
            if img.image_type == 'character':
                character_data = {
                    'name': img.character_name,
                    'role': img.character_role,
                    'traits': img.character_traits,
                    'plot_lines': img.plot_lines
                }
                characters_info.append(character_data)
            elif img.image_type == 'scene':
                scene_data = {
                    'type': img.scene_type,
                    'setting': img.setting,
                    'dramatic_moments': img.dramatic_moments
                }
                scenes_info.append(scene_data)
        
        # Determine if this is a new story or continuation
        is_continuation = previous_choice is not None and story_context is not None
        
        # Create prompt
        if is_continuation:
            prompt = f"""
            Continue the Choose Your Own Adventure story based on the following choice and context:
            
            Previous story: {story_context}
            
            User's choice: {previous_choice}
            
            Characters:
            {json.dumps(characters_info, indent=2)}
            
            Scenes:
            {json.dumps(scenes_info, indent=2)}
            
            Story parameters:
            - Conflict: {conflict}
            - Setting: {setting}
            - Narrative style: {narrative_style}
            - Mood: {mood}
            
            Generate the next segment of the story that follows from the user's choice. Include 2-3 new choices at the end.
            
            Respond with a JSON object in this format:
            {{
                "title": "The story segment title",
                "story": "The story text with rich description and character interactions (minimum 300 words)",
                "choices": [
                    {{
                        "text": "Choice 1 text",
                        "consequence": "Brief hint about what this choice leads to"
                    }},
                    {{
                        "text": "Choice 2 text",
                        "consequence": "Brief hint about what this choice leads to"
                    }},
                    {{
                        "text": "Choice 3 text",
                        "consequence": "Brief hint about what this choice leads to"
                    }}
                ]
            }}
            """
        else:
            # Starting a new story
            prompt = f"""
            Generate a Choose Your Own Adventure story opening based on the following:
            
            Characters:
            {json.dumps(characters_info, indent=2)}
            
            Scenes:
            {json.dumps(scenes_info, indent=2)}
            
            Story parameters:
            - Conflict: {conflict}
            - Setting: {setting}
            - Narrative style: {narrative_style}
            - Mood: {mood}
            
            Create an engaging story opening that introduces the characters and setting, and presents the initial conflict.
            Include 2-3 choices for the reader at the end.
            
            Respond with a JSON object in this format:
            {{
                "title": "The story title",
                "story": "The story opening with rich description and character introductions (minimum 300 words)",
                "choices": [
                    {{
                        "text": "Choice 1 text",
                        "consequence": "Brief hint about what this choice leads to"
                    }},
                    {{
                        "text": "Choice 2 text",
                        "consequence": "Brief hint about what this choice leads to"
                    }},
                    {{
                        "text": "Choice 3 text",
                        "consequence": "Brief hint about what this choice leads to"
                    }}
                ]
            }}
            """
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a creative writing assistant specializing in interactive fiction."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        # Parse result
        story_data = response.choices[0].message.content
        
        # Return the result with metadata
        return {
            'story': story_data,
            'is_continuation': is_continuation,
            'parameters': {
                'conflict': conflict,
                'setting': setting,
                'narrative_style': narrative_style,
                'mood': mood
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating story: {str(e)}")
        return {}
