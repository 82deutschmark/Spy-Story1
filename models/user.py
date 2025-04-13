"""
user.py - User Progress and State Management
=======================================

This module defines the UserProgress model for tracking all aspects of a user's
progress and state in the interactive spy story system. It manages game progression,
currency, relationships, and achievements.

Key Features:
-----------
1. Story progression tracking
2. Currency and transaction management
3. Character relationship system
4. Experience and leveling system
5. Mission and plot arc tracking
6. Achievement management
7. Choice history recording

Database Schema:
-------------
Table: user_progress
- Primary key: id
- Required fields: user_id
- Foreign keys: current_node_id, current_story_id
- Progress tracking: level, experience_points, choice_history
- Game state: achievements_earned, game_state
- Plot tracking: active_plot_arcs, completed_plot_arcs
- Mission tracking: active/completed/failed_missions
- Character tracking: encountered_characters
- Currency tracking: currency_balances
- Story tracking: node_count (tracks position in narrative tree)
- User identification: agent_codename (for login and retrieval)

Currency Types:
------------
- 💎 Diamonds: Premium currency (500 starting)
- 💷 Pounds: British currency (5000 starting)
- 💶 Euros: European currency (5000 starting)
- 💴 Yen: Japanese currency (5000 starting)
- 💵 Dollars: US currency (5000 starting)

Leveling System:
-------------
- Experience points determine level
- Level = 1 + sqrt(xp/100)
- Level-up bonus: 50 * new_level in Euros
- Experience awarded for various actions

Usage Notes:
----------
1. Always use transaction methods for currency changes
2. Track character relationships through encounters
3. Maintain proper story node connections
4. Handle mission state transitions properly
5. Record all choices for history tracking
"""

import logging
from datetime import datetime
import math
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

logger = logging.getLogger(__name__)

class UserProgress(db.Model):
    """
    Model for tracking comprehensive user progress and state.
    
    This model serves as the central repository for all user-related state
    and progress in the game, including story progression, currency,
    relationships, and achievements.
    
    Attributes:
        id (int): Primary key
        user_id (str): Unique user identifier
        agent_codename (str): Agent codename for identification and login
        current_node_id (int): Current story node ID
        current_story_id (int): Current story ID
        level (int): User's game level [default: 1]
        experience_points (int): XP for leveling [default: 0]
        last_updated (datetime): Last state update timestamp
        choice_history (JSONB): Array of user's choices
        achievements_earned (JSONB): Array of earned achievements
        game_state (JSONB): Additional state data
        active_plot_arcs (JSONB): Active plot arc IDs
        completed_plot_arcs (JSONB): Completed plot arc IDs
        active_missions (JSONB): Active mission IDs
        completed_missions (JSONB): Completed mission IDs
        failed_missions (JSONB): Failed mission IDs
        encountered_characters (JSONB): Character relationship data
        currency_balances (JSONB): Currency amounts by type
        extra_data (JSONB): Additional metadata for flexible storage
        node_count (int): Current position in narrative tree [default: 0]
        
    Relationships:
        current_node (StoryNode): Current position in story
        current_story (StoryGeneration): Current story
        transactions (Transaction): Currency transactions
    """
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False, unique=True)
    agent_codename = db.Column(db.String(255), nullable=True, index=True)  # Agent codename for easier lookup
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
    
    # Additional metadata for flexible storage 
    extra_data = db.Column(JSONB, default={})
    
    # NEW: Dedicated column for tracking node count in the story
    node_count = db.Column(db.Integer, default=0, index=True)

    # Relationships
    current_node = db.relationship('StoryNode')
    current_story = db.relationship('StoryGeneration')
    transactions = db.relationship('Transaction', 
                                primaryjoin="UserProgress.user_id == foreign(Transaction.user_id)",
                                lazy='dynamic',
                                cascade="all, delete-orphan")

    def can_afford(self, currency_requirements):
        """
        Check if user has sufficient currency for given requirements.
        
        Args:
            currency_requirements (dict): Required currency amounts
                                       {currency_symbol: amount}
        
        Returns:
            bool: True if user can afford all requirements
        """
        if not currency_requirements:
            return True

        for currency, amount in currency_requirements.items():
            if self.currency_balances.get(currency, 0) < amount:
                logger.debug(f"User {self.user_id} cannot afford {amount} {currency}")
                return False
        logger.debug(f"User {self.user_id} can afford requirements: {currency_requirements}")
        return True

    def spend_currency(self, currency_requirements, transaction_type, description, story_node_id=None):
        """
        Spend currency and record the transaction.
        
        Args:
            currency_requirements (dict): Required currency amounts
            transaction_type (str): Type of transaction
            description (str): Transaction description
            story_node_id (int, optional): Associated story node
            
        Returns:
            bool: True if transaction successful
            
        Side Effects:
            - Updates currency balances
            - Creates transaction record
            - Commits database changes
        """
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
        """
        Add currency and record the transaction.
        
        Args:
            currency (str): Currency symbol to add
            amount (int): Amount to add
            transaction_type (str): Type of transaction
            description (str): Transaction description
            
        Returns:
            bool: True if transaction successful
            
        Side Effects:
            - Updates currency balance
            - Creates transaction record
            - Commits database changes
        """
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
        """
        Record a story choice in the user's history.
        
        Args:
            choice_text (str): Text of the choice made
            choice_id (str): ID of the choice
            node_id (int): Story node ID
            story_id (int): Story ID
            
        Returns:
            bool: True if choice recorded successfully
            
        Side Effects:
            - Updates choice history
            - Updates current node and story
            - Commits database changes
        """
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
        """
        Record or update a character encounter.
        
        Args:
            character_id (int): ID of encountered character
            character_name (str): Name of character
            initial_relationship (int): Starting relationship value
            
        Returns:
            bool: True if encounter recorded successfully
            
        Side Effects:
            - Updates encountered_characters
            - Initializes or updates relationship data
            - Commits database changes
        """
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
        """
        Change relationship level with a character.
        
        Args:
            character_id (int): ID of character
            change_amount (int): Amount to change relationship by
            reason (str, optional): Reason for change
            
        Returns:
            bool: True if relationship updated successfully
            
        Side Effects:
            - Updates relationship level
            - Records change in relationship history
            - Commits database changes
        """
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
        """
        Add experience points and handle leveling up.
        
        Args:
            points (int): Experience points to add
            reason (str, optional): Reason for XP gain
            
        Returns:
            bool: True if user leveled up
            
        Side Effects:
            - Updates experience points
            - May increase level
            - Awards level-up bonus if applicable
            - Commits database changes
            
        Notes:
            Level calculation: level = 1 + sqrt(xp/100)
            Level-up bonus: 50 * new_level in Euros
        """
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
