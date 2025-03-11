
import os
import sys
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db
from models import UserProgress, Mission, StoryGeneration

def fix_mission_tracking():
    """Fix mission tracking in database"""
    try:
        logger.info("Fixing mission tracking...")
        
        # Import the app and set up database context
        from app import app
        
        with app.app_context():
            # 1. Check all user progress records
            progress_records = UserProgress.query.all()
            
            for user_progress in progress_records:
                # Initialize mission arrays if needed
                if not hasattr(user_progress, 'active_missions') or user_progress.active_missions is None:
                    user_progress.active_missions = []
                    
                if not hasattr(user_progress, 'completed_missions') or user_progress.completed_missions is None:
                    user_progress.completed_missions = []
                    
                if not hasattr(user_progress, 'failed_missions') or user_progress.failed_missions is None:
                    user_progress.failed_missions = []
                
                # Get all stories for this user
                if user_progress.current_story_id:
                    # Check if the current story has a mission
                    story = StoryGeneration.query.get(user_progress.current_story_id)
                    if story and story.generated_story:
                        import json
                        try:
                            story_data = json.loads(story.generated_story)
                            
                            # If story has a mission, make sure it's in the database
                            if 'mission' in story_data and story_data['mission']:
                                mission_data = story_data['mission']
                                
                                # Check if this mission already exists
                                existing_mission = Mission.query.filter_by(
                                    user_id=user_progress.user_id,
                                    story_id=story.id,
                                    title=mission_data.get('title', 'Untitled Mission')
                                ).first()
                                
                                if not existing_mission and mission_data.get('title'):
                                    logger.info(f"Creating missing mission from story {story.id} for user {user_progress.user_id}")
                                    
                                    # Create the mission
                                    mission = Mission(
                                        user_id=user_progress.user_id,
                                        title=mission_data.get('title', 'Untitled Mission'),
                                        description=mission_data.get('description', ''),
                                        objective=mission_data.get('objective', ''),
                                        status='active',
                                        difficulty=mission_data.get('difficulty', 'medium').lower(),
                                        reward_currency=mission_data.get('reward_currency', '💵'),
                                        reward_amount=int(mission_data.get('reward_amount', 1000)) if mission_data.get('reward_amount') else 1000,
                                        deadline=mission_data.get('deadline', ''),
                                        story_id=story.id
                                    )
                                    
                                    db.session.add(mission)
                                    db.session.flush()  # Get ID without committing
                                    
                                    # Add to user's active missions if not already there
                                    if mission.id not in user_progress.active_missions:
                                        user_progress.active_missions.append(mission.id)
                        except Exception as e:
                            logger.error(f"Error processing story {story.id}: {str(e)}")
                
            # Commit all changes
            db.session.commit()
            logger.info("Mission tracking fixed successfully")
        
        return True
    except Exception as e:
        logger.error(f"Error fixing mission tracking: {str(e)}")
        return False

if __name__ == '__main__':
    logger.info("Starting mission tracking fix...")
    
    success = fix_mission_tracking()
    
    if success:
        logger.info("Mission tracking fix completed successfully")
    else:
        logger.error("Mission tracking fix failed")
        sys.exit(1)
