
import os
import sys
import logging
from waitress import serve

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_pgadmin():
    """Run pgAdmin 4 web server"""
    try:
        # Check if pgAdmin4 is installed
        try:
            from pgadmin4 import create_app
        except ImportError:
            logger.error("pgAdmin4 is not installed. Run 'python -m pip install pgadmin4==7.2 waitress==2.1.2 psycopg2-binary' first.")
            return
        
        # Set environment variables for pgAdmin
        os.environ['PGADMIN_SETUP_EMAIL'] = os.environ.get('PGADMIN_EMAIL', 'user@example.com')
        os.environ['PGADMIN_SETUP_PASSWORD'] = os.environ.get('PGADMIN_PASSWORD', 'pgadmin')
        os.environ['PGADMIN_CONFIG_SERVER_MODE'] = 'False'
        os.environ['PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED'] = 'False'
        os.environ['PGADMIN_CONFIG_ENHANCED_COOKIE_PROTECTION'] = 'False'
        
        # Create pgAdmin application
        app = create_app()
        
        # Run on port 8080 to avoid conflict with the main app
        port = 8080
        logger.info(f"Starting pgAdmin 4 on port {port}...")
        logger.info(f"Access pgAdmin 4 at: http://{os.environ.get('REPL_SLUG', 'localhost')}.{os.environ.get('REPL_OWNER', 'local')}.repl.co:{port}")
        
        # Run with waitress for production-grade serving
        serve(app, host='0.0.0.0', port=port)
        
    except Exception as e:
        logger.error(f"Error running pgAdmin 4: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_pgadmin()
