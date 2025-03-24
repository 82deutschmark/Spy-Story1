
"""
WSGI entry point for the Flask application.
"""

import os
from main import create_app

app = create_app()

if __name__ == '__main__':
    # Use environment variable for port with fallback to 5000 for development
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
