from sqlalchemy import create_engine, text
from main import create_app

app = create_app()
engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS node_count INT DEFAULT 0'))
    conn.commit()
    print("Migration successful: Added node_count column to user_progress table") 