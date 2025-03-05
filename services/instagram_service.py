import os
import requests
from urllib.parse import urlencode

class InstagramAPI:
    def __init__(self):
        self.access_token = os.environ.get('INSTAGRAM_ACCESS_TOKEN')
        self.api_base = 'https://graph.instagram.com/v12.0'
        
    def get_user_id(self):
        response = requests.get(
            f'{self.api_base}/me',
            params={'access_token': self.access_token}
        )
        response.raise_for_status()
        return response.json()['id']

def post_to_instagram(description, image_url, hashtags=[]):
    try:
        instagram = InstagramAPI()
        
        # Format the caption with hashtags
        hashtag_text = ' '.join(hashtags)
        caption = f"{description}\n\n{hashtag_text}"
        
        # Create container
        params = {
            'image_url': image_url,
            'caption': caption,
            'access_token': instagram.access_token
        }
        
        response = requests.post(
            f'{instagram.api_base}/{instagram.get_user_id()}/media',
            params=params
        )
        response.raise_for_status()
        
        # Publish the container
        container_id = response.json()['id']
        publish_params = {
            'creation_id': container_id,
            'access_token': instagram.access_token
        }
        
        response = requests.post(
            f'{instagram.api_base}/{instagram.get_user_id()}/media_publish',
            params=publish_params
        )
        response.raise_for_status()
        
        return True
        
    except Exception as e:
        raise Exception(f"Error posting to Instagram: {str(e)}")
