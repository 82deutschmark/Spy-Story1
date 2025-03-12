
import os
import json
from urllib.parse import urlparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def show_db_info():
    """Display database connection information for pgAdmin setup"""
    try:
        # Get database URL from environment
        db_url = os.environ.get('DATABASE_URL')
        
        if not db_url:
            logger.error("DATABASE_URL not found in environment variables")
            return
        
        # Parse the database URL
        result = urlparse(db_url)
        
        # Extract database connection details
        username = result.username
        password = result.password
        hostname = result.hostname
        port = result.port or 5432
        database = result.path.lstrip('/')
        
        # Display connection info
        connection_info = {
            "host": hostname,
            "port": port,
            "database": database,
            "username": username,
            "password": "********" # Masked for security
        }
        
        print(json.dumps(connection_info, indent=2))
        print("\nUse this information to configure pgAdmin 4 connections")
        
    except Exception as e:
        logger.error(f"Error parsing database URL: {str(e)}")

if __name__ == "__main__":
    show_db_info()
