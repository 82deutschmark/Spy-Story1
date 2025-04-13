"""
currency.py - Currency and Transaction Management
===========================================

This module defines the models for managing different types of currency and
tracking currency transactions in the interactive spy story system.  A complex system 
is planned to have the user spend currency on story choices, purchases, and exchanges.  
This is not yet implemented.


Key Components:
------------
1. Currency: Defines available currency types
2. Transaction: Tracks currency exchanges and usage
3. Story node integration for choice costs

Currency Types:
------------
- 💎 Diamonds: Premium currency
- 💵 Dollars: Standard currency
- 💷 Pounds: British currency
- 💶 Euros: European currency

Transaction Types:
--------------
- choice: Story choice costs
- trade: Currency exchange
- purchase: Item/feature purchases

Database Schema:
-------------
Tables:
1. currency
   - Primary key: id
   - Required fields: name, symbol
   - Timestamps: created_at

2. transaction
   - Primary key: id
   - Required fields: user_id
   - Currency fields: from_currency, to_currency, amount
   - Foreign keys: story_node_id
   - Metadata: transaction_type, description

Usage Notes:
----------
1. Always use appropriate currency symbols
2. Track all currency changes through transactions
3. Maintain proper story node relationships
4. Handle currency exchanges carefully
"""

from datetime import datetime
from .base import db
from sqlalchemy.dialects.postgresql import JSONB

class Currency(db.Model):
    """
    Model for tracking different types of currency in the system.
    
    This model defines the available currency types and their representations,
    serving as a reference for all currency-related operations.
    
    Attributes:
        id (int): Primary key
        name (str): Currency name (e.g., "diamond", "pound", "euro")
        symbol (str): Currency symbol (e.g., "💎", "💷", "💶")
        created_at (datetime): Currency type creation timestamp
    
    Usage:
        Used as reference data for currency operations and display.
        Should be pre-populated with supported currency types.
    """
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(32), nullable=False)  # e.g. "diamond", "pound", "euro"
    symbol = db.Column(db.String(8), nullable=False)  # e.g. "💎", "💷", "💶"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Transaction(db.Model):
    """
    Model for tracking all currency transactions in the system.
    
    This model records all currency operations including story choice costs,
    currency exchanges, and purchases. It maintains a complete audit trail
    of all currency movements.
    
    Attributes:
        id (int): Primary key
        user_id (str): ID of user involved in transaction
        transaction_type (str): Type of transaction (choice/trade/purchase)
        from_currency (str): Source currency symbol
        to_currency (str): Target currency symbol
        amount (int): Transaction amount
        description (str): Transaction description
        story_node_id (int): Related story node if applicable
        created_at (datetime): Transaction timestamp
        story_node (relationship): Associated story node
    
    Relationships:
        story_node: StoryNode where transaction occurred
        
    Notes:
        - All currency changes must be recorded as transactions
        - Maintain proper relationship with story nodes
        - Include clear descriptions for audit purposes
    """
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
