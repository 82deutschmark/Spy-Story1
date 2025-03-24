
"""
WSGI entry point for the Flask application.
"""

import os
from main import create_app

app = create_app()

if __name__ == '__main__':
    # Use PORT environment variable if available, otherwise default to 5000
    # This helps with deployment platforms that may set their own port
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
