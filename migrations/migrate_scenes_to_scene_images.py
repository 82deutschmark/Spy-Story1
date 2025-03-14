
"""
Migration script to move scene images from ImageAnalysis to SceneImages table
and update story_images association table
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app
from database import db
import logging
from sqlalchemy import inspect, Table, MetaData, select, join

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_if_table_exists(table_name):
    """Check if a table exists in the database"""
    inspector = inspect(db.engine)
    return table_name in inspector.get_table_names()

def migrate_scene_images():
    """Migrate scene images from ImageAnalysis to SceneImages and update story_images"""
    with app.app_context():
        # Check if ImageAnalysis table still exists
        if not check_if_table_exists('image_analysis'):
            logger.info("ImageAnalysis table doesn't exist - no migration needed")
            return
            
        # Import models
        from models.scene_images import SceneImages
        from models.stories import StoryGeneration
        
        # Use SQLAlchemy core to access the deprecated table without model
        metadata = MetaData()
        image_analysis = Table('image_analysis', metadata, autoload_with=db.engine)
        
        # Also load the story_image_association table to migrate relationships
        story_image_assoc = Table('story_image_association', metadata, autoload_with=db.engine)
        
        # Query all scene records from the deprecated table
        conn = db.engine.connect()
        scenes = conn.execute(image_analysis.select().where(image_analysis.c.image_type == 'scene')).fetchall()
        
        logger.info(f"Found {len(scenes)} scene images to migrate")
        
        # Mapping of old IDs to new IDs for relationship migration
        id_mapping = {}
        
        # Migrate each scene
        for scene in scenes:
            # First, check if scene already exists in SceneImages by image_url
            existing_scene = SceneImages.query.filter_by(image_url=scene.image_url).first()
            
            if existing_scene:
                logger.info(f"Scene with URL {scene.image_url} already exists, using existing ID")
                id_mapping[scene.id] = existing_scene.id
                continue
                
            # Create new SceneImages record
            try:
                # Map fields from old table to new table
                new_scene = SceneImages(
                    image_url=scene.image_url,
                    image_width=scene.image_width if hasattr(scene, 'image_width') else None,
                    image_height=scene.image_height if hasattr(scene, 'image_height') else None,
                    image_format=scene.image_format if hasattr(scene, 'image_format') else None,
                    image_size_bytes=scene.image_size_bytes if hasattr(scene, 'image_size_bytes') else None,
                    image_type='scene',
                    analysis_result=scene.analysis_result if hasattr(scene, 'analysis_result') else {},
                    name=scene.name if hasattr(scene, 'name') else None,
                    scene_type=scene.scene_type if hasattr(scene, 'scene_type') else None,
                    setting=scene.setting if hasattr(scene, 'setting') else None,
                    setting_description=scene.setting_description if hasattr(scene, 'setting_description') else None,
                    story_fit=scene.story_fit if hasattr(scene, 'story_fit') else None,
                    dramatic_moments=scene.dramatic_moments if hasattr(scene, 'dramatic_moments') else None
                )
                
                db.session.add(new_scene)
                db.session.flush()  # Get the new ID without committing yet
                
                # Store the mapping between old and new IDs
                id_mapping[scene.id] = new_scene.id
                logger.info(f"Migrated scene {scene.id} to new ID {new_scene.id}")
                
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error migrating scene {scene.id}: {str(e)}")
        
        # Commit the scene migrations
        db.session.commit()
        
        # Now migrate the story associations
        try:
            # Get all story-image associations for scenes
            story_image_assocs = conn.execute(
                select([story_image_assoc])
                .where(story_image_assoc.c.image_id.in_(id_mapping.keys()))
            ).fetchall()
            
            logger.info(f"Found {len(story_image_assocs)} story-image associations to migrate")
            
            # For each association, create a new entry in story_images
            migrated_assocs = 0
            
            for assoc in story_image_assocs:
                story_id = assoc.story_id
                old_image_id = assoc.image_id
                
                if old_image_id in id_mapping:
                    new_image_id = id_mapping[old_image_id]
                    
                    # Check if story still exists
                    story = StoryGeneration.query.get(story_id)
                    if not story:
                        logger.warning(f"Story {story_id} no longer exists, skipping association")
                        continue
                    
                    # Check if scene still exists
                    scene = SceneImages.query.get(new_image_id)
                    if not scene:
                        logger.warning(f"Scene {new_image_id} doesn't exist, skipping association")
                        continue
                    
                    # Check if association already exists
                    exists = db.session.query(story_images).filter_by(
                        story_id=story_id, image_id=new_image_id
                    ).first()
                    
                    if not exists:
                        # Add the association through the relationship
                        story.images.append(scene)
                        migrated_assocs += 1
            
            # Commit the association migrations
            db.session.commit()
            logger.info(f"Migrated {migrated_assocs} story-image associations")
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error migrating story-image associations: {str(e)}")
        
        logger.info("Scene image migration completed successfully")

if __name__ == "__main__":
    migrate_scene_images()
