"""
context_summary.py - Context Management for Story Nodes
================================================

This module defines the NodeContextSummary model for storing pre-computed
narrative summaries at various detail levels for story nodes. These summaries
optimize context retrieval for OpenAI interactions by providing appropriately
sized context for token limits.

Key Features:
-----------
1. Multi-level summary storage (short, medium, long)
2. Token count tracking
3. Summary type categorization
4. Timestamp tracking for versioning

Database Schema:
-------------
Table: node_context_summary
- Primary key: id
- Foreign keys: node_id
- Content fields: summary_text, summary_type
- Metadata: token_count, created_at

Summary Types:
------------
- short: Brief summaries (~10000 tokens)
- medium: Moderate detail (~30000 tokens)
- long: Full detail (~150000 tokens)

Usage Notes:
----------
1. Generate summaries asynchronously to avoid performance impact
2. Use token count to select appropriate summaries for context limits
3. Prioritize recent summaries when multiple are available
4. Index for efficient retrieval
"""

from datetime import datetime
from .base import db

class NodeContextSummary(db.Model):
    """
    Model for storing pre-computed narrative summaries for story nodes.
    
    This model stores various levels of narrative summaries for story nodes,
    enabling efficient context retrieval for OpenAI interactions while
    managing token limits.
    
    Attributes:
        id (int): Primary key
        node_id (int): Reference to associated StoryNode
        summary_text (str): The summary content
        summary_type (str): Summary detail level (short/medium/long)
        token_count (int): Approximate token count
        created_at (datetime): Creation timestamp
        
    Relationships:
        node (StoryNode): The associated story node
        
    Notes:
        - short summaries are brief and focus on key events
        - medium summaries include moderate detail
        - long summaries provide comprehensive narrative context
    """
    __tablename__ = 'node_context_summary'
    
    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.Integer, db.ForeignKey('story_node.id', ondelete='CASCADE'), nullable=False)
    summary_text = db.Column(db.Text, nullable=False)
    summary_type = db.Column(db.String(50), nullable=False)  # 'short', 'medium', 'long'
    token_count = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Indexes for efficient retrieval
    __table_args__ = (
        db.Index('ix_node_context_summary_node_id_type', 'node_id', 'summary_type'),
        db.Index('ix_node_context_summary_created_at', 'created_at'),
    )
    
    # Relationship
    node = db.relationship('StoryNode', backref=db.backref('context_summaries', lazy='dynamic'))
    
    @classmethod
    def get_summaries(cls, node_id, summary_type='medium', limit=3):
        """
        Get the most recent summaries for a node of a specific type.
        
        Args:
            node_id (int): ID of the story node
            summary_type (str): Type of summary to retrieve
            limit (int): Maximum number of summaries to retrieve
            
        Returns:
            List of NodeContextSummary objects
        """
        return cls.query.filter_by(
            node_id=node_id,
            summary_type=summary_type
        ).order_by(cls.created_at.desc()).limit(limit).all()
    
    @classmethod
    def get_optimal_summary(cls, node_id, max_tokens=1000):
        """
        Get the optimal summary based on token budget.
        
        This method attempts to get the most detailed summary that fits
        within the token budget, starting with medium and trying long
        if the budget allows.
        
        Args:
            node_id (int): ID of the story node
            max_tokens (int): Maximum tokens available
            
        Returns:
            NodeContextSummary or None if no appropriate summary found
        """
        # Try medium summary first (balanced detail and tokens)
        medium_summary = cls.query.filter_by(
            node_id=node_id,
            summary_type='medium'
        ).order_by(cls.created_at.desc()).first()
        
        # If medium summary is small enough, check if we can use a long summary
        if medium_summary and medium_summary.token_count < max_tokens * 0.6:
            long_summary = cls.query.filter_by(
                node_id=node_id,
                summary_type='long'
            ).order_by(cls.created_at.desc()).first()
            
            if long_summary and long_summary.token_count < max_tokens * 0.9:
                return long_summary
        
        # Return medium or fall back to short if medium not available or too large
        if medium_summary and medium_summary.token_count < max_tokens:
            return medium_summary
            
        # Last resort: try short summary
        return cls.query.filter_by(
            node_id=node_id,
            summary_type='short'
        ).order_by(cls.created_at.desc()).first() 