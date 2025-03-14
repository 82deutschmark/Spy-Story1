
from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

class Mission(db.Model):
    """Model for tracking player missions"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    
    # Mission giver and target
    giver_id = db.Column(db.Integer, db.ForeignKey('scene_images.id', ondelete='SET NULL'))
    target_id = db.Column(db.Integer, db.ForeignKey('scene_images.id', ondelete='SET NULL'))
    
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
    
    # Related story and progress
    story_id = db.Column(db.Integer, db.ForeignKey('story_generation.id'))
    progress = db.Column(db.Integer, default=0)  # 0-100%
    progress_updates = db.Column(JSONB, default=[])  # Array of progress updates
    
    # Relationships
    giver = db.relationship('SceneImages', foreign_keys=[giver_id])
    target = db.relationship('SceneImages', foreign_keys=[target_id])
    story = db.relationship('StoryGeneration')
    
    def update_progress(self, progress_amount, description=None):
        """Update the mission progress"""
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
        
        # Check if mission is now complete
        if self.progress >= 100 and self.status == 'active':
            self.status = 'completed'
            self.completed_at = datetime.utcnow()
            
        db.session.commit()
        return True
    
    def fail_mission(self, reason=None):
        """Mark mission as failed"""
        self.status = 'failed'
        
        if not self.progress_updates:
            self.progress_updates = []
            
        update = {
            "progress": self.progress,
            "status": "failed",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if reason:
            update["reason"] = reason
            
        self.progress_updates.append(update)
        db.session.commit()
        return True
