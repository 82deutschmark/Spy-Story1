"""
Mission Generator for Spy Story Game
==================================

This module handles the creation and management of spy missions, a core gameplay element
that drives the narrative and player progression. It generates missions from story content,
manages mission states, and handles rewards.

Key Features:
------------
- Mission extraction from story text
- Dynamic mission generation with varying difficulty
- Mission progress tracking
- Reward calculation and distribution
- Character relationship integration (mission givers and targets)

The module ensures missions are:
1. Narratively consistent with the story
2. Balanced in terms of difficulty and rewards
3. Integrated with character relationships
4. Properly tracked in user progress

Dependencies:
------------
- Database models (Mission, UserProgress, StoryGeneration)
- Scene image handling for character integration
- Currency system for rewards
"""

import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import json

from models import Mission, UserProgress, StoryGeneration
from models.scene_images import SceneImages
from database import db

logger = logging.getLogger(__name__)

# Mission difficulty levels with their corresponding reward multipliers
DIFFICULTY_LEVELS = {
    'easy': 1.0,    # Standard missions, good for new players
    'medium': 2.0,  # More complex missions with higher stakes
    'hard': 3.5     # High-risk, high-reward missions
}

# Base reward amounts for different currencies
BASE_REWARDS = {
    '💎': 1,      # Diamonds - premium currency
    '💵': 1500,   # Dollars - standard US currency
    '💷': 1400,   # Pounds - UK operations
    '💶': 1450,   # Euros - European missions
    '💴': 150000  # Yen - Asian operations
}

def extract_mission_details(story_text: str) -> Optional[Dict[str, Any]]:
    """
    Extract mission details from generated story text using advanced pattern matching.
    Identifies key mission elements like the giver, target, objective, and rewards.
    
    Args:
        story_text (str): The story text containing mission information
        
    Returns:
        Optional[Dict[str, Any]]: Dictionary containing:
            - giver: Name of the mission-giving character
            - target: Primary mission target or opponent
            - objective: Clear mission goal
            - reward_amount: Numerical reward value
            - reward_currency: Currency symbol for reward
            
    Example:
        >>> details = extract_mission_details("Agent Smith of MI6 needs you to infiltrate Dr. Evil's plans...")
        >>> print(details['giver'])
        'Smith'
    """
    try:
        # Example regex patterns (can be expanded/adjusted based on story format)
        giver_match = re.search(r'figure of (\w+ Corp|[A-Z][a-z]+)', story_text) 
        target_match = re.search(r'on (\w+\'s) plans|against (\w+)', story_text)
        objective_match = re.search(r'mission—(.+?)[\.\']', story_text)
        reward_match = re.search(r'reward\?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*([💎💵💷💶💴])', story_text)

        giver = giver_match.group(1) if giver_match else None
        target = target_match.group(1) if target_match and target_match.group(1) else \
                target_match.group(2) if target_match else None
        objective = objective_match.group(1).strip() if objective_match else "Objective not clearly specified."
        
        # Clean target (if 'Ekaterina's', remove "'s")
        if target and "'s" in target:
            target = target.replace("'s", "")

        # Parse reward
        reward_amount = int(reward_match.group(1).replace(",", "")) if reward_match else 1500
        reward_currency = reward_match.group(2) if reward_match else '💵'

        logger.debug(f"Extracted Giver: {giver}, Target: {target}, Objective: {objective}, Reward: {reward_amount} {reward_currency}")

        return {
            "giver": giver,
            "target": target,
            "objective": objective,
            "reward_amount": reward_amount,
            "reward_currency": reward_currency
        }

    except Exception as e:
        logger.error(f"Failed to extract mission details: {e}")
        return None


def create_mission_from_story(user_id: str, story_text: str, story_id: Optional[int] = None) -> Optional[Mission]:
    """
    Creates a structured mission from story content, integrating it with game systems.
    
    This function:
    1. Extracts mission details from story
    2. Links mission to relevant characters
    3. Sets appropriate difficulty and rewards
    4. Integrates with user progress tracking
    
    Args:
        user_id (str): ID of the player
        story_text (str): Generated story text containing mission details
        story_id (Optional[int]): ID of the related story segment
        
    Returns:
        Optional[Mission]: Fully configured mission object ready for gameplay
    """
    details = extract_mission_details(story_text)
    if not details:
        logger.warning("No mission details extracted from story.")
        return None

    try:
        # Fetch giver/target from DB based on extracted names (example logic)
        giver = None
        target = None
        
        if details['giver']:
            giver = SceneImages.query.filter(
                SceneImages.image_type == 'character',
                SceneImages.name.ilike(f"%{details['giver']}%")
            ).first()
            
        if details['target']:
            target = SceneImages.query.filter(
                SceneImages.image_type == 'character', 
                SceneImages.name.ilike(f"%{details['target']}%")
            ).first()

        # Fall back to None if not found
        giver_id = giver.id if giver else None
        target_id = target.id if target else None

        # Auto-assign difficulty based on reward amount
        difficulty = "easy"
        if details['reward_amount'] > BASE_REWARDS[details['reward_currency']] * 1.5:
            difficulty = "medium"
        if details['reward_amount'] > BASE_REWARDS[details['reward_currency']] * 2.5:
            difficulty = "hard"
            
        # Generate a title if none provided
        title = f"Mission: {details['objective'][:30]}..." if len(details['objective']) > 30 else f"Mission: {details['objective']}"

        # Create description from extracted details
        description = f"Mission from {details['giver'] if details['giver'] else 'Unknown'} to {details['objective']}. "
        description += f"Target: {details['target'] if details['target'] else 'Unknown'}. "
        description += f"Reward: {details['reward_amount']} {details['reward_currency']}."

        # Create deadline text
        deadline = f"Complete within {3 if difficulty == 'hard' else 5} days"

        # Create mission
        mission = Mission(
            user_id=user_id,
            title=title,
            description=description,
            giver_id=giver_id,
            target_id=target_id,
            objective=details['objective'],
            difficulty=difficulty,
            reward_currency=details['reward_currency'],
            reward_amount=details['reward_amount'],
            deadline=deadline,
            story_id=story_id
        )
        
        db.session.add(mission)
        db.session.commit()
        
        # Add to user's active missions
        user_progress = UserProgress.query.filter_by(user_id=user_id).first()
        if user_progress:
            if not user_progress.active_missions:
                user_progress.active_missions = []
            
            if mission.id not in user_progress.active_missions:
                user_progress.active_missions.append(mission.id)
                db.session.commit()
        
        logger.info(f"Created mission from story for user {user_id}: {mission.title}")
        return mission
        
    except Exception as e:
        logger.error(f"Error creating mission from story: {str(e)}")
        db.session.rollback()
        return None


def generate_mission(user_id: str, story_id: Optional[int] = None) -> Optional[Mission]:
    """
    Generate a new mission either from story content or dynamically.
    
    This is a core gameplay function that:
    1. Creates missions from story content when available
    2. Ensures proper character relationships (givers/targets)
    3. Balances difficulty and rewards
    4. Integrates with user progression
    
    Args:
        user_id (str): ID of the player
        story_id (Optional[int]): Specific story to base mission on
        
    Returns:
        Optional[Mission]: New mission ready for player assignment
    """
    try:
        # If story_id is provided, try to extract mission from that story
        if story_id:
            story = StoryGeneration.query.get(story_id)
            if story and story.generated_story:
                # Try to parse the story content - handle both string and dict
                try:
                    story_data = story.generated_story
                    if isinstance(story_data, str):
                        story_data = json.loads(story_data)
                    
                    # If the story has a mission field, use that directly
                    if 'mission' in story_data and story_data['mission'] and story_data['mission'].get('title'):
                        mission_data = story_data['mission']
                        
                        # Try to find target and giver characters
                        giver_id = None
                        target_id = None
                        
                        # If giver_id is provided directly
                        if mission_data.get('giver_id') and str(mission_data['giver_id']).isdigit():
                            giver_id = int(mission_data['giver_id'])
                        # Otherwise try to find by name
                        elif mission_data.get('giver'):
                            giver = SceneImages.query.filter(
                                SceneImages.image_type == 'character',
                                SceneImages.name.ilike(f"%{mission_data['giver']}%")
                            ).first()
                            if giver:
                                giver_id = giver.id
                        
                        # If target_id is provided directly  
                        if mission_data.get('target_id') and str(mission_data['target_id']).isdigit():
                            target_id = int(mission_data['target_id'])
                        # Otherwise try to find by name
                        elif mission_data.get('target'):
                            target = SceneImages.query.filter(
                                SceneImages.image_type == 'character',
                                SceneImages.name.ilike(f"%{mission_data['target']}%")
                            ).first()
                            if target:
                                target_id = target.id
                                
                        # Create the mission
                        mission = Mission(
                            user_id=user_id,
                            title=mission_data.get('title', 'Untitled Mission'),
                            description=mission_data.get('description', ''),
                            giver_id=giver_id,
                            target_id=target_id,
                            objective=mission_data.get('objective', ''),
                            difficulty=mission_data.get('difficulty', 'medium').lower(),
                            reward_currency=mission_data.get('reward_currency', '💵'),
                            reward_amount=int(mission_data.get('reward_amount', 1500)) if mission_data.get('reward_amount') else 1500,
                            deadline=mission_data.get('deadline', ''),
                            story_id=story_id
                        )
                        
                        db.session.add(mission)
                        db.session.commit()
                        
                        # Add to user's active missions
                        user_progress = UserProgress.query.filter_by(user_id=user_id).first()
                        if user_progress:
                            if not user_progress.active_missions:
                                user_progress.active_missions = []
                                
                            if mission.id not in user_progress.active_missions:
                                user_progress.active_missions.append(mission.id)
                                db.session.commit()
                        
                        logger.info(f"Created mission from story JSON for user {user_id}: {mission.title}")
                        return mission
                    
                    # If no mission in the JSON, try to extract from story text
                    if 'story' in story_data and story_data['story']:
                        return create_mission_from_story(user_id, story_data['story'], story_id)
                    
                except Exception as e:
                    logger.error(f"Error parsing story data: {str(e)}")
                    # If JSON parsing fails, try to use the raw story text
                    if isinstance(story.generated_story, str):
                        return create_mission_from_story(user_id, story.generated_story, story_id)
                    elif isinstance(story.generated_story, dict):
                        story_text = story.generated_story.get('story', '')
                        if story_text:
                            return create_mission_from_story(user_id, story_text, story_id)
            
        # If we didn't create a mission from story, fall back to getting a recent story
        recent_story = StoryGeneration.query.filter_by(user_id=user_id).order_by(StoryGeneration.created_at.desc()).first()
        if recent_story and recent_story.generated_story:
            if isinstance(recent_story.generated_story, str):
                return create_mission_from_story(user_id, recent_story.generated_story, recent_story.id)
            elif isinstance(recent_story.generated_story, dict):
                story_text = recent_story.generated_story.get('story', '')
                if story_text:
                    return create_mission_from_story(user_id, story_text, recent_story.id)
            
        # If we still don't have a mission, log that we couldn't generate one
        logger.warning(f"Could not generate mission for user {user_id}")
        return None
        
    except Exception as e:
        logger.error(f"Error generating mission: {str(e)}")
        db.session.rollback()
        return None


def get_user_active_missions(user_id: str) -> List[Mission]:
    """Get all active missions for a user"""
    return Mission.query.filter_by(user_id=user_id, status='active').all()


def get_mission_by_id(mission_id: int) -> Optional[Mission]:
    """Get a mission by ID"""
    return Mission.query.get(mission_id)


def update_mission_progress(mission_id: int, progress: int, description: Optional[str] = None) -> bool:
    """Update progress on a mission"""
    mission = get_mission_by_id(mission_id)
    if not mission:
        return False
    
    return mission.update_progress(progress, description)


def complete_mission(mission_id: int, user_id: str) -> bool:
    """Mark a mission as completed and award the reward"""
    mission = get_mission_by_id(mission_id)
    if not mission or mission.status != 'active':
        return False
    
    # Update mission status
    mission.status = 'completed'
    mission.completed_at = datetime.utcnow()
    mission.progress = 100
    
    # Add progress update
    if not mission.progress_updates:
        mission.progress_updates = []
    
    mission.progress_updates.append({
        "progress": 100,
        "status": "completed",
        "timestamp": datetime.utcnow().isoformat(),
        "description": "Mission successfully completed!"
    })
    
    # Award reward to user
    user_progress = UserProgress.query.filter_by(user_id=user_id).first()
    if user_progress:
        # Move mission from active to completed list
        if not user_progress.active_missions:
            user_progress.active_missions = []
        if not user_progress.completed_missions:
            user_progress.completed_missions = []
            
        if mission.id in user_progress.active_missions:
            user_progress.active_missions.remove(mission.id)
            
        user_progress.completed_missions.append(mission.id)
        
        # Add currency reward
        if mission.reward_currency in user_progress.currency_balances:
            user_progress.currency_balances[mission.reward_currency] += mission.reward_amount
        else:
            user_progress.currency_balances[mission.reward_currency] = mission.reward_amount
            
        # Add experience points (based on difficulty)
        xp_rewards = {
            'easy': 50,
            'medium': 100,
            'hard': 200
        }
        xp_reward = xp_rewards.get(mission.difficulty, 50)
        user_progress.add_experience_points(xp_reward, f"Completed mission: {mission.title}")
        
        # Improve relationship with mission giver
        if mission.giver_id:
            user_progress.change_character_relationship(
                mission.giver_id, 
                2, 
                f"Successfully completed mission: {mission.title}"
            )
            
        # Worsen relationship with target
        if mission.target_id:
            user_progress.change_character_relationship(
                mission.target_id, 
                -3, 
                f"Targeted in mission: {mission.title}"
            )
    
    db.session.commit()
    return True


def fail_mission(mission_id: int, user_id: str, reason: Optional[str] = None) -> bool:
    """Mark a mission as failed"""
    mission = get_mission_by_id(mission_id)
    if not mission or mission.status != 'active':
        return False
    
    # Update mission status
    mission.status = 'failed'
    
    # Add progress update
    if not mission.progress_updates:
        mission.progress_updates = []
    
    update = {
        "status": "failed",
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if reason:
        update["reason"] = reason
        
    mission.progress_updates.append(update)
    
    # Update user progress
    user_progress = UserProgress.query.filter_by(user_id=user_id).first()
    if user_progress:
        # Move mission from active to failed list
        if not user_progress.active_missions:
            user_progress.active_missions = []
        if not user_progress.failed_missions:
            user_progress.failed_missions = []
            
        if mission.id in user_progress.active_missions:
            user_progress.active_missions.remove(mission.id)
            
        user_progress.failed_missions.append(mission.id)
        
        # Worsen relationship with mission giver
        if mission.giver_id:
            user_progress.change_character_relationship(
                mission.giver_id, 
                -1, 
                f"Failed mission: {mission.title}"
            )
    
    db.session.commit()
    return True
