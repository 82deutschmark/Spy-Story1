#!/usr/bin/env python3
"""
Simple test to verify the OpenAIContextManager system message includes the correct node count.
"""

import logging
from utils.context_manager import OpenAIContextManager

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_system_message():
    """Test the system message includes the correct node count."""
    # Create an OpenAIContextManager
    context_manager = OpenAIContextManager()
    
    # Use different node counts to verify the message
    for count in [1, 5, 10]:
        # Build a system message with this node count
        message = context_manager.build_continuation_system_message(
            mood="suspenseful",
            narrative_style="cinematic",
            node_count=count
        )
        
        # Check if the message includes the correct continuation number
        expected_text = f"This is CONTINUATION #{count} of an existing story"
        if expected_text in message:
            logger.info(f"✅ System message correctly contains '{expected_text}'")
        else:
            logger.error(f"❌ System message does not contain expected text: '{expected_text}'")
            logger.error(f"Message starts with: {message[:200]}...")

if __name__ == "__main__":
    logger.info("=== OpenAI Context Manager Test ===")
    test_system_message()
    logger.info("=== Test Complete ===") 