
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from services.story_maker import generate_story
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_story_generation():
    """Test the improved story generation service"""
    logger.info("Testing story generation with improved prompts...")
    
    # Test parameters
    test_conflict = "Mind control experiment"
    test_setting = "Arctic Research Base" 
    test_narrative_style = "Classic Bond film"
    test_mood = "Action-packed gunfights"
    
    # Sample character info
    test_character = {
        "name": "Dr. Alexandra Frost",
        "character_traits": ["brilliant", "ruthless", "calculating"],
        "role": "mission-giver",
        "plot_lines": ["Has critical intelligence about a secret mind control program"]
    }
    
    # Test generation
    try:
        result = generate_story(
            conflict=test_conflict,
            setting=test_setting,
            narrative_style=test_narrative_style,
            mood=test_mood,
            character_info=test_character
        )
        
        # Check if story was generated successfully
        if result and 'stories' in result:
            story_data = result['stories']
            
            # Log story details
            logger.info(f"Generated story title: {story_data.get('title', 'No title')}")
            
            # Check story length (test for improvement)
            story_text = story_data.get('story', '')
            word_count = len(story_text.split())
            logger.info(f"Story length: {word_count} words")
            
            # Check if it meets our enhanced length requirement (at least 800 words)
            if word_count < 800:
                logger.warning(f"Story length ({word_count}) is less than the target minimum (800 words)")
            else:
                logger.info("✓ Story length meets the enhanced requirements")
                
            # Check if all required elements are present
            required_elements = ['title', 'story', 'choices', 'mission', 'characters']
            missing_elements = [elem for elem in required_elements if elem not in story_data]
            
            if missing_elements:
                logger.warning(f"Missing required elements: {missing_elements}")
            else:
                logger.info("✓ All required story elements are present")
                
            # Check for character integration
            if test_character['name'] in story_text:
                logger.info("✓ Character successfully integrated into story")
            else:
                logger.warning("Character not properly integrated into story")
                
            # Save result for manual review
            with open('test_story_output.json', 'w') as f:
                json.dump(result, f, indent=2)
            logger.info("Test story saved to 'test_story_output.json' for manual review")
            
    except Exception as e:
        logger.error(f"Story generation test failed: {str(e)}")

if __name__ == "__main__":
    test_story_generation()
    logger.info("Story generation test completed.")
