#!/usr/bin/env python3
"""
Database debugging script to verify the status of extra_data column and node_count.

This script will:
1. Check if the extra_data column exists
2. Check if any user_progress records have node_count values
3. Display those values
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

def check_extra_data_column():
    """Check if the extra_data column exists and contains node_count values."""
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

        # 1. Check if the extra_data column exists
        cursor.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='user_progress' AND column_name='extra_data';"
        )
        if cursor.fetchone():
            logger.info("✅ extra_data column exists in user_progress table.")
        else:
            logger.error("❌ extra_data column does NOT exist in user_progress table!")
            return

        # 2. Check table structure - what columns do we have?
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='user_progress';")
        columns = cursor.fetchall()
        logger.info("User_progress table columns:")
        for col in columns:
            logger.info(f"  - {col[0]}")

        # 3. Check if any user_progress records have node_count in extra_data
        cursor.execute("SELECT id, user_id, extra_data FROM user_progress WHERE extra_data IS NOT NULL;")
        rows = cursor.fetchall()
        if not rows:
            logger.warning("⚠️ No user_progress records have extra_data values.")
        else:
            logger.info(f"Found {len(rows)} user_progress records with extra_data values:")
            for row in rows:
                id, user_id, extra_data = row
                logger.info(f"  - User {user_id} (ID: {id}): {json.dumps(extra_data)}")
                if 'node_count' in extra_data:
                    logger.info(f"    ✅ Has node_count = {extra_data['node_count']}")
                else:
                    logger.warning(f"    ⚠️ No node_count in extra_data")

        # 4. Check for any records with null extra_data
        cursor.execute("SELECT COUNT(*) FROM user_progress WHERE extra_data IS NULL;")
        null_count = cursor.fetchone()[0]
        logger.info(f"Records with NULL extra_data: {null_count}")

        # Close the connection
        cursor.close()
        conn.close()

    except Exception as e:
        logger.error(f"Error checking database: {str(e)}")
        raise

if __name__ == "__main__":
    logger.info("=== Database Debug Script ===")
    check_extra_data_column()
    logger.info("=== Debug Complete ===") 