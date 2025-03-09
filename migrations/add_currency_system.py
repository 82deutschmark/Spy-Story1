import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def upgrade():
    """Add currency system tables and columns"""
    with app.app_context():
        try:
            connection = db.engine.connect()
            
            # Create currency table
            connection.execute(db.text("""
                CREATE TABLE IF NOT EXISTS currency (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(32) NOT NULL,
                    symbol VARCHAR(8) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            
            # Add currency columns to existing tables
            connection.execute(db.text("""
                ALTER TABLE user_progress 
                ADD COLUMN IF NOT EXISTS currency_balances JSONB DEFAULT '{"💎": 500, "💷": 5000, "💶": 5000, "💴": 5000, "💵": 5000}'
            """))
            
            connection.execute(db.text("""
                ALTER TABLE story_choice 
                ADD COLUMN IF NOT EXISTS currency_requirements JSONB DEFAULT '{}'
            """))
            
            # Insert default currencies
            currencies = [
                ("diamond", "💎"),
                ("pound", "💷"),
                ("euro", "💶"),
                ("yen", "💴"),
                ("dollar", "💵")
            ]
            
            for name, symbol in currencies:
                connection.execute(
                    db.text("INSERT INTO currency (name, symbol) VALUES (:name, :symbol) ON CONFLICT DO NOTHING"),
                    {"name": name, "symbol": symbol}
                )
            
            connection.commit()
            logger.info("Currency system migration completed successfully")
            
        except Exception as e:
            logger.error(f"Error in migration: {str(e)}")
            raise

if __name__ == "__main__":
    upgrade()
