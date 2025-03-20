-- First add the column as nullable to allow updating existing records
ALTER TABLE story_generation ADD COLUMN user_id VARCHAR(255);

-- Update existing records to use user_id from user_progress
UPDATE story_generation sg
SET user_id = (
    SELECT up.user_id 
    FROM user_progress up 
    WHERE up.current_story_id = sg.id 
    LIMIT 1
);

-- Make the column not null after updating
ALTER TABLE story_generation ALTER COLUMN user_id SET NOT NULL;

-- Add index for performance
CREATE INDEX idx_story_user_id ON story_generation(user_id);
