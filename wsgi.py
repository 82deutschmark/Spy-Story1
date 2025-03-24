"""
WSGI entry point for the Flask application.
"""

from main import create_app

app = create_app()

if __name__ == '__main__':
    app.run() 