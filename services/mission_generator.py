
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import logging

from models import ImageAnalysis, Mission, UserProgress
from database import db

logger = logging.getLogger(__name__)

# Mission difficulty levels with their corresponding reward multipliers
DIFFICULTY_LEVELS = {
    'easy': 1.0,
    'medium': 2.0,
    'hard': 3.5
}

# Base reward amounts for different currencies
BASE_REWARDS = {
    '💎': 25,  # Diamonds are valuable
    '💵': 500,  # Dollars
    '💷': 400,  # Pounds
    '💶': 450,  # Euros
    '💴': 5000  # Yen
}

# Mission objective templates
MISSION_OBJECTIVES = [
    "Steal {item} from {target}",
    "Infiltrate {target}'s {location} and gather intelligence",
    "Sabotage {target}'s {plot} before it's too late",
    "Seduce {target} to extract crucial information",
    "Plant evidence to frame {target} for {crime}",
    "Protect {innocent} from {target}'s assassination attempt",
    "Intercept a secret delivery to {target}",
    "Hack into {target}'s security system",
    "Rescue {hostage} from {target}'s compound",
    "Gather evidence of {target}'s involvement in {scandal}"
]

# Location templates
LOCATIONS = [
    "secret lair", "penthouse", "private island", "underground bunker", 
    "luxury yacht", "mountain hideout", "skyscraper office", "private jet",
    "research facility", "mansion"
]

# Item templates
ITEMS = [
    "experimental weapon", "encryption key", "secret formula", "confidential files",
    "prototype device", "valuable artwork", "incriminating evidence", "rare artifact",
    "security codes", "cryptocurrency wallet"
]

# Plot templates
PLOTS = [
    "world domination scheme", "heist plan", "blackmail operation", "terrorist plot",
    "money laundering scheme", "cryptocurrency fraud", "election rigging plan",
    "corporate espionage operation", "kidnapping scheme", "assassination plot"
]

# Crime templates
CRIMES = [
    "corporate espionage", "art theft", "illegal weapons dealing", "money laundering",
    "data breach", "insider trading", "blackmail", "counterfeiting", "smuggling",
    "identity theft"
]

# Scandal templates
SCANDALS = [
    "corruption scandal", "embezzlement scheme", "offshore account fraud",
    "political bribery", "illegal surveillance operation", "data manipulation plot",
    "human experimentation", "environmental disaster cover-up", "tax evasion scheme",
    "illegal drug manufacturing"
]

def get_mission_giver_characters() -> List[ImageAnalysis]:
    """Get characters who can give missions (neutral or mission giver role)"""
    return ImageAnalysis.query.filter(
        (ImageAnalysis.image_type == 'character') &
        ((ImageAnalysis.character_role == 'neutral') | 
         (ImageAnalysis.character_role == 'mission giver') |
         (ImageAnalysis.character_role.is_(None)))
    ).all()

def get_villain_characters() -> List[ImageAnalysis]:
    """Get characters with villain role"""
    return ImageAnalysis.query.filter(
        (ImageAnalysis.image_type == 'character') &
        (ImageAnalysis.character_role == 'villain')
    ).all()

def generate_mission(user_id: str, story_id: Optional[int] = None) -> Optional[Mission]:
    """Generate a new mission for the user"""
    try:
        # Get mission givers and villains
        mission_givers = get_mission_giver_characters()
        villains = get_villain_characters()
        
        if not mission_givers or not villains:
            logger.warning(f"Cannot generate mission: no mission givers or villains available")
            return None
        
        # Randomly select a mission giver and target villain
        mission_giver = random.choice(mission_givers)
        target = random.choice(villains)
        
        # Ensure mission giver and target are different characters
        while mission_giver.id == target.id and len(mission_givers) > 1:
            mission_giver = random.choice(mission_givers)
        
        # Select random mission parameters
        difficulty = random.choice(list(DIFFICULTY_LEVELS.keys()))
        reward_currency = random.choice(list(BASE_REWARDS.keys()))
        
        # Calculate reward based on difficulty
        reward_amount = int(BASE_REWARDS[reward_currency] * DIFFICULTY_LEVELS[difficulty])
        
        # Generate random elements for mission objective
        location = random.choice(LOCATIONS)
        item = random.choice(ITEMS)
        plot = random.choice(PLOTS)
        crime = random.choice(CRIMES)
        scandal = random.choice(SCANDALS)
        hostage = f"Agent {chr(random.randint(65, 90))}"  # Random letter A-Z
        innocent = f"Diplomat {chr(random.randint(65, 90))}"  # Random letter A-Z
        
        # Generate mission objective
        objective_template = random.choice(MISSION_OBJECTIVES)
        objective = objective_template.format(
            target=target.character_name,
            location=location,
            item=item,
            plot=plot,
            crime=crime,
            scandal=scandal,
            hostage=hostage,
            innocent=innocent
        )
        
        # Generate mission title
        title_templates = [
            f"Operation: {random.choice(['Midnight', 'Shadow', 'Phoenix', 'Viper', 'Diamond', 'Cobra'])} {random.choice(['Strike', 'Protocol', 'Gambit', 'Directive'])}",
            f"The {random.choice(['Secret', 'Hidden', 'Lost', 'Stolen', 'Forbidden'])} {random.choice(['File', 'Key', 'Code', 'Dossier', 'Identity'])}",
            f"{target.character_name}'s {random.choice(['Downfall', 'Nemesis', 'Weakness', 'Undoing'])}",
            f"Mission: {random.choice(['Critical', 'Impossible', 'Urgent', 'Classified', 'Top Secret'])}"
        ]
        title = random.choice(title_templates)
        
        # Generate deadline
        deadline_days = random.randint(1, 5)
        deadline_templates = [
            f"You have {deadline_days} days before disaster strikes",
            f"Complete within {deadline_days} days or face serious consequences",
            f"The clock is ticking - {deadline_days} days until {target.character_name}'s plan succeeds",
            f"Time sensitive: {deadline_days}-day window of opportunity"
        ]
        deadline = random.choice(deadline_templates)
        
        # Create detailed mission description
        description_templates = [
            "Intelligence reports indicate that {target} is planning something big. Your mission is to {objective} before it's too late. {deadline}. Success will be rewarded with {reward_amount} {reward_currency}.",
            "We've received word that {target} is up to no good. You need to {objective} as soon as possible. {deadline}. Complete this mission successfully to earn {reward_amount} {reward_currency}.",
            "{giver} has critical information about {target}. You must {objective} to prevent a catastrophe. {deadline}. Your reward: {reward_amount} {reward_currency}.",
            "Attention agent: {target} poses a significant threat. Your assignment is to {objective} with utmost discretion. {deadline}. Expect {reward_amount} {reward_currency} upon completion."
        ]
        
        description = random.choice(description_templates).format(
            target=target.character_name,
            giver=mission_giver.character_name,
            objective=objective,
            deadline=deadline,
            reward_amount=reward_amount,
            reward_currency=reward_currency
        )
        
        # Create the mission
        mission = Mission(
            user_id=user_id,
            title=title,
            description=description,
            giver_id=mission_giver.id,
            target_id=target.id,
            objective=objective,
            difficulty=difficulty,
            reward_currency=reward_currency,
            reward_amount=reward_amount,
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
            user_progress.active_missions.append(mission.id)
            db.session.commit()
        
        logger.info(f"Generated new mission for user {user_id}: {mission.title}")
        return mission
        
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
