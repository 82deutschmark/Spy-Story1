from flask import Flask, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError
from config import get_config
from database import db, init_db
from routes import register_routes
import logging
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mydatabase.db' # Replace with your database URI
app.config['SECRET_KEY'] = 'your_secret_key' # Replace with a strong secret key
db = SQLAlchemy(app)

# Dummy UserProgress model
class UserProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    protagonist_name = db.Column(db.String(100), nullable=False)
    progress = db.Column(db.String(1000))

    def __repr__(self):
        return '<UserProgress %r>' % self.protagonist_name

# Dummy function for database interaction.  Needs to be adapted to your actual requirements.
def db_get_or_create_user_progress(user_id, protagonist_name):
    user_progress = UserProgress.query.filter_by(user_id=user_id, protagonist_name=protagonist_name).first()
    if user_progress is None:
        try:
            user_progress = UserProgress(user_id=user_id, protagonist_name=protagonist_name, progress="0%")
            db.session.add(user_progress)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            user_progress = UserProgress.query.filter_by(user_id=user_id, protagonist_name=protagonist_name).first()

    return user_progress


# Dummy route for demonstration
@app.route('/')
def index():
    session['user_id'] = 1  # Replace with a mechanism to get a user ID
    protagonist_name = "Default Protagonist" # Replace with a method to get the protagonist name

    user_progress = db_get_or_create_user_progress(session['user_id'], protagonist_name)
    return f"User progress: {user_progress.progress}"


def create_app():
    """Create and configure the Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    config = get_config()
    app.config.from_object(config)
    
    # Configure logging
    logging.basicConfig(level=app.config['LOG_LEVEL'])
    
    # Initialize extensions
    db.init_app(app)
    
    # Register routes
    register_routes(app)
    
    # Add FLASK_CONFIG to JavaScript
    @app.context_processor
    def inject_flask_config():
        return {
            'FLASK_CONFIG': {
                'staticUrl': '/static/',
                'apiBaseUrl': '/api',
                'env': os.environ.get('FLASK_ENV', 'development'),
                'debug': app.config['DEBUG']
            }
        }
    
    return app

if __name__ == '__main__':
    # Initialize database as suggested by changes
    with app.app_context():
        init_db(app)
    app = create_app()
    app.run(debug=app.config['DEBUG'])

# Dummy database.py file
# database.py
import os
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()