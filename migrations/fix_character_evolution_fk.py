
"""
Migration to fix the character_evolution foreign key constraint.
"""

import logging
from sqlalchemy import text
from database import db

logger = logging.getLogger(__name__)

def run_migration(connection=None):
    """
    Run the migration to fix the character_evolution foreign key reference.
    """
    logger.info("Starting migration: fix_character_evolution_fk")
    try:
        if connection is None:
            connection = db.engine.connect()
            transaction = connection.begin()
            should_commit = True
        else:
            should_commit = False

        # Drop the existing foreign key constraint
        logger.info("Dropping existing foreign key constraint")
        connection.execute(text("""
            ALTER TABLE IF EXISTS character_evolution 
            DROP CONSTRAINT IF EXISTS character_evolution_character_id_fkey
        """))

        # Add the correct foreign key constraint to the characters table
        logger.info("Adding correct foreign key constraint referencing characters table")
        connection.execute(text("""
            ALTER TABLE character_evolution
            ADD CONSTRAINT character_evolution_character_id_fkey
            FOREIGN KEY (character_id)
            REFERENCES characters(id) ON DELETE CASCADE
        """))

        if should_commit:
            transaction.commit()
            logger.info("Migration completed successfully: fix_character_evolution_fk")
            return True
        return True

    except Exception as e:
        logger.error(f"Migration failed: {str(e)}", exc_info=True)
        if 'transaction' in locals() and should_commit:
            transaction.rollback()
        return False
