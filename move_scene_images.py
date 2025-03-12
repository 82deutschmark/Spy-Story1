
import logging
from app import create_app
from database import db
from models import ImageAnalysis
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text, inspect

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_scene_images_table():
    """Create the SceneImages table if it doesn't exist"""
    app = create_app()
    
    with app.app_context():
        # Check if the table already exists
        inspector = inspect(db.engine)
        if 'scene_images' not in inspector.get_table_names():
            # Define the SceneImages model dynamically
            class SceneImages(db.Model):
                __tablename__ = 'scene_images'
                
                id = Column(Integer, primary_key=True)
                image_url = Column(String(1024), nullable=False)
                image_width = Column(Integer)
                image_height = Column(Integer)
                image_format = Column(String(50))
                image_size_bytes = Column(Integer)
                image_type = Column(String(50), default='scene', index=True)
                analysis_result = Column(JSON)
                name = Column(String(255))
                
                # Scene specific fields
                scene_type = Column(String(100))
                setting = Column(String(255))
                setting_description = Column(Text)
                story_fit = Column(JSON)
                dramatic_moments = Column(JSON)
                
                # Timestamps
                created_at = Column(DateTime, default=db.func.now())
                
                def __repr__(self):
                    return f'<SceneImages {self.id}: {self.name}>'
            
            # Create the table
            db.create_all()
            logger.info("Created SceneImages table")
            
            # Add to the global namespace for the session to be able to use it
            globals()['SceneImages'] = SceneImages
            
            return SceneImages
        else:
            # Table exists, dynamically load the model
            class SceneImages(db.Model):
                __tablename__ = 'scene_images'
                
                id = Column(Integer, primary_key=True)
                image_url = Column(String(1024), nullable=False)
                image_width = Column(Integer)
                image_height = Column(Integer)
                image_format = Column(String(50))
                image_size_bytes = Column(Integer)
                image_type = Column(String(50), default='scene', index=True)
                analysis_result = Column(JSON)
                name = Column(String(255))
                
                # Scene specific fields
                scene_type = Column(String(100))
                setting = Column(String(255))
                setting_description = Column(Text)
                story_fit = Column(JSON)
                dramatic_moments = Column(JSON)
                
                # Timestamps
                created_at = Column(DateTime, default=db.func.now())
                
                def __repr__(self):
                    return f'<SceneImages {self.id}: {self.name}>'
            
            # Add to the global namespace
            globals()['SceneImages'] = SceneImages
            
            logger.info("SceneImages table already exists")
            return SceneImages

def move_scene_images():
    """Move all scene images from ImageAnalysis to SceneImages table"""
    app = create_app()
    
    with app.app_context():
        # Create or get the SceneImages model
        SceneImages = create_scene_images_table()
        
        # Get all scene images
        scene_images = ImageAnalysis.query.filter_by(image_type='scene').all()
        logger.info(f"Found {len(scene_images)} scene images to move")
        
        # Copy each scene image to the new table
        for img in scene_images:
            # Create new SceneImages record
            scene_img = SceneImages(
                image_url=img.image_url,
                image_width=img.image_width,
                image_height=img.image_height,
                image_format=img.image_format,
                image_size_bytes=img.image_size_bytes,
                image_type='scene',
                analysis_result=img.analysis_result,
                name=img.name or img.character_name,
                scene_type=img.scene_type,
                setting=img.setting,
                setting_description=img.setting_description,
                story_fit=img.story_fit,
                dramatic_moments=img.dramatic_moments,
                created_at=img.created_at
            )
            db.session.add(scene_img)
        
        # Commit the new records
        db.session.commit()
        logger.info(f"Successfully added {len(scene_images)} scene images to SceneImages table")
        
        # Now delete the original scene images if they were successfully added
        if len(scene_images) > 0:
            # Double check the count to make sure all were copied
            new_count = db.session.query(SceneImages).count()
            if new_count >= len(scene_images):
                for img in scene_images:
                    db.session.delete(img)
                db.session.commit()
                logger.info(f"Successfully deleted {len(scene_images)} scene images from ImageAnalysis table")
            else:
                logger.warning(f"Mismatch in scene image counts. Expected {len(scene_images)}, found {new_count} in new table. Not deleting originals.")
        
        logger.info("Scene image migration completed")

if __name__ == "__main__":
    move_scene_images()
