"""
missions.py - Mission Management System
===================================

This module defines the Mission model for tracking and managing player missions but it is in development!!
It should handle mission progress, rewards,and relationships with characters and stories. 
Missions might last for 10 or more story segments.
This is not completely thought out and requires some design input!

Key Features:  
-----------
1. Mission tracking and status management IN DEVELOPMENT!!!
2. Progress updates and completion handling  NOT IMPLEMENTED!!!
3. Character relationships (giver/target) Functional!
3a. Character relationships (protagonist/other characters) NOT IMPLEMENTED!!!
4. Reward management NOT IMPLEMENTED!!!
5. Time tracking and deadlines NOT IMPLEMENTED!!!
6. Story integration IN DEVELOPMENT!!!

Database Schema:
-------------
Table: mission
- Primary key: id
- Required fields: user_id, title
- Foreign keys: giver_id, target_id, story_id
- Status tracking: status, progress, progress_updates
- Reward tracking: reward_currency, reward_amount
- Time tracking: created_at, deadline, completed_at

Mission Status Values:
------------------
- active: Mission is currently in progress  (This is the only one implemented and the only one of concern to the user)
- completed: Mission has been successfully completed (Logic for this is not implemented)
- failed: Mission has failed or been abandoned (Logic for this is not implemented)


Usage Notes:
----------
1. Always use update_progress() for progress changes
2. Handle mission failure through fail_mission()
3. Track progress updates with timestamps
4. Maintain proper relationships with characters
"""

from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

class Mission(db.Model):
    """
    Model for tracking and managing player missions.
    
    This model represents individual missions that players can undertake,
    tracking their progress, rewards, and relationships with characters and stories.
    
    Attributes:
        id (int): Primary key
        user_id (str): ID of the user undertaking the mission
        title (str): Mission title
        description (str): Detailed mission description
        giver_id (int): ID of character giving the mission
        target_id (int): ID of character who is the mission target
        objective (str): Specific mission objective
        status (str): Current mission status (active/completed/failed)
        difficulty (str): Mission difficulty level (easy/medium/hard)   ///IS THIS NEEDED???///
        reward_currency (str): Type of currency reward (💎, 💵, 💷)
        reward_amount (int): Amount of currency reward
        created_at (datetime): Mission creation timestamp
        deadline (str): Narrative deadline description
        completed_at (datetime): Mission completion timestamp
        story_id (int): Associated story ID
        progress (int): Current progress percentage (0-100)  NEEDS TO BE REMOVED!!!  It is impossible to know the progress percentage of a mission
        progress_updates (JSONB): Array of progress update records ///This is not implemented???///
        
    Relationships:
        giver (Character): Character who gave the mission
        target (Character): Target character of the mission
        story (StoryGeneration): Associated story
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    
    # Mission giver and target
    giver_id = db.Column(db.Integer, db.ForeignKey('characters.id', ondelete='SET NULL'))
    target_id = db.Column(db.Integer, db.ForeignKey('characters.id', ondelete='SET NULL'))
    
    # Mission details
    objective = db.Column(db.String(255))
    status = db.Column(db.String(32), default='active')  # active, completed, failed
    difficulty = db.Column(db.String(32))  # easy, medium, hard
    
    # Reward details
    reward_currency = db.Column(db.String(8))  # 💎, 💵, 💷, etc.
    reward_amount = db.Column(db.Integer)
    
    # Time tracking
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    deadline = db.Column(db.String(255))  # Narrative deadline
    completed_at = db.Column(db.DateTime)
    
    # Related story and progress  ///THIS NEEDS TO BE REWORKED!///
    story_id = db.Column(db.Integer, db.ForeignKey('story_generation.id'))
    progress = db.Column(db.Integer, default=0)  # 0-100%  NEEDS TO BE REWORKED
    progress_updates = db.Column(JSONB, default=[])  # Array of progress updates
    
    # Relationships
    giver = db.relationship('Character', foreign_keys=[giver_id])
    target = db.relationship('Character', foreign_keys=[target_id])
    story = db.relationship('StoryGeneration')
    
    def update_progress(self, progress_amount, description=None):
        """
        Update the mission progress and record the update.
        
        Args:
            progress_amount (int): New progress value (0-100)
            description (str, optional): Description of the progress update
            
        Returns:
            bool: True if update was successful
            
        Side Effects:
            - Updates progress value
            - Adds progress update record
            - May change mission status to completed
            - Commits database changes
        """
        self.progress = min(100, progress_amount)
        
        if not self.progress_updates:
            self.progress_updates = []
            
        update = {
            "progress": self.progress,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if description:
            update["description"] = description
            
        self.progress_updates.append(update)
        
        # Check if mission is now complete  THIS LOGIC IS WRONG!!!  NEEDS TO BE REMOVED!!!  A mission will be judged to be complete by a yet undetermined method!
        if self.progress >= 100 and self.status == 'active':
            self.status = 'completed'
            self.completed_at = datetime.utcnow()
            
        db.session.commit()
        return True
    ###  No logic for this, comment out the code for now!!
###    def fail_mission(self, reason=None):
###        """
###        Mark the mission as failed and record the failure.
###        
###        Args:
###            reason (str, optional): Reason for mission failure
            
###        Returns:
###            bool: True if failure was recorded successfully
            
###        Side Effects:
###            - Changes mission status to failed
###            - Adds failure record to progress updates
###            - Commits database changes
###        """
###        self.status = 'failed'
###        
###        if not self.progress_updates:
###            self.progress_updates = []
###            
###        update = {
###            "progress": self.progress,
###            "status": "failed",
###            "timestamp": datetime.utcnow().isoformat()
###        }
###        
###        if reason:
###            update["reason"] = reason
            
###        self.progress_updates.append(update)
###        db.session.commit()
###        return True

    def to_dict(self):
        """
        Serialize the Mission object to a dictionary.
        """
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'giver_id': self.giver_id,
            'giver_name': self.giver.character_name if self.giver else None,
            'target_id': self.target_id,
            'target_name': self.target.character_name if self.target else None,
            'objective': self.objective,
            'status': self.status,
            'difficulty': self.difficulty,
            'reward_currency': self.reward_currency,
            'reward_amount': self.reward_amount,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'deadline': self.deadline,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'story_id': self.story_id,
            'progress': self.progress,
            'progress_updates': self.progress_updates or []
        }
