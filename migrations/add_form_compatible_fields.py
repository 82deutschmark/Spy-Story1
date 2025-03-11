
from database import db
from app import app
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_form_compatible_fields():
    """Add additional fields to make database compatible with form structure"""
    with app.app_context():
        try:
            logger.info("Starting migration to add form-compatible fields")
            
            # Add columns one by one to handle PostgreSQL peculiarities
            connection = db.engine.connect()
            
            # Add name column if it doesn't exist
            connection.execute(db.text("""
                ALTER TABLE image_analysis 
                ADD COLUMN IF NOT EXISTS name VARCHAR(255)
            """))
            
            # Add personality_traits column if it doesn't exist
            connection.execute(db.text("""
                ALTER TABLE image_analysis 
                ADD COLUMN IF NOT EXISTS personality_traits JSONB
            """))
            
            # Add potential_plot_lines column if it doesn't exist
            connection.execute(db.text("""
                ALTER TABLE image_analysis 
                ADD COLUMN IF NOT EXISTS potential_plot_lines JSONB
            """))
            
            # Add role column if it doesn't exist
            connection.execute(db.text("""
                ALTER TABLE image_analysis 
                ADD COLUMN IF NOT EXISTS role VARCHAR(32)
            """))
            
            # Add description column if it doesn't exist
            connection.execute(db.text("""
                ALTER TABLE image_analysis 
                ADD COLUMN IF NOT EXISTS description TEXT
            """))
            
            # Add backstory column if it doesn't exist
            connection.execute(db.text("""
                ALTER TABLE image_analysis 
                ADD COLUMN IF NOT EXISTS backstory JSONB
            """))
            
            # Update existing records to sync between old and new fields
            connection.execute(db.text("""
                UPDATE image_analysis 
                SET name = character_name 
                WHERE name IS NULL AND character_name IS NOT NULL
            """))
            
            connection.execute(db.text("""
                UPDATE image_analysis 
                SET character_name = name 
                WHERE character_name IS NULL AND name IS NOT NULL
            """))
            
            connection.execute(db.text("""
                UPDATE image_analysis 
                SET personality_traits = character_traits 
                WHERE personality_traits IS NULL AND character_traits IS NOT NULL
            """))
            
            connection.execute(db.text("""
                UPDATE image_analysis 
                SET potential_plot_lines = plot_lines 
                WHERE potential_plot_lines IS NULL AND plot_lines IS NOT NULL
            """))
            
            connection.execute(db.text("""
                UPDATE image_analysis 
                SET role = character_role 
                WHERE role IS NULL AND character_role IS NOT NULL
            """))
            
            logger.info("Migration completed successfully")
            return True
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            return False

if __name__ == "__main__":
    add_form_compatible_fields()
