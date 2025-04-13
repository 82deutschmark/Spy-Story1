#!/usr/bin/env python3
"""
Script to manually set node_count for a user to test if the persistence system works.
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

# Load environment variables
load_dotenv()

def set_node_count_for_user(user_id, node_count):
    """Set the node_count for a specific user."""
    try:
        # Get database connection details from environment
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            logger.error("DATABASE_URL environment variable not set")
            return

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
            return

        extra_data = result[0] or {}
        
        # Update the node_count
        extra_data['node_count'] = node_count
        
        # Save the updated extra_data back to the database
        cursor.execute(
            "UPDATE user_progress SET extra_data = %s WHERE id = %s",
            (json.dumps(extra_data), user_id)
        )
        conn.commit()
        
        logger.info(f"Updated node_count to {node_count} for user ID {user_id}")
        
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

    except Exception as e:
        logger.error(f"Error setting node count: {str(e)}")
        raise

if __name__ == "__main__":
    logger.info("=== Node Count Test Script ===")
    
    # Set node_count for user with ID 1
    set_node_count_for_user(1, 5)
    
    logger.info("=== Test Complete ===") 