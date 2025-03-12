
"""
Debug test script to verify functionality of the debug routes and reroll button
"""
import requests
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_debug_page():
    """Test access to the debug page"""
    logger.info("Testing debug page access...")
    try:
        response = requests.get('http://localhost:5000/debug', timeout=5)
        logger.info(f"Debug page status code: {response.status_code}")
        if response.status_code == 200:
            logger.info("Debug page accessible")
            return True
        else:
            logger.error(f"Failed to access debug page. Status code: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error accessing debug page: {e}")
        return False

def test_random_character():
    """Test the random character API endpoint"""
    logger.info("Testing random character API...")
    try:
        response = requests.get('http://localhost:5000/api/character/random', timeout=5)
        logger.info(f"Random character API status code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            logger.info(f"API Response: {data}")
            if data.get('success'):
                logger.info("Random character API working correctly")
                return True
            else:
                logger.error(f"API returned error: {data.get('message')}")
                return False
        else:
            logger.error(f"Failed to access API. Status code: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Error accessing API: {e}")
        return False

if __name__ == "__main__":
    success = True
    
    # Test debug page
    if not test_debug_page():
        success = False
    
    # Test random character API
    if not test_random_character():
        success = False
    
    if success:
        logger.info("All tests passed!")
        sys.exit(0)
    else:
        logger.error("Some tests failed!")
        sys.exit(1)
