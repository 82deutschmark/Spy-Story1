import os
import logging
from flask import Flask
from database import db
from flask_cors import CORS
from config import get_config
from admin_config import init_admin
from app import create_app

# Configure logging
config = get_config()
logging.basicConfig(level=getattr(logging, config.LOG_LEVEL))
logger = logging.getLogger(__name__)

# Create app once at module level
app = create_app()

if __name__ == "__main__":
    # Run the app
    app.run(host="0.0.0.0", port=5000, debug=True)