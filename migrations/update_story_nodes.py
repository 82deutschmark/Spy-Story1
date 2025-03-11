
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
from models import StoryNode, StoryChoice, StoryGeneration, Mission, UserProgress

def update_story_nodes():
    """Update story nodes to properly link to stories and missions"""
    try:
        logger.info("Updating story nodes...")
        
        # Import the app and set up database context
        from app import app
        with app.app_context():
            # Update story nodes to include story_id in metadata
            nodes = StoryNode.query.all()
            stories = StoryGeneration.query.all()
            
            # Create a map of story ID to nodes mentioned in choices
            story_to_nodes = {}
            for story in stories:
                try:
                    if story.generated_story:
                        story_data = json.loads(story.generated_story)
                        if isinstance(story_data, dict) and 'title' in story_data:
                            # This is a valid story, find related nodes
                            related_nodes = StoryNode.query.filter(
                                StoryNode.branch_metadata.contains({"conflict": story.primary_conflict})
                            ).all()
                            
                            # Add these nodes to the map
                            if story.id not in story_to_nodes:
                                story_to_nodes[story.id] = []
                            
                            for node in related_nodes:
                                story_to_nodes[story.id].append(node.id)
                except Exception as e:
                    logger.error(f"Error processing story {story.id}: {str(e)}")
            
            # Update nodes with story connections
            updated_count = 0
            for story_id, node_ids in story_to_nodes.items():
                for node_id in node_ids:
                    node = StoryNode.query.get(node_id)
                    if node:
                        if not node.branch_metadata:
                            node.branch_metadata = {}
                        
                        if 'story_id' not in node.branch_metadata:
                            node.branch_metadata['story_id'] = story_id
                            updated_count += 1
            
            # Link story choices to their respective next nodes
            choice_count = 0
            for story_id, node_ids in story_to_nodes.items():
                # Sort nodes by creation date to establish chronology
                nodes = [StoryNode.query.get(node_id) for node_id in node_ids]
                nodes.sort(key=lambda x: x.created_at)
                
                # Link nodes chronologically via choices
                for i in range(len(nodes) - 1):
                    current_node = nodes[i]
                    next_node = nodes[i+1]
                    
                    # Find choices for current node
                    choices = StoryChoice.query.filter_by(node_id=current_node.id).all()
                    
                    # Link first choice that doesn't have a next_node to the next node
                    for choice in choices:
                        if not choice.next_node_id:
                            choice.next_node_id = next_node.id
                            choice_count += 1
                            break
            
            # Find missions and update node metadata to include mission_id
            missions = Mission.query.all()
            mission_count = 0
            
            for mission in missions:
                if mission.story_id:
                    # Find related nodes
                    if mission.story_id in story_to_nodes:
                        node_ids = story_to_nodes[mission.story_id]
                        if node_ids:
                            # Use the first node (usually the mission-giving node)
                            node = StoryNode.query.get(node_ids[0])
                            if node:
                                if not node.branch_metadata:
                                    node.branch_metadata = {}
                                
                                if 'mission_id' not in node.branch_metadata:
                                    node.branch_metadata['mission_id'] = mission.id
                                    mission_count += 1
            
            # Commit all changes
            db.session.commit()
            logger.info(f"Updated {updated_count} nodes with story connections")
            logger.info(f"Linked {choice_count} choices to next nodes")
            logger.info(f"Connected {mission_count} missions to story nodes")
            
        return True
    except Exception as e:
        logger.error(f"Error updating story nodes: {str(e)}")
        return False

if __name__ == '__main__':
    logger.info("Starting story node update migration...")
    
    try:
        success = update_story_nodes()
        
        if success:
            logger.info("Story node update completed successfully")
        else:
            logger.error("Story node update failed")
    except Exception as e:
        logger.error(f"Migration error: {str(e)}")
        sys.exit(1)
