
import os
from __init__ import create_app
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create app using factory
app = create_app()

if __name__ == "__main__":
    # Ensure JS modules are served with correct MIME type
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    
    # Register custom MIME types for ES modules
    import mimetypes
    mimetypes.add_type('application/javascript', '.js')

    app.run(host='0.0.0.0', port=5000, debug=True)
