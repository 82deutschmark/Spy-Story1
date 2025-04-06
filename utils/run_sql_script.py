import os
import psycopg2
from config import DB_URI

# Read SQL script
script_path = os.path.join(os.path.dirname(__file__), '..', 'migrations', 'fix_mission_fk.sql')
with open(script_path, 'r') as f:
    sql_script = f.read()

# Connect to database and execute
conn = psycopg2.connect(DB_URI)
conn.autocommit = True
cursor = conn.cursor()

try:
    cursor.execute(sql_script)
    print("SQL script executed successfully")
    # Print verification results
    cursor.execute("""
        SELECT tc.constraint_name, ccu.table_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'mission' AND kcu.column_name = 'giver_id';
    """)
    print("Verification results:", cursor.fetchall())
except Exception as e:
    print(f"Error executing script: {e}")
finally:
    cursor.close()
    conn.close()
