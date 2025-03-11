
from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

class CharacterEvolution(db.Model):
    """Model for tracking how characters evolve through a user's story"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    character_id = db.Column(db.Integer, db.ForeignKey('image_analysis.id', ondelete='CASCADE'))
    story_id = db.Column(db.Integer, db.ForeignKey('story_generation.id', ondelete='CASCADE'))
    
    # Character status in story
    status = db.Column(db.String(32), default='active')  # active, deceased, missing, etc.
    role = db.Column(db.String(32))  # protagonist, antagonist, ally, enemy, etc.
    
    # Character evolution data
    evolved_traits = db.Column(JSONB, default=[])  # New traits developed during story
    plot_contributions = db.Column(JSONB, default=[])  # Plot developments related to this character
    relationship_network = db.Column(JSONB, default={})  # Relations with other characters
    
    # Evolution metadata
    first_appearance = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    evolution_log = db.Column(JSONB, default=[])  # Log of changes to character
    
    # Relationships
    character = db.relationship('ImageAnalysis')
    story = db.relationship('StoryGeneration')
    
    def add_trait(self, trait, reason=None):
        """Add a new trait to the character's evolved traits"""
        if not self.evolved_traits:
            self.evolved_traits = []
            
        if trait not in self.evolved_traits:
            self.evolved_traits.append(trait)
            
            # Log the evolution
            if not self.evolution_log:
                self.evolution_log = []
                
            self.evolution_log.append({
                "type": "trait_added",
                "trait": trait,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            db.session.commit()
            return True
        return False
    
    def update_role(self, new_role, reason=None):
        """Update the character's role in the story"""
        old_role = self.role
        self.role = new_role
        
        # Log the evolution
        if not self.evolution_log:
            self.evolution_log = []
            
        self.evolution_log.append({
            "type": "role_changed",
            "old_role": old_role,
            "new_role": new_role,
            "reason": reason,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        db.session.commit()
        return True
    
    def add_relationship(self, target_character_id, relationship_type, strength=0):
        """Add or update relationship with another character"""
        if not self.relationship_network:
            self.relationship_network = {}
            
        self.relationship_network[str(target_character_id)] = {
            "type": relationship_type,  # friend, enemy, romantic, etc.
            "strength": strength,       # -10 to 10 scale
            "last_updated": datetime.utcnow().isoformat()
        }
        
        db.session.commit()
        return True
    
    def add_plot_contribution(self, plot_point, importance=1):
        """Record character's contribution to the plot"""
        if not self.plot_contributions:
            self.plot_contributions = []
            
        self.plot_contributions.append({
            "plot_point": plot_point,
            "importance": importance,  # 1-5 scale of importance
            "timestamp": datetime.utcnow().isoformat()
        })
        
        db.session.commit()
        return True
