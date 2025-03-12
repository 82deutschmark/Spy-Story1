"""
Main application configuration file
This file is kept for backward compatibility.
For actual application creation, see main.py.
"""

import os
import logging
from flask import Flask 
from main import create_app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create and configure the Flask app
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)