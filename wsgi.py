
"""
WSGI entry point for the Flask application.
"""

import os
import sys
import gc
import logging
import psutil

from main import create_app

# Configure server-wide logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Force garbage collection before app starts
logger.info("Performing initial garbage collection")
collected = gc.collect()
logger.info(f"Initial garbage collection complete - collected {collected} objects")

# Set higher GC threshold to avoid running GC too often during request handling
if hasattr(gc, 'set_threshold'):
    # Get the current threshold values
    old_thresholds = gc.get_threshold()
    # Set new threshold with higher values, but periodically triggering collection
    new_thresholds = (old_thresholds[0] * 2, old_thresholds[1] * 2, old_thresholds[2] * 2)
    gc.set_threshold(*new_thresholds)
    logger.info(f"GC thresholds set from {old_thresholds} to {new_thresholds}")

# Monitor system resources before starting the app
try:
    process = psutil.Process()
    # Limit memory usage
    soft, hard = process.rlimit(psutil.RLIMIT_AS)
    logger.info(f"Current memory limits: soft={soft}, hard={hard}")
    
    # Log current memory usage
    memory_info = process.memory_info()
    logger.info(f"Starting memory usage: RSS={memory_info.rss/1024/1024:.2f}MB, VMS={memory_info.vms/1024/1024:.2f}MB")
    
    # Log system memory information
    system_memory = psutil.virtual_memory()
    logger.info(f"System memory: total={system_memory.total/1024/1024:.2f}MB, available={system_memory.available/1024/1024:.2f}MB ({system_memory.percent}% used)")
except Exception as e:
    logger.warning(f"Could not monitor system resources: {str(e)}")

# Create the Flask application
app = create_app()

if __name__ == '__main__':
    # Use environment variable for port with fallback to 5000 for development
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
