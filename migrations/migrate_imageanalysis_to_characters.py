
"""
Migration script to move any remaining data from deprecated ImageAnalysis table to Character table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from database import db
import logging
from sqlalchemy import inspect, Table, MetaData

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_if_table_exists(table_name):
    """Check if a table exists in the database"""
    inspector = inspect(db.engine)
    return table_name in inspector.get_table_names()

def migrate_data():
    """Migrate data from ImageAnalysis to Character"""
    with app.app_context():
        # Check if ImageAnalysis table still exists
        if not check_if_table_exists('image_analysis'):
            logger.info("ImageAnalysis table doesn't exist - no migration needed")
            return
            
        # Import models
        from models.character_data import Character
        
        # Use SQLAlchemy core to access the deprecated table without model
        metadata = MetaData()
        image_analysis = Table('image_analysis', metadata, autoload_with=db.engine)
        
        # Query all records from the deprecated table
        conn = db.engine.connect()
        records = conn.execute(image_analysis.select()).fetchall()
        
        logger.info(f"Found {len(records)} records to migrate")
        
        # Migrate each record
        for record in records:
            # Check if character already exists
            exists = Character.query.filter_by(name=record.name).first()
            if exists:
                logger.info(f"Character {record.name} already exists, skipping")
                continue
                
            # Create new Character record
            try:
                # Map fields from old table to new table
                # Adjust these mappings based on your actual schema
                new_character = Character(
                    name=record.name if hasattr(record, 'name') else "Unknown",
                    image_url=record.image_url if hasattr(record, 'image_url') else None,
                    description=record.description if hasattr(record, 'description') else None,
                    role=record.role if hasattr(record, 'role') else "character",
                    backstory=record.backstory if hasattr(record, 'backstory') else None,
                    analysis_result=record.analysis_result if hasattr(record, 'analysis_result') else {},
                    traits=record.traits if hasattr(record, 'traits') else []
                )
                
                db.session.add(new_character)
                db.session.commit()
                logger.info(f"Migrated character: {new_character.name}")
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error migrating record {record}: {str(e)}")
        
        logger.info("Migration completed")

if __name__ == "__main__":
    migrate_data()
