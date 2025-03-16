import http.client
import json
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_connection():
    logger.info("Testing connection to server...")
    
    try:
        # First test basic connection
        conn = http.client.HTTPConnection("localhost", 5000)
        logger.info("Created connection object")
        
        # Test homepage
        logger.info("Testing homepage (GET /)")
        conn.request("GET", "/")
        response = conn.getresponse()
        logger.info(f"Homepage response status: {response.status} {response.reason}")
        
        # Test reroll endpoint
        logger.info("Testing reroll endpoint (POST /reroll_character)")
        headers = {'Content-type': 'application/json'}
        data = json.dumps({'character_id': 1})
        conn.request("POST", "/reroll_character", data, headers)
        response = conn.getresponse()
        logger.info(f"Reroll response status: {response.status} {response.reason}")
        
        response_data = response.read().decode()
        logger.info(f"Response data: {response_data}")
        
    except Exception as e:
        logger.error(f"Error during connection test: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_connection() 