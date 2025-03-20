import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)

# Configure database
database_url = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db = SQLAlchemy(app)

def list_story_generation_columns():
    with app.app_context():
        inspector = db.inspect(db.engine)
        columns = inspector.get_columns('story_generation')
        column_names = [col['name'] for col in columns]
        print("\nColumns in story_generation table:")
        for column in column_names:
            print(f"- {column}")
        print("\nNote: generated_story is a JSONB field that stores the complete story data\n")

if __name__ == "__main__":
    list_story_generation_columns() 