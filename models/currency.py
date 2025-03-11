
from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

class Currency(db.Model):
    """Model for tracking different types of currency"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(32), nullable=False)  # e.g. "diamond", "pound", "euro"
    symbol = db.Column(db.String(8), nullable=False)  # e.g. "💎", "💷", "💶"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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
