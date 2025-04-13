-- SQL Script to add agent_codename column to user_progress table
-- Run this script directly against your PostgreSQL database

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_progress' AND column_name = 'agent_codename'
    ) THEN
        ALTER TABLE user_progress ADD COLUMN agent_codename VARCHAR(255);
        
        -- Create an index for faster lookups
        CREATE INDEX ix_user_progress_agent_codename ON user_progress (agent_codename);
        
        -- Populate from existing game_state data
        UPDATE user_progress
        SET agent_codename = (game_state->>'protagonist_name')
        WHERE game_state->>'protagonist_name' IS NOT NULL;
        
        RAISE NOTICE 'Column agent_codename added to user_progress table';
    ELSE
        RAISE NOTICE 'Column agent_codename already exists';
    END IF;
END;
$$;
