
import os
import logging
from config import get_config
from app import create_app

# Configure logging
config = get_config()
logging.basicConfig(level=getattr(logging, config.LOG_LEVEL))
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    app = create_app()

    # Run the app
    app.run(host="0.0.0.0", port=5000, debug=True)
