import os
from sqlalchemy import create_engine, text
from models.base import db

def fix_mission_foreign_key():
    """
    Fixes the mission.giver_id foreign key to reference characters.id
    instead of deprecated_image_analysis
    """
    # Get database URI from Flask app config
    from flask import current_app
    db_uri = current_app.config['SQLALCHEMY_DATABASE_URI']
    
    sql = """
    -- Drop the existing constraint if it exists
    ALTER TABLE mission 
    DROP CONSTRAINT IF EXISTS mission_giver_id_fkey;

    -- Add the correct foreign key constraint
    ALTER TABLE mission
    ADD CONSTRAINT mission_giver_id_fkey 
    FOREIGN KEY (giver_id) 
    REFERENCES characters(id) 
    ON DELETE SET NULL;
    """
    
    try:
        engine = create_engine(db_uri)
        with engine.connect() as connection:
            connection.execute(text(sql))
            connection.commit()
        print("Successfully fixed foreign key constraint")
    except Exception as e:
        print(f"Error fixing foreign key: {e}")

if __name__ == "__main__":
    from app import app
    with app.app_context():
        fix_mission_foreign_key()
