import sys
import os
import logging
from datetime import datetime

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import Flask app and models
from main import create_app
from database import db
from sqlalchemy import text
from models.scene_images import SceneImages

def migrate_scenes():
    """Migrate scene images from ImageAnalysis to SceneImages table"""
    try:
        # Create the Flask app and use its context
        app = create_app()

        with app.app_context():
            # First check if there are any rows in ImageAnalysis with type 'scene'
            result = db.session.execute(text(
                "SELECT COUNT(*) FROM image_analysis WHERE image_type = 'scene'"
            )).scalar()

            logger.info(f"Found {result} scene images in ImageAnalysis table")

            if result == 0:
                logger.info("No scene images to migrate")
                return

            # Get all scene images from ImageAnalysis
            scenes = db.session.execute(text("""
                SELECT id, image_url, image_width, image_height, image_format, 
                       image_size_bytes, analysis_result, created_at, 
                       setting, setting_description, story_fit, dramatic_moments
                FROM image_analysis 
                WHERE image_type = 'scene'
            """)).fetchall()

            # Migrate each scene to SceneImages
            for scene in scenes:
                # Check if scene already exists in SceneImages
                existing = SceneImages.query.filter_by(image_url=scene.image_url).first()
                if existing:
                    logger.info(f"Scene {scene.id} already exists in SceneImages as ID {existing.id}")
                    continue

                # Create new SceneImage
                new_scene = SceneImages(
                    image_url=scene.image_url,
                    image_width=scene.image_width,
                    image_height=scene.image_height,
                    image_format=scene.image_format,
                    image_size_bytes=scene.image_size_bytes,
                    image_type='scene',
                    analysis_result=scene.analysis_result,
                    name=scene.analysis_result.get('name') if scene.analysis_result else None,
                    scene_type='background',
                    setting=scene.setting,
                    setting_description=scene.setting_description,
                    story_fit=scene.story_fit,
                    dramatic_moments=scene.dramatic_moments,
                    created_at=scene.created_at or datetime.utcnow()
                )
                db.session.add(new_scene)
                logger.info(f"Migrated scene {scene.id} to SceneImages")

                # Update story_images association table to reference the new SceneImage
                # Get all story associations for this image
                story_associations = db.session.execute(text("""
                    SELECT story_id FROM story_images WHERE image_id = :image_id
                """), {"image_id": scene.id}).fetchall()

                # Add new associations with the new SceneImage
                for assoc in story_associations:
                    db.session.execute(text("""
                        INSERT INTO story_images (story_id, image_id)
                        VALUES (:story_id, :image_id)
                        ON CONFLICT (story_id, image_id) DO NOTHING
                    """), {"story_id": assoc.story_id, "image_id": new_scene.id})
                    logger.info(f"Updated story_images association: story_id={assoc.story_id}, new_image_id={new_scene.id}")

            # Commit all changes
            db.session.commit()
            logger.info("Migration completed successfully")

    except Exception as e:
        logger.error(f"Error during migration: {str(e)}")
        raise

if __name__ == "__main__":
    migrate_scenes()