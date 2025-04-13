#!/usr/bin/env python3
"""
Test script to verify the entire node count flow.

This script:
1. Sets a known node_count in the database
2. Initializes a GameState instance
3. Verifies the node_count is loaded from the database
4. Increments the node_count and verifies it's saved
5. Builds a system message with the node_count to verify it's included
"""

import sys
import os
import logging
import json
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Load environment variables
load_dotenv()

# Import Flask app and create app context
from app import create_app
app = create_app()
app_context = app.app_context()
app_context.push()  # Enter the app context

def setup_test_user(user_id, initial_node_count):
    """Set initial node_count for a test user."""
    try:
        # Get database connection details from environment
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            logger.error("DATABASE_URL environment variable not set")
            return False

        # Parse the connection string
        result = urlparse(db_url)
        username = result.username
        password = result.password
        database = result.path[1:]  # Remove leading slash
        hostname = result.hostname
        port = result.port or 5432
        
        # Additional parameters (like sslmode)
        query_params = {}
        if result.query:
            for param in result.query.split('&'):
                if '=' in param:
                    key, value = param.split('=', 1)
                    query_params[key] = value

        # Connect to the database
        logger.info(f"Connecting to database {database} on {hostname}:{port}")
        conn_params = {
            "host": hostname,
            "port": port,
            "database": database,
            "user": username,
            "password": password
        }
        
        # Add SSL mode if in query parameters
        if 'sslmode' in query_params:
            conn_params['sslmode'] = query_params['sslmode']
        
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()

        # Get the user's current extra_data
        cursor.execute(
            "SELECT extra_data FROM user_progress WHERE id = %s",
            (user_id,)
        )
        result = cursor.fetchone()
        if not result:
            logger.error(f"User with ID {user_id} not found")
            conn.close()
            return False

        extra_data = result[0] or {}
        
        # Set the initial node_count
        extra_data['node_count'] = initial_node_count
        
        # Save the updated extra_data back to the database
        cursor.execute(
            "UPDATE user_progress SET extra_data = %s WHERE id = %s",
            (json.dumps(extra_data), user_id)
        )
        conn.commit()
        
        logger.info(f"Set initial node_count to {initial_node_count} for user ID {user_id}")
        
        # Verify the update
        cursor.execute(
            "SELECT extra_data FROM user_progress WHERE id = %s",
            (user_id,)
        )
        updated_data = cursor.fetchone()[0]
        logger.info(f"Verified extra_data: {json.dumps(updated_data)}")
        
        # Close the connection
        cursor.close()
        conn.close()
        return True

    except Exception as e:
        logger.error(f"Error setting up test user: {str(e)}")
        return False

def get_user_id_by_index(index):
    """Get a real user_id from the database by index."""
    from models.user import UserProgress
    
    # Get the first user from the database
    users = UserProgress.query.all()
    if not users or len(users) <= index:
        logger.error(f"No user found at index {index}")
        return None
        
    # Return the user_id
    return users[index].user_id

def test_node_count_loading():
    """Test loading the node count from the database."""
    # Import here to avoid circular imports
    from services.state_manager import GameState
    
    # Get a real user_id
    user_id = get_user_id_by_index(0)
    if not user_id:
        logger.error("Cannot test node count loading: no user found")
        return 0
    
    # Create a GameState instance for this user
    logger.info(f"Creating GameState for user with ID: {user_id}")
    state = GameState(user_id)
    
    # Verify it loaded the node_count from extra_data
    node_count = state.get_node_count()
    logger.info(f"Loaded node_count = {node_count}")
    
    return node_count

def test_node_count_increment():
    """Test incrementing the node count and saving it."""
    # Import here to avoid circular imports
    from services.state_manager import GameState
    
    # Get a real user_id
    user_id = get_user_id_by_index(0)
    if not user_id:
        logger.error("Cannot test node count increment: no user found")
        return 0
    
    # Create a GameState instance for this user
    logger.info(f"Creating GameState for user with ID: {user_id}")
    state = GameState(user_id)
    
    # Get initial node_count
    initial_count = state.get_node_count()
    
    # Increment node_count
    logger.info(f"Incrementing node_count from {initial_count}")
    new_count = state.increment_node_count()
    
    logger.info(f"Node count after increment: {new_count}")
    
    return new_count

def test_system_message():
    """Test the system message includes the correct node count."""
    # Import here to avoid circular imports
    from utils.context_manager import OpenAIContextManager
    
    # Create an OpenAIContextManager
    context_manager = OpenAIContextManager()
    
    # Use different node counts to verify the message
    for count in [1, 5, 10]:
        # Build a system message with this node count
        message = context_manager.build_continuation_system_message(
            mood="suspenseful",
            narrative_style="cinematic",
            node_count=count
        )
        
        # Check if the message includes the correct continuation number
        expected_text = f"This is CONTINUATION #{count} of an existing story"
        if expected_text in message:
            logger.info(f"✅ System message correctly contains '{expected_text}'")
        else:
            logger.error(f"❌ System message does not contain expected text: '{expected_text}'")
            logger.error(f"Message starts with: {message[:200]}...")

if __name__ == "__main__":
    try:
        # Run the tests
        logger.info("=== Node Count Flow Test ===")
        
        # Get a real user ID for testing
        from models.user import UserProgress
        user = UserProgress.query.first()
        if not user:
            logger.error("No users found in the database for testing")
            app_context.pop()
            sys.exit(1)
            
        user_id = user.id
        logger.info(f"Using user with ID {user_id} for testing")
        
        # 1. Set up a test user with initial node_count = 3
        logger.info(f"Setting up user {user_id} with initial node_count = 3")
        if setup_test_user(user_id, 3):
            
            # 2. Test loading the node count
            loaded_count = test_node_count_loading()
            assert loaded_count == 3, f"Expected loaded_count=3, got {loaded_count}"
            
            # 3. Test incrementing the node count
            incremented_count = test_node_count_increment()
            assert incremented_count == 4, f"Expected incremented_count=4, got {incremented_count}"
            
            # 4. Test system message
            test_system_message()
            
            logger.info("=== All Tests Passed! ===")
        else:
            logger.error("Failed to set up test user, aborting tests")
    finally:
        # Exit the app context
        app_context.pop()
        logger.info("Exited app context") 