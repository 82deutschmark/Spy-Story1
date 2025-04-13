"""
logging_config.py - Centralized Logging Configuration
=============================================

This module provides a centralized configuration for logging throughout
the application, replacing redundant logging setup code in multiple files.
It offers a minimal logging approach that prioritizes important application
events while reducing unnecessary API call logging.

Usage:
------
from utils.logging_config import configure_minimal_logging

# For standard minimal logging (recommended for production)
configure_minimal_logging()

# For debug mode with more verbose logging
configure_minimal_logging(debug_mode=True)
"""

import logging
import sys


def configure_minimal_logging(debug_mode=False):
    """
    Configure minimal logging focused on important application events only.
    
    Args:
        debug_mode (bool): If True, enables more verbose logging including
                           API requests/responses. Default is False.
    """
    # Get root logger
    root_logger = logging.getLogger()
    
    # Set overall log level (INFO for normal operation)
    root_logger.setLevel(logging.INFO)
    
    # Only add handlers if none exist (prevents duplicate handlers)
    if not root_logger.handlers:
        # Create console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        
        # Create formatter with focused, readable output
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        
        # Add handler to logger
        root_logger.addHandler(console_handler)
    
    # Configure external library logging based on debug mode
    # In production, we only care about warnings and errors from these libraries
    logging.getLogger("httpx").setLevel(
        logging.DEBUG if debug_mode else logging.WARNING
    )
    logging.getLogger("openai").setLevel(
        logging.DEBUG if debug_mode else logging.WARNING
    )
    
    # Application loggers
    app_logger = logging.getLogger("app")
    app_logger.setLevel(logging.INFO)
    
    # Log configuration status
    mode = "debug" if debug_mode else "production"
    app_logger.info(f"Logging configured in {mode} mode")
