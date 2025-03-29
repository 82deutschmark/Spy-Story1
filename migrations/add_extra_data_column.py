#!/usr/bin/env python3
"""
Migration script to add extra_data column to the user_progress table.
This column is needed to store node_count for story continuation numbering.
"""

import sys
import os
import logging
import psycopg2
from dotenv import load_dotenv
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_extra_data_column():
    """Add the extra_data column to the user_progress table."""
    try:
        # Get database connection details from environment
        db_url = os.environ.get("DATABASE_URL")
        if not db_url:
            logger.error("DATABASE_URL environment variable not set")
            return

        # Use urlparse to handle the database URL properly
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

        # Connect to the database with SSL if needed
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
        conn.autocommit = False
        cursor = conn.cursor()

        # Check if the column already exists
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='user_progress' AND column_name='extra_data';"
        )
        if cursor.fetchone():
            logger.info("extra_data column already exists in user_progress table.")
            conn.close()
            return

        # Add the column
        logger.info("Adding extra_data column to user_progress table...")
        cursor.execute(
            "ALTER TABLE user_progress ADD COLUMN extra_data JSONB DEFAULT '{}'::jsonb;"
        )
        conn.commit()
        logger.info("Column added successfully.")

        # Verify column was added
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='user_progress' AND column_name='extra_data';"
        )
        if cursor.fetchone():
            logger.info("Verified: extra_data column exists in user_progress table.")
        else:
            logger.error("Verification failed: extra_data column not found!")

        # Close the connection
        cursor.close()
        conn.close()

    except Exception as e:
        logger.error(f"Error adding extra_data column: {str(e)}")
        raise

if __name__ == "__main__":
    logger.info("Starting migration: add extra_data column")
    add_extra_data_column()
    logger.info("Migration completed.") 