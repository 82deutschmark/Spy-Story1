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

def analyze_artwork(image_url):
    """Analyze the artwork using OpenAI's vision model"""
    if not api_key:
        raise Exception("OpenAI API key not found. Please add it to your Replit Secrets.")
    
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
        
        # Ensure we have proper error handling for the image download
        try:
            response = requests.get(image_url, headers=headers, timeout=10)
            response.raise_for_status()  # Raise an exception for bad status codes
            
            # Convert image to base64
            image_data = BytesIO(response.content)
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
            
            logger.debug(f"Successfully downloaded and encoded image. Analyzing artwork...")
            
            # Call OpenAI API with the base64 encoded image
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an art critic specializing in dog portraits. "
                        "Analyze the image and provide: "
                        "1. Art style description "
                        "2. A creative name for the Yorkie "
                        "3. A brief, engaging story about the Yorkie "
                        "Respond in JSON format with keys: 'style', 'name', 'story'"
                    },
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Please analyze this Yorkie artwork:"
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

# Predefined hashtags for Yorkshire Terrier artwork
YORKIE_HASHTAGS = [
    "#YorkshireTerrier", "#YorkieArt", "#DogArt", "#PetPortrait",
    "#YorkieLove", "#DogLover", "#PetArt", "#YorkieLife",
    "#DogPortrait", "#AnimalArt", "#YorkiesOfInstagram",
    "#DogArtist", "#PetLover", "#YorkieMom", "#DogDrawing"
]

def generate_instagram_post(analysis):
    """Generate Instagram post content with hashtags"""
    caption = (
        f"🎨 Meet {analysis['name']}! 🐕\n\n"
        f"{analysis['story']}\n\n"
        f"Art Style: {analysis['style']}\n\n"
        f"{' '.join(YORKIE_HASHTAGS)}"
    )
    return caption
