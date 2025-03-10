
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
    Analyze an image URL using OpenAI's vision model and return structured data about the image
    
    Args:
        image_url (str): URL to the image to analyze
        
    Returns:
        dict: Structured analysis of the image
    """
    try:
        # Validate URL format
        if not image_url.startswith(('http://', 'https://')):
            raise ValueError("Image URL must start with http:// or https://")
        
        # Check if image is accessible and validate it's an image
        try:
            response = requests.head(image_url, timeout=10, allow_redirects=True)
            response.raise_for_status()  # Raise exception for 4XX/5XX status codes
            
            content_type = response.headers.get('Content-Type', '')
            content_length = response.headers.get('Content-Length', 0)
            
            # Basic metadata validation
            if not content_type.startswith('image/'):
                raise ValueError(f"URL does not point to an image. Content-Type: {content_type}")
                
            # Whitelist certain domains known to be reliable
            allowed_domains = [
                'i.imgur.com', 
                'images.unsplash.com',
                'upload.wikimedia.org',
                'picsum.photos'
            ]
            
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
                "content": """You are an expert at analyzing images for a storytelling app set in a hormone-fueled high stakes sexy dramatic international spy universe.
                
                Your task is to analyze the image and determine if it's a character or a scene. 
                
                If it's a CHARACTER:
                - Provide a detailed description of the character
                - Assign a name that fits their appearance
                - Classify their role (hero, villain, neutral)
                - Generate 3-5 personality traits that seem to match the character
                - Suggest 2-3 potential plot lines for this character in a spy narrative
                - Note their style and visual characteristics
                
                If it's a SCENE:
                - Describe the setting in detail
                - Classify the scene type (action, romance, intrigue, etc.)
                - Suggest 2-3 dramatic moments that could happen in this setting
                - Explain how this scene would fit into a spy storyline
                
                Return your analysis as a structured JSON object."""
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this image for my spy thriller story app:"},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
            }
        ]
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=1000
            )
            
            # Parse response to JSON
            analysis_text = response.choices[0].message.content
            analysis = json.loads(analysis_text)
            
            # Add image metadata to the analysis
            image_metadata = {
                'width': None,  # Not available from HEAD request
                'height': None, # Not available from HEAD request
                'format': content_type.split('/')[-1] if '/' in content_type else content_type,
                'size_bytes': int(content_length) if content_length else None
            }
            analysis['image_metadata'] = image_metadata
            
            return analysis
            
        except Exception as api_error:
            logger.error(f"OpenAI API error: {str(api_error)}")
            raise Exception(f"OpenAI API error: {str(api_error)}")
    
    except ValueError as e:
        # Re-raise validation errors with clear message
        logger.error(f"Image validation error: {str(e)}")
        raise ValueError(str(e))
    except Exception as e:
        logger.error(f"Error analyzing artwork: {str(e)}")
        raise Exception(f"Failed to analyze image: {str(e)}")

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
        elif 'role' in analysis and analysis['role'] in ['hero', 'villain', 'neutral']:
            is_character = True
        
        if is_character:
            # Extract character information
            name = None
            
            # Check for name in all possible locations
            if 'character' in analysis and isinstance(analysis['character'], dict):
                if 'name' in analysis['character']:
                    name = analysis['character'].get('name')
            
            # If not found in character object, check top level fields
            if not name:
                if 'character_name' in analysis:
                    name = analysis.get('character_name')
                elif 'name' in analysis:
                    name = analysis.get('name')
            
            if not name:
                name = "Unnamed Character"
            
            # Extract traits from different possible structures
            traits = []
            if 'character' in analysis and 'character_traits' in analysis['character']:
                traits = analysis['character'].get('character_traits', [])
            elif 'character_traits' in analysis:
                traits = analysis.get('character_traits', [])
            
            # Get role information
            role = None
            if 'character' in analysis and 'role' in analysis['character']:
                role = analysis['character'].get('role')
            else:
                role = analysis.get('role')
                
            traits_text = ", ".join(traits) if traits else "mysterious personality"
            
            # Get style information
            style = None
            if 'character' in analysis and 'style' in analysis['character']:
                style = analysis['character'].get('style')
            else:
                style = analysis.get('style')
                
            style_text = style if style else "distinctive appearance"
            
            # Construct description for character
            description = f"This image shows {name}, a {role or 'mysterious'} character with a {traits_text}. " \
                          f"They have a {style_text}. This character would fit well in an international spy thriller."
            
            return description
            
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
