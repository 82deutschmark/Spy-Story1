
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
    character_name = db.Column(db.String(255))  # Name of the character
    character_traits = db.Column(JSONB)  # Array of character traits if a character
    character_role = db.Column(db.String(32))  # 'hero', 'villain', or 'neutral'
    plot_lines = db.Column(JSONB)  # Array of plot line suggestions for the character
    scene_type = db.Column(db.String(64))  # E.g., 'narrative', 'choice', 'action'
    setting = db.Column(db.String(255))  # Setting of the scene
    setting_description = db.Column(db.Text)  # Detailed description of the setting
    story_fit = db.Column(db.String(255))  # How well the scene fits in the story
    dramatic_moments = db.Column(JSONB)  # Array of dramatic moments in the scene
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
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    choice_history = db.Column(JSONB)  # Track user's choice history
    achievements_earned = db.Column(JSONB)  # Track earned achievements
    game_state = db.Column(JSONB)  # Store additional game state data

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

class Achievement(db.Model):
    """New: Model for story achievements"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    criteria = db.Column(JSONB)  # Achievement unlock conditions
    points = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AIInstruction(db.Model):
    """Model for storing AI generation parameters and instructions"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    prompt_template = db.Column(db.Text, nullable=False)
    parameters = db.Column(JSONB)  # Stores additional parameters
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
