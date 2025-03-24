
"""
WSGI entry point for the Flask application.
"""

import os
from main import create_app

app = create_app()

if __name__ == '__main__':
    # Use PORT environment variable if available, otherwise default to 80
    # This ensures compatibility with Replit Autoscale deployments
    port = int(os.environ.get('PORT', 80))
    app.run(host='0.0.0.0', port=port)
