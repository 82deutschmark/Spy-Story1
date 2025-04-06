"""
Flask application factory for the Spy Story game.
"""

from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os
import logging
from routes.api_routes import api_bp
from routes.main_routes import main_bp
from utils.error_handlers import register_error_handlers

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    """Create and configure the Flask application."""
    # Load environment variables
    load_dotenv()
    
    # Create Flask app
    app = Flask(__name__)
    
    # Configure the app
    app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key")
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }
    app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # CORS configuration
    CORS(app, resources={
        r"/api/unity/*": {
            "origins": "*",
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(main_bp)
    
    # Optional: Add a temporary diagnostics route
    if app.config['DEBUG']:
        @app.route('/config_dump')
        def config_dump():
            # Dump selected config keys for diagnosis
            safe_config = {
                "DEBUG": app.config.get("DEBUG"),
                "FLASK_CONFIG": app.config.get("FLASK_CONFIG", {}),
                "API_BASE_URL": os.environ.get("API_BASE_URL", "not set"),
                "OPENAI_API_KEY_PRESENT": bool(os.environ.get("OPENAI_API_KEY"))
            }
            return jsonify(safe_config)
    
    @app.cli.command('fix-fk')
    def fix_foreign_key():
        """Fix the mission.giver_id foreign key constraint"""
        from sqlalchemy import text
        
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
            with db.engine.connect() as connection:
                connection.execute(text(sql))
                connection.commit()
            print("Successfully fixed foreign key constraint")
        except Exception as e:
            print(f"Error fixing foreign key: {e}")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)