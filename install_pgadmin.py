
import subprocess
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def install_pgadmin():
    """Install pgAdmin 4 and dependencies"""
    logger.info("Installing pgAdmin 4 and required dependencies...")
    
    try:
        # Install required packages
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", 
            "pgadmin4==7.2", "waitress==2.1.2", "psycopg2-binary"
        ])
        
        # Set up pgAdmin configuration directories
        import os
        os.makedirs(os.path.expanduser('~/.pgadmin'), exist_ok=True)
        
        logger.info("pgAdmin 4 installation completed successfully!")
        logger.info("To run pgAdmin 4, use: python run_pgadmin.py")
        logger.info("Then visit: /debug/pgadmin")
        
        return True
    except Exception as e:
        logger.error(f"Error installing pgAdmin 4: {str(e)}")
        return False

if __name__ == "__main__":
    install_pgadmin()
