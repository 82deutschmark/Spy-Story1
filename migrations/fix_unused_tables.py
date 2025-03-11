import os
import logging
from app import app
from database import db
from models import UserProgress, CharacterEvolution, PlotArc, StoryNode, StoryChoice

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_unused_tables():
    """Update and populate unused or underutilized tables"""
    with app.app_context():
        try:
            logger.info("Starting migration to fix unused tables...")

            # 1. Check and update UserProgress records
            user_progress_records = UserProgress.query.all()
            for up in user_progress_records:
                if not up.game_state:
                    up.game_state = {}

                # Initialize missing arrays
                if not up.active_plot_arcs:
                    up.active_plot_arcs = []
                if not up.completed_plot_arcs:
                    up.completed_plot_arcs = []
                if not up.active_missions:
                    up.active_missions = []
                if not up.completed_missions:
                    up.completed_missions = []
                if not up.failed_missions:
                    up.failed_missions = []

                logger.info(f"Updated UserProgress record for user {up.user_id}")

            # 2. Check and update CharacterEvolution records
            char_evolutions = CharacterEvolution.query.all()
            for ce in char_evolutions:
                # Initialize missing arrays/objects
                if not ce.evolution_log:
                    ce.evolution_log = []
                if not ce.plot_contributions:
                    ce.plot_contributions = []
                if not ce.relationship_network:
                    ce.relationship_network = {}

                logger.info(f"Updated CharacterEvolution record {ce.id} for character {ce.character_id}")

            # 3. Check and create missing StoryNodes for existing stories
            from models import StoryGeneration
            stories = StoryGeneration.query.all()

            for story in stories:
                # Only process if we don't already have nodes for this story
                if not StoryNode.query.filter(
                    StoryNode.branch_metadata.contains({"story_id": story.id})
                ).count():

                    try:
                        # Create a node for this story
                        story_data = story.generated_story
                        if story_data and isinstance(story_data, str):
                            import json
                            story_json = json.loads(story_data)

                            node = StoryNode(
                                narrative_text=story_json.get('narrative', 'Story segment'),
                                is_endpoint=False,
                                generated_by_ai=True,
                                branch_metadata={
                                    "story_id": story.id,
                                    "setting": story.setting,
                                    "conflict": story.primary_conflict
                                }
                            )

                            # If story has images, use the first one
                            if story.images and len(story.images) > 0:
                                node.image_id = story.images[0].id

                            db.session.add(node)

                            # Create choices if available
                            if 'choices' in story_json and isinstance(story_json['choices'], list):
                                for i, choice in enumerate(story_json['choices']):
                                    choice_text = choice.get('text', f'Option {i+1}')
                                    story_choice = StoryChoice(
                                        node_id=node.id,
                                        choice_text=choice_text,
                                        choice_metadata={
                                            'sequence': i,
                                            'currency_requirements': choice.get('currency_requirements', {})
                                        }
                                    )
                                    db.session.add(story_choice)

                            logger.info(f"Created StoryNode for story {story.id}")
                    except Exception as node_error:
                        logger.error(f"Error creating node for story {story.id}: {str(node_error)}")
                        continue  # Skip to next story

            # 4. Check and update plot arcs
            plot_arcs = PlotArc.query.all()
            for arc in plot_arcs:
                if not arc.key_nodes:
                    arc.key_nodes = []

                # If we have a story ID but no key nodes, look up appropriate nodes
                if arc.story_id and not arc.key_nodes:
                    nodes = StoryNode.query.filter(
                        StoryNode.branch_metadata.contains({"story_id": arc.story_id})
                    ).all()

                    arc.key_nodes = [node.id for node in nodes]
                    logger.info(f"Updated PlotArc {arc.id} with key nodes for story {arc.story_id}")

            # Commit all changes
            db.session.commit()
            logger.info("Migration completed successfully!")

        except Exception as e:
            logger.error(f"Error in migration: {str(e)}")
            db.session.rollback()
            raise

if __name__ == "__main__":
    migrate_unused_tables()