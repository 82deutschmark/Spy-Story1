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
- Database models (Mission, UserProgress, StoryGeneration, Character)
- Currency system for rewards
"""

import logging
import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import json

from models import Mission, UserProgress, StoryGeneration, Character
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

def extract_mission_details(story_text: str, characters: Optional[List[Dict]] = None) -> Optional[Dict[str, Any]]:
    """
    Extract mission details from generated story text by focusing on mission-giver character dialogue.
    Identifies key mission elements like the giver, target/villain, objective, deadline, and rewards.
    
    Args:
        story_text (str): The story text containing mission information
        characters (Optional[List[Dict]]): List of characters in the story with their details
        
    Returns:
        Optional[Dict[str, Any]]: Dictionary containing:
            - giver: Name and ID of the mission-giving character
            - giver_id: ID of the mission giver if available
            - target: Primary mission target or villain
            - target_id: ID of the target character if available
            - objective: Clear mission goal
            - deadline: Time constraint for the mission
            - reward_amount: Numerical reward value
            - reward_currency: Currency symbol for reward
            - difficulty: Estimated mission difficulty
    """
    try:
        logger.info("Starting mission extraction from story text...")
        
        mission_details = {
            "giver": None,
            "giver_id": None,
            "target": None,
            "target_id": None,
            "objective": "Objective not clearly specified.",
            "deadline": "As soon as possible",
            "reward_amount": 1500,
            "reward_currency": '',
            "difficulty": "medium"
        }
        
        # Identify potential mission-givers from character list
        mission_givers = []
        if characters:
            mission_givers = [
                char for char in characters 
                if char.get('character_role') == 'mission-giver' 
                or 'giver' in str(char.get('character_role', '')).lower()
            ]
            logger.info(f"Found {len(mission_givers)} potential mission givers in character list")
        
        # If we have identified mission givers, look for their dialogue
        if mission_givers:
            for giver in mission_givers:
                giver_name = giver.get('character_name') or giver.get('name')
                if not giver_name:
                    continue
                    
                logger.info(f"Looking for dialogue from mission giver: {giver_name}")
                
                # Find dialogue sections from this character (looking for quotes after character name)
                dialogue_pattern = rf"{re.escape(giver_name)}[^\"]*(\"[^\"]*\")"
                dialogue_matches = re.finditer(dialogue_pattern, story_text)
                
                for match in dialogue_matches:
                    dialogue = match.group(1).strip('"')
                    logger.info(f"Found dialogue from {giver_name}: {dialogue[:50]}..." if len(dialogue) > 50 else dialogue)
                    
                    # Set the giver information
                    mission_details["giver"] = giver_name
                    # Validate giver_id exists in characters table before using
                    if giver.get('id') and db.session.query(Character).filter_by(id=giver['id']).first():
                        mission_details["giver_id"] = giver.get('id')
                    else:
                        mission_details["giver_id"] = None
                        logger.warning(f"Invalid giver_id {giver.get('id')} - not found in characters table")
                    
                    # Extract mission components from dialogue
                    # Look for villain/target mentions
                    villain_patterns = [
                        r"(?:defeat|stop|investigate|find|locate|capture|eliminate|monitor) ([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)",
                        r"(?:target|villain|enemy|opponent) (?:is|will be) ([A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+)"
                    ]
                    
                    for pattern in villain_patterns:
                        villain_match = re.search(pattern, dialogue)
                        if villain_match:
                            mission_details["target"] = villain_match.group(1)
                            logger.info(f"Extracted target: {mission_details['target']}")
                            break
                    
                    # Extract objective - looking for what needs to be done
                    objective_patterns = [
                        r"need you to ([^\.]+)",
                        r"your mission is to ([^\.]+)",
                        r"objective is to ([^\.]+)",
                        r"assignment is to ([^\.]+)",
                        r"task is to ([^\.]+)"
                    ]
                    
                    for pattern in objective_patterns:
                        objective_match = re.search(pattern, dialogue)
                        if objective_match:
                            mission_details["objective"] = objective_match.group(1).strip()
                            logger.info(f"Extracted objective: {mission_details['objective']}")
                            break
                    
                    # Extract deadline
                    deadline_patterns = [
                        r"within (\d+) (days|hours|weeks)",
                        r"deadline is (\d+) (days|hours|weeks)",
                        r"must be completed in (\d+) (days|hours|weeks)",
                        r"you have (\d+) (days|hours|weeks)"
                    ]
                    
                    for pattern in deadline_patterns:
                        deadline_match = re.search(pattern, dialogue)
                        if deadline_match:
                            time_value = deadline_match.group(1)
                            time_unit = deadline_match.group(2)
                            mission_details["deadline"] = f"Complete within {time_value} {time_unit}"
                            logger.info(f"Extracted deadline: {mission_details['deadline']}")
                            break
                    
                    # Extract reward
                    reward_patterns = [
                        r"reward of (\d{1,3}(?:,\d{3})*|\d+)\s*([💎💵💷💶💴])",
                        r"(\d{1,3}(?:,\d{3})*|\d+)\s*([💎💵💷💶💴]) reward",
                        r"pay you (\d{1,3}(?:,\d{3})*|\d+)\s*([💎💵💷💶💴])",
                        r"payment of (\d{1,3}(?:,\d{3})*|\d+)\s*([💎💵💷💶💴])"
                    ]
                    
                    for pattern in reward_patterns:
                        reward_match = re.search(pattern, dialogue)
                        if reward_match:
                            try:
                                mission_details["reward_amount"] = int(reward_match.group(1).replace(",", ""))
                                mission_details["reward_currency"] = reward_match.group(2)
                                logger.info(f"Extracted reward: {mission_details['reward_amount']} {mission_details['reward_currency']}")
                                break
                            except ValueError:
                                pass
        
        # If we didn't find a mission giver from characters, fall back to more general patterns
        if not mission_details["giver"]:
            logger.info("No mission giver found in character dialogue, falling back to general patterns")
            
            # Look for figure of authority patterns
            giver_match = re.search(r'figure of (\w+ Corp|[A-Z][a-z]+)', story_text) 
            if giver_match:
                mission_details["giver"] = giver_match.group(1)
                logger.info(f"Extracted giver from general text: {mission_details['giver']}")
                
            # Look for mission briefings without specific character dialogue
            target_match = re.search(r'on (\w+\'s) plans|against (\w+)', story_text)
            if target_match:
                target = target_match.group(1) if target_match.group(1) else target_match.group(2)
                if target and "'s" in target:
                    target = target.replace("'s", "")
                mission_details["target"] = target
                logger.info(f"Extracted target from general text: {mission_details['target']}")
                
            objective_match = re.search(r'mission(?:—|\s+is\s+to|\s+to)(.+?)[\.\']', story_text)
            if objective_match:
                mission_details["objective"] = objective_match.group(1).strip()
                logger.info(f"Extracted objective from general text: {mission_details['objective']}")
                
            reward_match = re.search(r'reward\?\s*(\d{1,3}(?:,\d{3})*|\d+)\s*([💎💵💷💶💴])', story_text)
            if reward_match:
                try:
                    mission_details["reward_amount"] = int(reward_match.group(1).replace(",", ""))
                    mission_details["reward_currency"] = reward_match.group(2)
                    logger.info(f"Extracted reward from general text: {mission_details['reward_amount']} {mission_details['reward_currency']}")
                except ValueError:
                    pass
        
        # If we have a target name but no ID, try to find the ID from characters list
        if mission_details["target"] and not mission_details["target_id"] and characters:
            for char in characters:
                char_name = char.get('character_name') or char.get('name')
                if char_name and mission_details["target"] in char_name:
                    mission_details["target_id"] = char.get('id')
                    logger.info(f"Linked target name to character ID: {mission_details['target_id']}")
                    break
        
        # Determine difficulty based on reward amount
        if mission_details["reward_amount"] > BASE_REWARDS[mission_details["reward_currency"]] * 2.5:
            mission_details["difficulty"] = "hard"
        elif mission_details["reward_amount"] > BASE_REWARDS[mission_details["reward_currency"]] * 1.5:
            mission_details["difficulty"] = "medium"
        else:
            mission_details["difficulty"] = "easy"
        
        logger.info(f"Mission difficulty set to: {mission_details['difficulty']}")
        
        # Log final extracted mission details
        logger.info("==== EXTRACTED MISSION DETAILS ====")
        logger.info(f"Giver: {mission_details['giver']} (ID: {mission_details['giver_id']})")
        logger.info(f"Target: {mission_details['target']} (ID: {mission_details['target_id']})")
        logger.info(f"Objective: {mission_details['objective']}")
        logger.info(f"Deadline: {mission_details['deadline']}")
        logger.info(f"Reward: {mission_details['reward_amount']} {mission_details['reward_currency']}")
        logger.info(f"Difficulty: {mission_details['difficulty']}")
        logger.info("===================================")
        
        # Keep the existing debug logging for detailed output
        logger.debug(f"Extracted Mission Details: {json.dumps(mission_details, indent=2)}")
        return mission_details

    except Exception as e:
        logger.error(f"Failed to extract mission details: {e}", exc_info=True)
        return None


def create_mission_from_story(user_id: str, story_text: str, story_id: Optional[int] = None, characters: Optional[List[Dict]] = None) -> Optional[Mission]:
    """
    Creates a structured mission from story content, integrating it with game systems.
    
    This function:
    1. Extracts mission details from character dialogue in the story
    2. Links mission to relevant characters (giver and target)
    3. Sets appropriate difficulty and rewards
    4. Integrates with user progress tracking
    
    Args:
        user_id (str): ID of the player
        story_text (str): Generated story text containing mission information
        story_id (Optional[int]): ID of the related story segment
        characters (Optional[List[Dict]]): List of characters in the story
        
    Returns:
        Optional[Mission]: Fully configured mission object ready for gameplay
    """
    logger.info(f"Creating mission from story for user {user_id}")
    
    details = extract_mission_details(story_text, characters)
    if not details:
        logger.warning("No mission details extracted from story.")
        return None

    try:
        # Check if we already have character IDs from the details
        giver_id = details.get('giver_id')
        target_id = details.get('target_id')
        
        # If not, try to find characters in the database
        if not giver_id and details['giver']:
            logger.info(f"Looking up giver character in database: {details['giver']}")
            giver = Character.query.filter(
                Character.name.ilike(f"%{details['giver']}%")
            ).first()
            giver_id = giver.id if giver else None
            if giver_id:
                logger.info(f"Found giver character in database: ID {giver_id}")
            else:
                logger.warning(f"Could not find giver character in database: {details['giver']}")
            
        if not target_id and details['target']:
            logger.info(f"Looking up target character in database: {details['target']}")
            target = Character.query.filter(
                Character.name.ilike(f"%{details['target']}%")
            ).first()
            target_id = target.id if target else None
            if target_id:
                logger.info(f"Found target character in database: ID {target_id}")
            else:
                logger.warning(f"Could not find target character in database: {details['target']}")

        # Generate a title based on objective
        title = f"Mission: {details['objective'][:30]}..." if len(details['objective']) > 30 else f"Mission: {details['objective']}"
        logger.info(f"Generated mission title: {title}")

        # Create description from extracted details
        description = f"Mission from {details['giver'] if details['giver'] else 'Unknown'} to {details['objective']}. "
        description += f"Target: {details['target'] if details['target'] else 'Unknown'}. "
        description += f"Reward: {details['reward_amount']} {details['reward_currency']}."
        logger.info(f"Generated mission description: {description}")

        # Create mission with all required fields from database schema
        logger.info("Creating mission in database...")
        mission = Mission(
            user_id=user_id,
            title=title,
            description=description,
            giver_id=giver_id,
            target_id=target_id,
            objective=details['objective'],
            status='active',
            difficulty=details['difficulty'],
            reward_currency=details['reward_currency'],
            reward_amount=details['reward_amount'],
            deadline=details['deadline'],
            story_id=story_id,
            progress=0,
            progress_updates=[{
                "progress": 0,
                "status": "active",
                "timestamp": datetime.utcnow().isoformat(),
                "description": "Mission assigned"
            }]
        )
        
        db.session.add(mission)
        db.session.commit()
        logger.info(f"Created mission in database with ID: {mission.id}")
        
        # Add to user's active missions
        logger.info(f"Adding mission to user's active missions list")
        user_progress = UserProgress.query.filter_by(user_id=user_id).first()
        if user_progress:
            if not user_progress.active_missions:
                user_progress.active_missions = []
            
            if mission.id not in user_progress.active_missions:
                user_progress.active_missions.append(mission.id)
                db.session.commit()
                logger.info(f"Added mission {mission.id} to user {user_id}'s active missions")
            else:
                logger.info(f"Mission {mission.id} was already in user's active missions")
        else:
            logger.warning(f"Could not find UserProgress for user {user_id}")
        
        logger.info(f"✅ Successfully created mission from story: '{mission.title}'")
        logger.info(f"Mission details: {mission.objective} | Difficulty: {mission.difficulty} | Reward: {mission.reward_amount} {mission.reward_currency}")
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
            # Get story from database and ensure it's committed
            story = StoryGeneration.query.get(story_id)
            if not story:
                logger.error(f"Story with ID {story_id} not found in database")
                return None
                
            # Ensure we have the latest data from the database
            db.session.refresh(story)
            
            if not story.generated_story:
                logger.error(f"Story {story_id} has no generated story data")
                return None
                
            # Try to parse the story content - handle both string and dict
            try:
                story_data = story.generated_story
                if isinstance(story_data, str):
                    try:
                        story_data = json.loads(story_data)
                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to parse story JSON: {str(e)}")
                        # If JSON parsing fails, try to use the raw story text
                        return create_mission_from_story(user_id, story_data, story_id)
                
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
                        giver = Character.query.filter(
                            Character.name.ilike(f"%{mission_data['giver']}%")
                        ).first()
                        if giver:
                            giver_id = giver.id
                    
                    # If target_id is provided directly  
                    if mission_data.get('target_id') and str(mission_data['target_id']).isdigit():
                        target_id = int(mission_data['target_id'])
                    # Otherwise try to find by name
                    elif mission_data.get('target'):
                        target = Character.query.filter(
                            Character.name.ilike(f"%{mission_data['target']}%")
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
                        reward_currency=mission_data.get('reward_currency', ''),
                        reward_amount=int(mission_data.get('reward_amount', 1500)) if mission_data.get('reward_amount') else 1500,
                        deadline=mission_data.get('deadline', ''),
                        story_id=story_id,
                        progress=0,
                        progress_updates=[{
                            "progress": 0,
                            "status": "active",
                            "timestamp": datetime.utcnow().isoformat(),
                            "description": "Mission assigned"
                        }]
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
            # Ensure we have the latest data
            db.session.refresh(recent_story)
            
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

# Note: Use utils/character_manager.py for all character functions.
