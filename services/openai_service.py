import os
import json
import requests
from openai import OpenAI
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Get OpenAI API key from environment variables
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    logger.warning("OpenAI API key not found. Please add it to your Replit Secrets.")

# Initialize OpenAI client with the API key
# the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
# do not change this unless explicitly requested by the user
client = OpenAI(api_key=api_key)

def analyze_artwork(image_url, force_type=None):
    """
    Analyze the image using OpenAI's GPT-4 Vision API

    Args:
        image_url (str): URL of the image to analyze
        force_type (str, optional): Force analysis as either 'character' or 'scene'
    """

    if not api_key:
        raise ValueError("OpenAI API key not found. Please add it to your environment variables.")

    try:
        logger.debug(f"Downloading artwork from URL: {image_url}")

        # Set sophisticated user agent to avoid possible blocks
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/"
        }

        # Download the image with a timeout and retries
        import base64
        import requests
        from io import BytesIO
        from PIL import Image

        # Ensure we have proper error handling for the image download
        try:
            response = requests.get(image_url, headers=headers, timeout=10)
            response.raise_for_status()  # Raise an exception for bad status codes

            # Get image dimensions
            image_data = BytesIO(response.content)
            img = Image.open(image_data)
            width, height = img.size
            format = img.format

            # Convert image to base64
            image_data.seek(0)
            base64_image = base64.b64encode(image_data.getvalue()).decode('utf-8')

            # Infer content type from response headers or URL
            content_type = response.headers.get('Content-Type', '')
            if not content_type:
                if image_url.lower().endswith('.png'):
                    content_type = 'image/png'
                elif image_url.lower().endswith(('.jpg', '.jpeg')):
                    content_type = 'image/jpeg'
                elif image_url.lower().endswith('.webp'):
                    content_type = 'image/webp'
                else:
                    content_type = 'image/jpeg'  # Default to jpeg

            # Prepare base64 URL
            base64_url = f"data:{content_type};base64,{base64_image}"

            # Store image metadata
            image_metadata = {
                "url": image_url,
                "width": width,
                "height": height,
                "format": format,
                "size_bytes": len(response.content)
            }

            logger.debug(f"Successfully downloaded and encoded image. Analyzing artwork...")

            # Prepare the system prompt with our character universe information
            system_prompt = """You are an expert analyzer of images for a "Choose Your Own Adventure" story universe. 

The universe is centered around a forest homestead and pasture where two Yorkshire Terriers are the main characters:
- Pawel (male) - fearless, clever, impulsive
- Pawleen (female) - fearless, clever, thoughtful

Key characters in this universe:
1. HEROES:
   - The Yorkies (Pawel and Pawleen) - masters of the forest homestead and pasture
   - Chickens - clever birds with personality (30+ of them)
     - Big Red (the rooster, not very smart)
     - Main hens (clever): Birdadette, Henrietta, Birderella, Birdatha, Birdgit

2. NEUTRAL:
   - Turkeys - big, white, not very smart, always getting stuck

3. VILLAINS:
   - Squirrels - evil, mean, organized in gangs, believe they're superior, steal food, harass others
   - Rat Wizard - lives in the woods, steals eggs and vegetables for potions
   - Mice and Moles - try to steal food, often bullied by squirrels

Analyze the image and determine:
1. If it's a CHARACTER:
   - Suggest a creative name
   - Determine if they are hero, villain, or neutral character
   - List 5 character traits
   - Suggest potential plot lines involving this character
   - Art style description

2. If it's a SCENE:
   - Determine the scene type (narrative, choice moment, action, etc.)
   - Describe the setting in detail (include in 'setting' field)
   - Provide a more detailed setting description in 'setting_description' field
   - Suggest how this scene fits into the story
   - Potential dramatic moments that could occur

Respond in JSON format with the appropriate keys based on the image type."""

            # Craft the user message with the image URL, possibly forcing a specific analysis type
            if force_type == 'character':
                user_message = f"""Analyze the image AS A CHARACTER regardless of what's shown:
   - Suggest a creative name
   - Determine if they are hero, villain, or neutral character
   - List 5 character traits
   - Suggest potential plot lines involving this character
   - Art style description

Even if the image appears to be a scene, treat it as a character and create a character from what's shown.
"""
            elif force_type == 'scene':
                user_message = f"""Analyze the image AS A SCENE regardless of what's shown:
   - Determine the scene type (narrative, choice moment, action, etc.) - include as 'sceneType'
   - Describe the setting in detail (include in 'setting' field)
   - Provide a more detailed setting description in 'setting_description' field
   - Suggest how this scene fits into the story (include as 'storyFit' field)
   - Potential dramatic moments that could occur (include as 'dramaticMoments' array)

Even if the image appears to be a character, treat it as a scene and describe the setting/context shown.
"""
            else:
                user_message = f"""Analyze the image and determine:
1. If it's a CHARACTER:
   - Suggest a creative name
   - Determine if they are hero, villain, or neutral character
   - List 5 character traits
   - Suggest potential plot lines involving this character
   - Art style description

2. If it's a SCENE:
   - Determine the scene type (narrative, choice moment, action, etc.) - include as 'sceneType'
   - Describe the setting in detail (include in 'setting' field)
   - Provide a more detailed setting description in 'setting_description' field
   - Suggest how this scene fits into the story (include as 'storyFit' field)
   - Potential dramatic moments that could occur (include as 'dramaticMoments' array)
"""

            # Call OpenAI API with the base64 encoded image
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": user_message
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": base64_url}
                            }
                        ]
                    }
                ],
                response_format={"type": "json_object"}
            )
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Error downloading image: {str(req_err)}")
            raise Exception(f"Failed to download image from {image_url}: {str(req_err)}")
        result = json.loads(response.choices[0].message.content)

        # Add image metadata to the result
        result["image_metadata"] = image_metadata

        logger.debug("Successfully analyzed artwork")
        return result
    except requests.exceptions.RequestException as req_err:
        logger.error(f"Error downloading image: {str(req_err)}")
        raise Exception(f"Failed to download image: {str(req_err)}")
    except json.JSONDecodeError as json_err:
        logger.error(f"Error parsing OpenAI response: {str(json_err)}")
        raise Exception(f"Failed to parse OpenAI response: {str(json_err)}")
    except Exception as e:
        logger.error(f"Error analyzing artwork: {str(e)}")
        raise Exception(f"Failed to analyze artwork: {str(e)}")

def generate_image_description(analysis):
    """Generate a concise description of the analyzed image"""
    if "name" in analysis:
        # It's a character
        description = (
            f"Character: {analysis['name']} - {'Hero' if analysis.get('role') == 'hero' else 'Neutral' if analysis.get('role') == 'neutral' else 'Villain'}\n\n"
            f"Character Traits: {', '.join(analysis.get('character_traits', [])[:3])}\n\n"
            f"Potential Plot: {analysis.get('plot_lines', [''])[0]}\n\n"
            f"Art Style: {analysis.get('style', '')}"
        )
    else:
        # It's a scene
        description = (
            f"Scene Type: {analysis.get('scene_type', 'Adventure')}\n\n"
            f"Setting: {analysis.get('setting', '')}\n\n"
            f"Detailed Setting Description: {analysis.get('setting_description', '')}\n\n" #Added this line
            f"Dramatic Moment: {analysis.get('dramatic_moments', [''])[0]}"
        )
    return description