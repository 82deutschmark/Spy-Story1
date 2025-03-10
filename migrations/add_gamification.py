
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def upgrade():
    """Add gamification tables and columns"""
    with app.app_context():
        try:
            connection = db.engine.connect()
            
            # Update user_progress table with new columns
            connection.execute(db.text("""
                ALTER TABLE user_progress 
                ADD COLUMN IF NOT EXISTS current_story_id INTEGER REFERENCES story_generation(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
                ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS active_plot_arcs JSONB DEFAULT '[]',
                ADD COLUMN IF NOT EXISTS completed_plot_arcs JSONB DEFAULT '[]',
                ADD COLUMN IF NOT EXISTS encountered_characters JSONB DEFAULT '{}'
            """))
            
            # Create character_evolution table
            connection.execute(db.text("""
                CREATE TABLE IF NOT EXISTS character_evolution (
                    id SERIAL PRIMARY KEY,
                    user_id VARCHAR(255) NOT NULL,
                    character_id INTEGER REFERENCES image_analysis(id) ON DELETE CASCADE,
                    story_id INTEGER REFERENCES story_generation(id) ON DELETE CASCADE,
                    status VARCHAR(32) DEFAULT 'active',
                    role VARCHAR(32),
                    evolved_traits JSONB DEFAULT '[]',
                    plot_contributions JSONB DEFAULT '[]',
                    relationship_network JSONB DEFAULT '{}',
                    first_appearance TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    evolution_log JSONB DEFAULT '[]'
                )
            """))
            
            # Create plot_arc table
            connection.execute(db.text("""
                CREATE TABLE IF NOT EXISTS plot_arc (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    arc_type VARCHAR(32),
                    story_id INTEGER REFERENCES story_generation(id) ON DELETE CASCADE,
                    status VARCHAR(32) DEFAULT 'active',
                    completion_criteria JSONB,
                    progress_markers JSONB DEFAULT '[]',
                    key_nodes JSONB DEFAULT '[]',
                    branching_choices JSONB DEFAULT '[]',
                    primary_characters JSONB DEFAULT '[]',
                    rewards JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Create indices for better query performance
            connection.execute(db.text("""
                CREATE INDEX IF NOT EXISTS idx_character_evolution_user_id ON character_evolution(user_id);
                CREATE INDEX IF NOT EXISTS idx_character_evolution_character_id ON character_evolution(character_id);
                CREATE INDEX IF NOT EXISTS idx_character_evolution_story_id ON character_evolution(story_id);
                CREATE INDEX IF NOT EXISTS idx_plot_arc_story_id ON plot_arc(story_id);
                CREATE INDEX IF NOT EXISTS idx_user_progress_current_story_id ON user_progress(current_story_id);
            """))
            
            connection.commit()
            logger.info("Gamification system migration completed successfully")
            
        except Exception as e:
            logger.error(f"Error in migration: {str(e)}")
            raise

if __name__ == "__main__":
    upgrade()
