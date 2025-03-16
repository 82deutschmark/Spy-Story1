import requests
import json
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_reroll():
    url = 'http://localhost:5000/reroll_character'
    data = {'character_id': 1}
    
    logger.info(f"Sending POST request to {url} with data: {data}")
    
    try:
        response = requests.post(url, json=data)
        logger.info(f"Response status code: {response.status_code}")
        
        if response.headers.get('content-type') == 'application/json':
            logger.info(f"Response JSON: {json.dumps(response.json(), indent=2)}")
        else:
            logger.info(f"Response text: {response.text}")
            
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Connection error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")

if __name__ == "__main__":
    test_reroll() 