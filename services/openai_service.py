import os
import requests
from openai import OpenAI

# the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
# do not change this unless explicitly requested by the user
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY)

def analyze_artwork(image_url):
    try:
        # Download image and convert to base64
        response = requests.get(image_url)
        response.raise_for_status()
        
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an art expert specializing in Yorkshire Terrier artwork. "
                              "Analyze the image and provide: "
                              "1. Art style description "
                              "2. A creative name for the Yorkie "
                              "3. A short, engaging story about the Yorkie (2-3 sentences) "
                              "Return the analysis in JSON format."
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
        
        return completion.choices[0].message.content
        
    except Exception as e:
        raise Exception(f"Error analyzing artwork: {str(e)}")
