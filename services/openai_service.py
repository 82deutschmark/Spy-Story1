import os
import json
import requests
import logging
import base64
from io import BytesIO
from openai import OpenAI

# Configure logging
logger = logging.getLogger(__name__)

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def url_to_base64(image_url):
    """
    Downloads an image from a URL and converts it to base64 encoding

    Args:
        image_url (str): URL of the image

    Returns:
        str: Base64 encoded image
    """
    try:
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        # Get content type to determine file extension
        content_type = response.headers.get('Content-Type', '')
        if not content_type.startswith('image/'):
            raise ValueError(f"URL does not point to an image. Content-Type: {content_type}")

        # Convert image to base64
        image_base64 = base64.b64encode(response.content).decode('utf-8')
        return f"data:{content_type};base64,{image_base64}"

    except Exception as e:
        logger.error(f"Error converting image to base64: {str(e)}")
        raise ValueError(f"Failed to convert image to base64: {str(e)}")

def analyze_artwork(image_url):
    """
    Analyzes an image using OpenAI's computer vision API

    Args:
        image_url (str): URL of the image to analyze

    Returns:
        dict: Analysis results
    """
    try:
        # First, validate the image URL is accessible
        try:
            response = requests.head(image_url, timeout=5)
            response.raise_for_status()

            # Check if image is from a midjourney CDN, which is known to have issues
            if 'midjourney.com' in image_url:
                logger.warning(f"Midjourney image URLs may not be accessible to OpenAI: {image_url}")
                # Convert to base64 for Midjourney images
                image_url = url_to_base64(image_url)
                logger.info("Converted Midjourney image to base64 format")

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to validate image URL: {str(e)}")
            try:
                # Try converting to base64 if direct URL fails
                image_url = url_to_base64(image_url)
                logger.info("URL validation failed, converted image to base64 format")
            except Exception as base64_error:
                logger.error(f"Failed to convert to base64: {str(base64_error)}")
                raise ValueError(f"Image URL is not accessible: {str(e)}")

        # Prepare the message for OpenAI
        messages = [
            {
                "role": "system",
                "content": """You are an expert at analyzing images for a storytelling app set in a sexy dramatic international spy universe.

                Your task is to analyze the image and determine if it's a character or a scene. 

                If it's a CHARACTER:
                - Provide a detailed description of the character
                - Assign a name that fits their appearance
                - Classify their role (undetermined, villain, neutral, mission-giver)
                - Generate 3-5 personality traits that seem to match the character
                - Suggest 2-3 potential plot lines for this character in a spy narrative
                - Speculate on backstory for this character

                If it's a SCENE:
                - Describe the setting in detail
                - Classify the scene type (action, romance, intrigue, etc.)
                - Suggest 2-3 dramatic moments that could happen in this setting
                - Explain how this scene would fit into a spy story

                Respond in JSON format with the following structure for CHARACTER:
                {
                  "type": "CHARACTER",
                  "name": "character name",
                  "description": "detailed character description",
                  "role": "undetermined, villain, neutral, mission-giver",
                  "personality_traits": ["trait1", "trait2", "trait3"],
                  "potential_plot_lines": ["plot line 1", "plot line 2"],
                  "backstory": "["back1", "back2", "back3"]"
                }

                Or the following structure for SCENE:
                {
                  "type": "SCENE",
                  "setting": "location description",
                  "description": "detailed scene description",
                  "scene_type": "action/romance/intrigue/etc",
                  "dramatic_moments": ["moment 1", "moment 2"],
                  "story_fit": "how this scene fits in a spy narrative"
                }"""
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url
                        }
                    }
                ]
            }
        ]

        # Make the API call
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=2000,
            response_format={"type": "json_object"}
        )

        # Parse the JSON response
        analysis = json.loads(response.choices[0].message.content)

        # Add image metadata
        analysis['image_metadata'] = {
            'width': None,  # We don't have this from the API
            'height': None,  # We don't have this from the API
            'format': image_url.split('.')[-1] if '.' in image_url and not image_url.startswith('data:') else 'unknown',
            'size_bytes': len(response.choices[0].message.content)
        }

        # For backward compatibility, add these fields
        if analysis.get('type') == 'CHARACTER':
            analysis['image_type'] = 'character'
            analysis['character_name'] = analysis.get('name')
            analysis['character_traits'] = analysis.get('personality_traits')
            analysis['plot_lines'] = analysis.get('potential_plot_lines')
        elif analysis.get('type') == 'SCENE':
            analysis['image_type'] = 'scene'

        logger.info(f"Successfully analyzed image: {image_url[:100]}...")
        return analysis

    except Exception as e:
        logger.error(f"Failed to analyze image: {str(e)}")
        raise ValueError(f"OpenAI API error: {str(e)}")

def generate_image_description(analysis):
    """
    Generate a natural language description of an image based on its analysis

    Args:
        analysis (dict): The analysis output from analyze_artwork()

    Returns:
        str: A natural language description of the image
    """
    try:
        # Determine if this is a character or scene
        is_character = False
        if 'character' in analysis and isinstance(analysis['character'], dict):
            is_character = True
        elif any(key in analysis for key in ['character_name', 'character_traits', 'plot_lines']):
            is_character = True

        else:
            # This is a scene image
            scene_type = analysis.get('scene_type', 'mysterious')
            setting = analysis.get('setting', 'intriguing location')

            # Construct description for scene
            description = f"This image depicts a {scene_type} scene set in {setting}. " \
                          f"It would make an excellent backdrop for a high-stakes spy adventure."

            return description

    except Exception as e:
        logger.error(f"Error generating image description: {str(e)}")
        return "Error generating description from image analysis."