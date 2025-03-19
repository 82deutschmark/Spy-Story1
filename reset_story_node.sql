-- Drop the existing table if it exists
DROP TABLE IF EXISTS story_node CASCADE;

-- Create the table with the correct schema
CREATE TABLE story_node (
    id SERIAL PRIMARY KEY,
    story_id INTEGER NOT NULL REFERENCES story_generation(id),
    narrative_text TEXT NOT NULL,
    image_id INTEGER,
    character_id INTEGER REFERENCES characters(id),
    is_endpoint BOOLEAN DEFAULT FALSE,
    generated_by_ai BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    achievement_id INTEGER REFERENCES achievement(id),
    branch_metadata JSONB,
    parent_node_id INTEGER REFERENCES story_node(id)
); 