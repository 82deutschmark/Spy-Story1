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
        logger.debug(f"Analyzing artwork from URL: {image_url}")
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
                            "image_url": {"url": image_url}
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"}
        )
        result = json.loads(response.choices[0].message.content)
        logger.debug("Successfully analyzed artwork")
        return result
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
