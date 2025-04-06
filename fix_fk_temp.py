import sys
from sqlalchemy import create_engine, text

# Database credentials from .env
db_uri = "postgresql://neondb_owner:npg_H4GPNkYFlg7C@ep-lingering-silence-a5emvgcs.us-east-2.aws.neon.tech/neondb?sslmode=require"

def fix_foreign_key():
    """Fix the mission.giver_id foreign key constraint"""
    sql = """
    -- Drop the existing constraint if it exists
    ALTER TABLE mission 
    DROP CONSTRAINT IF EXISTS mission_giver_id_fkey;

    -- Add the correct foreign key constraint
    ALTER TABLE mission
    ADD CONSTRAINT mission_giver_id_fkey 
    FOREIGN KEY (giver_id) 
    REFERENCES characters(id) 
    ON DELETE SET NULL;
    """
    
    try:
        engine = create_engine(db_uri)
        with engine.connect() as connection:
            connection.execute(text(sql))
            connection.commit()
        print("Successfully fixed foreign key constraint")
    except Exception as e:
        print(f"Error fixing foreign key: {e}")

if __name__ == "__main__":
    fix_foreign_key()
