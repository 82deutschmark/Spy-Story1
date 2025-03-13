import logging
import sys
import os

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from database import db
from models.images import ImageAnalysis
from models.character_data import Character
from flask import Flask

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app for context
app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

def migrate_to_characters():
    """
    Migrate character data from ImageAnalysis to the new Character model
    """
    with app.app_context():
        # Get all character records from ImageAnalysis
        image_analyses = ImageAnalysis.query.filter_by(image_type='character').all()

        logger.info(f"Found {len(image_analyses)} character records to migrate")

        migrated_count = 0

        for image in image_analyses:
            try:
                # Create new Character record
                character = Character(
                    image_url=image.image_url,
                    character_name=image.character_name or "Unnamed Character",
                    character_traits=image.character_traits,
                    character_role=image.character_role,
                    plot_lines=image.plot_lines,
                    backstory=image.backstory,
                    description=image.description
                )

                # Copy story relationships
                for story in image.stories:
                    character.character_stories.append(story)

                db.session.add(character)
                migrated_count += 1

                logger.info(f"Migrated character: {character.character_name}")

            except Exception as e:
                logger.error(f"Error migrating character {image.id}: {str(e)}")
                db.session.rollback()
                continue

        try:
            db.session.commit()
            logger.info(f"Successfully migrated {migrated_count} characters")
        except Exception as e:
            logger.error(f"Error committing migration: {str(e)}")
            db.session.rollback()

if __name__ == "__main__":
    migrate_to_characters()