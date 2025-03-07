from app import app, db
from models import ImageAnalysis, StoryNode, StoryChoice, UserProgress, Achievement, StoryGeneration

def migrate_database():
    """Update database schema with new columns and tables"""
    with app.app_context():
        # Check if columns exist and add them if they don't
        engine = db.engine
        inspector = db.inspect(engine)

        # Create missing tables first
        tables_to_create = [
            'story_node',
            'story_choice', 
            'user_progress',
            'achievement'
        ]

        with engine.connect() as conn:
            # Create tables that don't exist
            for table_name in tables_to_create:
                if not inspector.has_table(table_name):
                    print(f"Creating table {table_name}")
                    if table_name == 'story_node':
                        conn.execute(db.text("""
                            CREATE TABLE story_node (
                                id SERIAL PRIMARY KEY,
                                narrative_text TEXT NOT NULL,
                                is_endpoint BOOLEAN DEFAULT FALSE,
                                generated_by_ai BOOLEAN DEFAULT TRUE,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                achievement_id INTEGER REFERENCES achievement(id),
                                branch_metadata JSON,
                                parent_node_id INTEGER REFERENCES story_node(id),
                                image_id INTEGER REFERENCES image_analysis(id)
                            )
                        """))
                    elif table_name == 'story_choice':
                        conn.execute(db.text("""
                            CREATE TABLE story_choice (
                                id SERIAL PRIMARY KEY,
                                node_id INTEGER NOT NULL REFERENCES story_node(id),
                                choice_text VARCHAR(500) NOT NULL,
                                next_node_id INTEGER REFERENCES story_node(id),
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                choice_metadata JSON
                            )
                        """))
                    elif table_name == 'user_progress':
                        conn.execute(db.text("""
                            CREATE TABLE user_progress (
                                id SERIAL PRIMARY KEY,
                                user_id VARCHAR(255) NOT NULL,
                                current_node_id INTEGER REFERENCES story_node(id),
                                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                choice_history JSON,
                                achievements_earned JSON,
                                game_state JSON
                            )
                        """))
                    elif table_name == 'achievement':
                        conn.execute(db.text("""
                            CREATE TABLE achievement (
                                id SERIAL PRIMARY KEY,
                                name VARCHAR(255) NOT NULL,
                                description TEXT,
                                criteria JSON,
                                points INTEGER DEFAULT 0,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            )
                        """))

            # Update existing tables
            # Fix image_analysis table
            image_analysis_columns = inspector.get_columns('image_analysis')
            existing_columns = [col['name'] for col in image_analysis_columns]

            if 'updated_at' in existing_columns:
                print("Removing updated_at column from image_analysis")
                conn.execute(db.text("ALTER TABLE image_analysis DROP COLUMN IF EXISTS updated_at"))

            if 'character_traits' in existing_columns and 'character_traits' not in ['json', 'jsonb']:
                print("Converting character_traits to JSON type")
                conn.execute(db.text("ALTER TABLE image_analysis ALTER COLUMN character_traits TYPE JSON USING character_traits::json"))

            if 'plot_lines' in existing_columns and 'plot_lines' not in ['json', 'jsonb']:
                print("Converting plot_lines to JSON type")
                conn.execute(db.text("ALTER TABLE image_analysis ALTER COLUMN plot_lines TYPE JSON USING plot_lines::json"))

            if 'dramatic_moments' in existing_columns and 'dramatic_moments' not in ['json', 'jsonb']:
                print("Converting dramatic_moments to JSON type")
                conn.execute(db.text("ALTER TABLE image_analysis ALTER COLUMN dramatic_moments TYPE JSON USING dramatic_moments::json"))

            conn.commit()

        print("Database migration completed successfully")

if __name__ == "__main__":
    migrate_database()