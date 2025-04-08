"""
Utility module for analyzing narrative text.
Extracts meaningful information from story text to enhance context management.
"""

from typing import Dict, List, Any, Optional
import re
from models.character_data import Character
from datetime import datetime
import logging

# Configure module logger
logger = logging.getLogger(__name__)

def extract_character_interactions(narrative_text: str, characters: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    """
    Extract character interactions from narrative text.
    
    Args:
        narrative_text: The story text to analyze
        characters: List of character dictionaries with at least 'name' key
        
    Returns:
        Dictionary mapping character names to lists of sentences they appear in
    """
    interactions = {}
    
    if not narrative_text or not characters:
        return interactions
    
    # Create a mapping of character names to their full info
    char_map = {}
    for char in characters:
        name = char.get('name', '') or char.get('character_name', '')
        if name:
            char_map[name.lower()] = char
    
    # Split narrative into sentences
    sentences = narrative_text.split('.')
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        # Check each character
        for char_name, char_info in char_map.items():
            if char_name in sentence.lower():
                if char_name not in interactions:
                    interactions[char_name] = []
                interactions[char_name].append(sentence)
    
    logger.debug(f"Extracted {len(interactions)} character interactions")
    return interactions

def extract_previous_choices(narrative_text: str) -> List[str]:
    """
    Extract previous choices from narrative text.
    
    Args:
        narrative_text: The story text to analyze
        
    Returns:
        List of extracted choice descriptions
    """
    choices = []
    
    if not narrative_text:
        return choices
    
    # Look for choice-related phrases
    choice_indicators = [
        "you chose to",
        "you decided to",
        "you opted to",
        "you selected",
        "you picked",
        "you went with"
    ]
    
    sentences = narrative_text.split('.')
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
            
        for indicator in choice_indicators:
            if indicator in sentence.lower():
                # Clean up the choice text
                choice = sentence.lower().replace(indicator, '').strip()
                if choice:
                    choices.append(choice)
    
    logger.debug(f"Extracted {len(choices)} previous choices")
    return choices

def process_mission_update(mission_update: Dict[str, Any], mission: Any) -> Dict[str, Any]:
    """
    Process and validate mission updates from the story continuation.
    
    Args:
        mission_update: Update data from the story generation
        mission: Mission model or dictionary to update
        
    Returns:
        Processed mission update data
    """
    if not mission_update:
        return {"status": "unchanged", "progress_details": "No mission progress in this segment"}
        
    status = mission_update.get('status', 'unchanged')
    progress_details = mission_update.get('progress_details', '')
    
    # Validate status
    valid_statuses = ['unchanged', 'progressed', 'completed', 'failed']
    if status not in valid_statuses:
        logger.warning(f"Invalid mission status '{status}', defaulting to 'unchanged'")
        status = 'unchanged'
        
    # Calculate progress change based on status
    progress_change = 0
    if status == 'progressed':
        progress_change = 25  # Significant progress
    elif status == 'completed':
        progress_change = 100 - (mission.progress if mission else 0)  # Complete the mission
    elif status == 'failed':
        progress_change = -50  # Major setback
        
    # Update mission progress if needed
    if progress_change != 0 and mission:
        current_progress = (mission.progress if hasattr(mission, 'progress') else 0)
        new_progress = max(0, min(100, current_progress + progress_change))
        
        # If mission is a model instance, use its update_progress method
        if hasattr(mission, 'update_progress'):
            mission.update_progress(new_progress, progress_details)
        else:
            # If it's a dictionary, update it directly
            mission['progress'] = new_progress
            if 'progress_updates' not in mission:
                mission['progress_updates'] = []
            mission['progress_updates'].append({
                'progress': new_progress,
                'timestamp': datetime.utcnow().isoformat(),
                'description': progress_details
            })
        
        # Update mission status if completed or failed
        if status in ['completed', 'failed']:
            if hasattr(mission, 'status'):
                mission.status = status
                if status == 'completed':
                    mission.completed_at = datetime.utcnow()
            else:
                mission['status'] = status
                if status == 'completed':
                    mission['completed_at'] = datetime.utcnow().isoformat()
    
    logger.info(f"Mission update: {status} (progress change: {progress_change})")
    return {
        "status": status,
        "progress_details": progress_details,
        "progress_change": progress_change,
        "new_progress": (mission.progress if hasattr(mission, 'progress') else 0)
    }

def clean_story_response(story_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean and validate the story response data.
    
    Args:
        story_data: Raw story data from the API
        
    Returns:
        Cleaned story data
    """
    if not story_data:
        logger.error("Empty story data received")
        return {
            "narrative_text": "Error: Story generation failed. Please try again.",
            "choices": [],
            "mission_update": {"status": "unchanged", "progress_details": "No progress due to error"}
        }
    
    # Handle different key names for the story/narrative text
    story_text = ""
    if "narrative_text" in story_data:
        story_text = story_data["narrative_text"]
    elif "story" in story_data:
        story_text = story_data["story"]
    else:
        logger.error(f"Neither 'story' nor 'narrative_text' key found in response: {story_data.keys()}")
        story_text = "Error: Story generation failed. Please try again."
        
    # Remove character IDs
    clean_text = re.sub(r'\(character_id:\s*\d+\)', '', story_text)
    # Remove choice IDs
    clean_text = re.sub(r'choice_\d+', '', clean_text)
    # Clean up any double spaces or awkward punctuation that might result
    clean_text = re.sub(r'\s+', ' ', clean_text)
    clean_text = re.sub(r'\s*([.,!?])\s*', r'\1 ', clean_text)
    
    # Process choices: ensure each choice has a unique id
    choices = story_data.get('choices', [])
    for i, choice in enumerate(choices):
        if 'choice_id' not in choice:
            choice['choice_id'] = f"choice_{i}_{datetime.utcnow().timestamp()}"
            
        # Clean up any character IDs from choice text
        if 'text' in choice:
            choice['text'] = re.sub(r'\(character_id:\s*\d+\)', '', choice['text'])
            choice['text'] = re.sub(r'\s+', ' ', choice['text'])
            choice['text'] = re.sub(r'\s*([.,!?])\s*', r'\1 ', choice['text'])
            
        # Ensure character_id is properly formatted: either None or an integer
        if 'character_id' not in choice:
            choice['character_id'] = None
        elif choice['character_id'] is not None:
            # If it's a string but not a digit, try to find the character by name
            if isinstance(choice['character_id'], str) and not choice['character_id'].isdigit():
                # Look up by name
                char_name = choice['character_id']
                char = Character.query.filter_by(character_name=char_name).first()
                if char:
                    choice['character_id'] = char.id
                else:
                    choice['character_id'] = None
            # If it's a digit string, convert to int
            elif isinstance(choice['character_id'], str) and choice['character_id'].isdigit():
                choice['character_id'] = int(choice['character_id'])
            # If it's not an int at this point, set to None
            elif not isinstance(choice['character_id'], int):
                choice['character_id'] = None
    
    # Return a flattened structure
    return {
        "narrative_text": clean_text,
        "choices": choices,
        "mission_update": story_data.get("mission_update", {})
    }
