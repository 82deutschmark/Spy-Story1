#!/usr/bin/env python3
"""
Test API Logging Script

This script tests the OpenAI API request logging functionality.
Run it to see what data is being sent to OpenAI during API calls.

Usage:
    python test_api_logging.py
"""

import os
import sys
import logging

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

# Set working directory to project root if needed
if not os.path.exists("utils"):
    # Try to navigate to project root
    if os.path.exists("../utils"):
        os.chdir("..")
    else:
        print("Error: Cannot find utils directory. Run this script from the project root or its parent directory.")
        sys.exit(1)

# Import the test function
try:
    from utils.context_manager import test_api_logging, configure_logging
    from openai import OpenAI
except ImportError as e:
    print(f"Error importing required modules: {str(e)}")
    print("Make sure you're running this script from the project root directory.")
    sys.exit(1)

if __name__ == "__main__":
    print("Testing OpenAI API logging...")
    
    # Ensure OpenAI API key is set
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable is not set.")
        print("Please set it before running this script. For example:")
        print("   export OPENAI_API_KEY=your_api_key_here  # for Linux/Mac")
        print("   set OPENAI_API_KEY=your_api_key_here     # for Windows CMD")
        print("   $env:OPENAI_API_KEY='your_api_key_here'  # for Windows PowerShell")
        sys.exit(1)
    
    # Configure logging and run test
    configure_logging()
    test_api_logging()
    
    print("Test complete. Check the logs above to see the API request and response details.") 