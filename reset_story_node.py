"""
Script to reset the story_node table
"""
from app import create_app
from models import db
from models.stories import StoryNode

def reset_story_node_table():
    app = create_app()
    with app.app_context():
        # Drop the table
        db.session.execute('DROP TABLE IF EXISTS story_node CASCADE')
        db.session.commit()
        
        # Recreate the table
        db.create_all()
        print("Successfully reset story_node table")

if __name__ == "__main__":
    reset_story_node_table() 