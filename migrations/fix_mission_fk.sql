-- Fix mission table foreign key constraints
-- Changes giver_id to reference characters.id instead of deprecated_image_analysis

BEGIN;

-- Drop the existing constraint if it exists
ALTER TABLE mission 
DROP CONSTRAINT IF EXISTS mission_giver_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE mission
ADD CONSTRAINT mission_giver_id_fkey 
FOREIGN KEY (giver_id) 
REFERENCES characters(id) 
ON DELETE SET NULL;

COMMIT;

-- Verify the change
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.table_name = 'mission' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'giver_id';
