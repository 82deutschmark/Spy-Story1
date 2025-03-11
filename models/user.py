
import logging
from datetime import datetime
import math
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

logger = logging.getLogger(__name__)

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
        new_level = 1 + int(math.sqrt(self.experience_points / 100))
        
        level_up = new_level > self.level
        if level_up:
            old_level = self.level
            self.level = new_level
            logger.info(f"User {self.user_id} leveled up from {old_level} to {new_level}")
            
            # Award level-up bonus
            level_bonus = 50 * new_level
            self.add_currency("💶", level_bonus, "level_up", f"Level up bonus for reaching level {new_level}")
            
        db.session.commit()
        return level_up

# Need to import Transaction here to avoid circular dependency
from .currency import Transaction
