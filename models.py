
from datetime import datetime
from database import db
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import JSONB
import logging

logger = logging.getLogger(__name__)

# Association table for many-to-many relationship between stories and images
story_images = db.Table('story_images',
    db.Column('story_id', db.Integer, db.ForeignKey('story_generation.id'), primary_key=True),
    db.Column('image_id', db.Integer, db.ForeignKey('image_analysis.id'), primary_key=True)
)

class Currency(db.Model):
    """Model for tracking different types of currency"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(32), nullable=False)  # e.g. "diamond", "pound", "euro"
    symbol = db.Column(db.String(8), nullable=False)  # e.g. "💎", "💷", "💶"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StoryGeneration(db.Model):
    """Model for storing generated story segments and their choices"""
    id = db.Column(db.Integer, primary_key=True)
    primary_conflict = db.Column(db.String(255))
    setting = db.Column(db.String(255))
    narrative_style = db.Column(db.String(255))
    mood = db.Column(db.String(255))
    generated_story = db.Column(JSONB)  # Stores the story text and choices
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Many-to-many relationship with ImageAnalysis
    images = db.relationship('ImageAnalysis', secondary=story_images,
                           backref=db.backref('stories', lazy='dynamic'))

class ImageAnalysis(db.Model):
    """Model for storing analyzed character or scene images"""
    id = db.Column(db.Integer, primary_key=True)
    image_url = db.Column(db.String(1024), nullable=False)
    image_width = db.Column(db.Integer)
    image_height = db.Column(db.Integer)
    image_format = db.Column(db.String(16))
    image_size_bytes = db.Column(db.Integer)
    image_type = db.Column(db.String(32))  # 'character' or 'scene'
    analysis_result = db.Column(JSONB)  # Full analysis from OpenAI
    
    # Character-specific fields
    name = db.Column(db.String(255))  # Primary name field used by the form
    character_name = db.Column(db.String(255))  # Legacy/secondary name field
    character_traits = db.Column(JSONB)  # Array of character traits
    personality_traits = db.Column(JSONB)  # Duplicate of character_traits for compatibility
    character_role = db.Column(db.String(32))  # 'mission-giver', 'villain', or 'neutral'
    role = db.Column(db.String(32))  # Alias for character_role used by the form
    
    # Plot lines
    plot_lines = db.Column(JSONB)  # Array of plot line suggestions
    potential_plot_lines = db.Column(JSONB)  # Duplicate of plot_lines for compatibility
    
    # Character background
    backstory = db.Column(JSONB)  # Array of backstory elements
    
    # Description
    description = db.Column(db.Text)  # Character or scene description
    
    # Scene-specific fields
    scene_type = db.Column(db.String(64))  # E.g., 'narrative', 'choice', 'action'
    setting = db.Column(db.String(255))  # Setting of the scene
    setting_description = db.Column(db.Text)  # Detailed description of the setting
    story_fit = db.Column(db.String(255))  # How well the scene fits in the story
    dramatic_moments = db.Column(JSONB)  # Array of dramatic moments in the scene
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StoryNode(db.Model):
    """Model for storing individual story nodes in the branching narrative"""
    id = db.Column(db.Integer, primary_key=True)
    narrative_text = db.Column(db.Text, nullable=False)
    image_id = db.Column(db.Integer, db.ForeignKey('image_analysis.id'))
    is_endpoint = db.Column(db.Boolean, default=False)
    generated_by_ai = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'))  # Link to achievement
    branch_metadata = db.Column(JSONB)  # Store branch-specific metadata
    parent_node_id = db.Column(db.Integer, db.ForeignKey('story_node.id'))  # Track story hierarchy

    # Relationship with ImageAnalysis
    image = db.relationship('ImageAnalysis')

    # Relationship with Achievement
    achievement = db.relationship('Achievement', backref='story_nodes')  # 

    # Self-referential relationship for story hierarchy
    parent_node = db.relationship('StoryNode', remote_side=[id],
                                backref=db.backref('child_nodes', lazy='dynamic'))

    # Relationship with choices that originate from this node
    choices = db.relationship('StoryChoice', 
                            backref='source_node',
                            lazy=True,
                            primaryjoin="StoryNode.id == StoryChoice.node_id")

class StoryChoice(db.Model):
    """Model for storing choices that connect story nodes"""
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('story_node.id'), nullable=False)
    choice_text = db.Column(db.String(500), nullable=False)
    next_node_id = db.Column(db.Integer, db.ForeignKey('story_node.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    choice_metadata = db.Column(JSONB)  # Store choice-specific metadata

    # Currency costs for this choice
    currency_requirements = db.Column(JSONB, default={})  # e.g. {"💎": 50, "💷": 1000}

    # Simple relationship with the next node
    next_node = db.relationship('StoryNode',
                              foreign_keys=[next_node_id],
                              remote_side=[StoryNode.id])

class Transaction(db.Model):
    """Model for tracking currency transactions"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    transaction_type = db.Column(db.String(32))  # 'choice', 'trade', 'purchase'
    from_currency = db.Column(db.String(8))
    to_currency = db.Column(db.String(8))
    amount = db.Column(db.Integer)
    description = db.Column(db.String(255))
    story_node_id = db.Column(db.Integer, db.ForeignKey('story_node.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship with StoryNode
    story_node = db.relationship('StoryNode', backref=db.backref('transactions', lazy=True))

class UserProgress(db.Model):
    """Model for tracking user progress in stories"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, unique=True)
    current_node_id = db.Column(db.Integer, db.ForeignKey('story_node.id', ondelete='SET NULL'))
    current_story_id = db.Column(db.Integer, db.ForeignKey('story_generation.id', ondelete='SET NULL'))
    level = db.Column(db.Integer, default=1)  # User's game level
    experience_points = db.Column(db.Integer, default=0)  # XP for leveling up
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    choice_history = db.Column(JSONB, default=[])  # Track user's choice history as an array
    achievements_earned = db.Column(JSONB, default=[])  # Track earned achievements
    game_state = db.Column(JSONB, default={})  # Store additional game state data
    
    # Track active plot arcs
    active_plot_arcs = db.Column(JSONB, default=[])  # IDs of active plot arcs
    completed_plot_arcs = db.Column(JSONB, default=[])  # IDs of completed plot arcs
    
    # Track mission progress
    active_missions = db.Column(JSONB, default=[])  # IDs of active missions
    completed_missions = db.Column(JSONB, default=[])  # IDs of completed missions
    failed_missions = db.Column(JSONB, default=[])  # IDs of failed missions
    
    # Track encountered characters
    encountered_characters = db.Column(JSONB, default={})  # Dict with character_id -> relationship level
    
    # Currency balances stored as JSONB
    currency_balances = db.Column(JSONB, default={
        "💎": 500,  # Diamonds
        "💷": 5000,  # Pounds
        "💶": 5000,  # Euros
        "💴": 5000,  # Yen
        "💵": 5000,  # Dollars
    })

    # Relationship with current node
    current_node = db.relationship('StoryNode')
    
    # Relationship with current story
    current_story = db.relationship('StoryGeneration')

    # Add relationship with transactions
    transactions = db.relationship('Transaction', 
                                primaryjoin="UserProgress.user_id == foreign(Transaction.user_id)",
                                lazy='dynamic',
                                cascade="all, delete-orphan")

    def can_afford(self, currency_requirements):
        """Check if user has enough currency for given requirements"""
        if not currency_requirements:
            return True

        for currency, amount in currency_requirements.items():
            if self.currency_balances.get(currency, 0) < amount:
                logger.debug(f"User {self.user_id} cannot afford {amount} {currency}")
                return False
        logger.debug(f"User {self.user_id} can afford requirements: {currency_requirements}")
        return True

    def spend_currency(self, currency_requirements, transaction_type, description, story_node_id=None):
        """Spend currency and record transaction"""
        if not self.can_afford(currency_requirements):
            logger.warning(f"User {self.user_id} attempted to spend currency they don't have")
            return False

        try:
            # Update balances
            for currency, amount in currency_requirements.items():
                self.currency_balances[currency] = self.currency_balances.get(currency, 0) - amount

                # Record transaction
                transaction = Transaction(
                    user_id=self.user_id,
                    transaction_type=transaction_type,
                    from_currency=currency,
                    amount=amount,
                    description=description,
                    story_node_id=story_node_id
                )
                db.session.add(transaction)

            db.session.commit()
            logger.info(f"Successfully processed currency transaction for user {self.user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to process currency transaction: {str(e)}")
            db.session.rollback()
            return False
            
    def add_currency(self, currency, amount, transaction_type, description):
        """Add currency and record transaction"""
        try:
            # Update balance
            self.currency_balances[currency] = self.currency_balances.get(currency, 0) + amount

            # Record transaction
            transaction = Transaction(
                user_id=self.user_id,
                transaction_type=transaction_type,
                to_currency=currency,
                amount=amount,
                description=description
            )
            db.session.add(transaction)

            db.session.commit()
            logger.info(f"Added {amount} {currency} to user {self.user_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to add currency: {str(e)}")
            db.session.rollback()
            return False
            
    def record_choice(self, choice_text, choice_id, node_id, story_id):
        """Record a story choice in the user's history"""
        if not self.choice_history:
            self.choice_history = []
            
        choice_data = {
            "choice_id": choice_id,
            "choice_text": choice_text,
            "node_id": node_id,
            "story_id": story_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.choice_history.append(choice_data)
        self.current_node_id = node_id
        self.current_story_id = story_id
        db.session.commit()
        return True
        
    def encounter_character(self, character_id, character_name, initial_relationship=0):
        """Record character encounter and initialize or update relationship"""
        if not self.encountered_characters:
            self.encountered_characters = {}
            
        if str(character_id) not in self.encountered_characters:
            # First encounter with this character
            self.encountered_characters[str(character_id)] = {
                "name": character_name,
                "relationship_level": initial_relationship,
                "first_encounter": datetime.utcnow().isoformat(),
                "encounters_count": 1,
                "last_encounter": datetime.utcnow().isoformat()
            }
        else:
            # Update existing character relationship
            self.encountered_characters[str(character_id)]["encounters_count"] += 1
            self.encountered_characters[str(character_id)]["last_encounter"] = datetime.utcnow().isoformat()
            
        db.session.commit()
        return True
        
    def change_character_relationship(self, character_id, change_amount, reason=None):
        """Change relationship level with a character"""
        if not self.encountered_characters or str(character_id) not in self.encountered_characters:
            logger.warning(f"User {self.user_id} tried to change relationship with unknown character {character_id}")
            return False
            
        char_data = self.encountered_characters[str(character_id)]
        char_data["relationship_level"] += change_amount
        
        if reason:
            if "relationship_history" not in char_data:
                char_data["relationship_history"] = []
                
            char_data["relationship_history"].append({
                "change": change_amount,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat()
            })
            
        self.encountered_characters[str(character_id)] = char_data
        db.session.commit()
        return True
        
    def add_experience_points(self, points, reason=None):
        """Add experience points and handle leveling up"""
        self.experience_points += points
        
        # Simple leveling formula: level = 1 + sqrt(xp/100)
        import math
        new_level = 1 + int(math.sqrt(self.experience_points / 100))
        
        level_up = new_level > self.level
        if level_up:
            old_level = self.level
            self.level = new_level
            logger.info(f"User {self.user_id} leveled up from {old_level} to {new_level}")
            
            # Award level-up bonus
            level_bonus = 50 * new_level
            self.add_currency("💎", level_bonus, "level_up", f"Level up bonus for reaching level {new_level}")
            
        db.session.commit()
        return level_up

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

class PlotArc(db.Model):
    """Model for tracking story plot arcs"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    arc_type = db.Column(db.String(32))  # main, side, character, etc.
    story_id = db.Column(db.Integer, db.ForeignKey('story_generation.id', ondelete='CASCADE'))
    
    # Plot arc status and progress
    status = db.Column(db.String(32), default='active')  # active, completed, failed
    completion_criteria = db.Column(JSONB)  # Criteria to complete this arc
    progress_markers = db.Column(JSONB, default=[])  # Key points in the arc's progress
    
    # Key nodes and choices in this arc
    key_nodes = db.Column(JSONB, default=[])  # List of important node IDs in this arc
    branching_choices = db.Column(JSONB, default=[])  # Important choice points
    
    # Involved characters
    primary_characters = db.Column(JSONB, default=[])  # Character IDs central to this arc
    
    # Rewards for completion
    rewards = db.Column(JSONB)  # Currency, items, achievements, etc.
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    story = db.relationship('StoryGeneration')

class Achievement(db.Model):
    """New: Model for story achievements"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    criteria = db.Column(JSONB)  # Achievement unlock conditions
    points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Mission(db.Model):
    """Model for tracking player missions"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    
    # Mission giver and target
    giver_id = db.Column(db.Integer, db.ForeignKey('image_analysis.id', ondelete='SET NULL'))
    target_id = db.Column(db.Integer, db.ForeignKey('image_analysis.id', ondelete='SET NULL'))
    
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
    giver = db.relationship('ImageAnalysis', foreign_keys=[giver_id])
    target = db.relationship('ImageAnalysis', foreign_keys=[target_id])
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

class AIInstruction(db.Model):
    """Model for storing AI generation parameters and instructions"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    prompt_template = db.Column(db.Text, nullable=False)
    parameters = db.Column(JSONB)  # Stores additional parameters
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
