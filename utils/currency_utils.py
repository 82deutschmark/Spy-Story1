"""
currency_utils.py - Currency Management Utilities
===========================================

!!! IMPORTANT - READ BEFORE MODIFYING !!!
This module manages all currency-related operations and transactions in the game.
Changes here directly affect the game's economy and player progression.

Key Features:
------------
- Currency transaction processing
- Balance validation
- Transaction logging
- Currency conversion
- Reward distribution
- Cost calculation

Currency Types:
-------------
- 💎 Diamonds: Premium currency
- 💵 Cash: Standard currency
- 💷 Pounds: British currency
- 💶 Euros: European currency
- 💴 Yen: Japanese currency

Transaction Types:
---------------
1. Story Choices:
   - Custom choices
   - Premium options (diamonds)
   - Special outcomes (pounds, euros, yen) with a large additional cost
   - Story progression has a base cost in cash

2. Character Interactions:
   - Relationship building
   - Trade transactions
   - Information or equipment buying
   - Bribery


3. Mission Operations:
   - Equipment purchase
   - Intel gathering
   - Mission completion rewards

Usage Guidelines:
---------------
1. ALWAYS validate before transaction
2. Process transactions atomically
3. Log all currency operations
4. Handle conversion rates properly
5. Maintain transaction history

Transaction Format:
----------------
{
    'type': str,
    'amount': Dict[str, int],
    'description': str,
    'timestamp': datetime,
    'user_id': str,
    'status': str
}

Integration Points:
----------------
- User progress system
- Story generation
- Mission system
- Character system
- Achievement system

Security Notes:
------------
1. Validate all transactions
2. Prevent negative balances
3. Track unusual patterns
4. Rate limit transactions
5. Audit trail maintenance
"""

import logging
from typing import Dict, Any, Tuple, Optional
from models.user import UserProgress, Transaction
from utils.constants import EXCHANGE_RATES
from database import db

logger = logging.getLogger(__name__)

def validate_currency_requirements(user_progress: UserProgress, currency_requirements: Dict[str, int]) -> Tuple[bool, Optional[str]]:
    """
    Validate if a user has sufficient currency balances
    
    Args:
        user_progress: UserProgress object for the user
        currency_requirements: Dictionary mapping currency symbols to required amounts
    
    Returns:
        Tuple of (success, error_message)
    """
    if not currency_requirements:
        return True, None
    
    for currency, amount in currency_requirements.items():
        current_balance = user_progress.currency_balances.get(currency, 0)
        if current_balance < amount:
            return False, f"Insufficient {currency} balance. Required: {amount}, Available: {current_balance}"
    
    return True, None

def process_transaction(
    user_progress: UserProgress,
    transaction_type: str,
    description: str,
    from_currency: Optional[str] = None,
    to_currency: Optional[str] = None,
    amount: Optional[int] = None,
    currency_requirements: Optional[Dict[str, int]] = None,
    story_node_id: Optional[int] = None
) -> Tuple[bool, Optional[str], Optional[Dict[str, int]]]:
    """
    Process a currency transaction with validation
    
    Args:
        user_progress: UserProgress object for the user
        transaction_type: Type of transaction (choice, trade, mission, etc.)
        description: Description of the transaction
        from_currency: Source currency for conversion (for trade transactions)
        to_currency: Target currency for conversion (for trade transactions)
        amount: Amount to convert (for trade transactions)
        currency_requirements: Dictionary of currencies to spend (for purchases/choices)
        story_node_id: Optional related story node ID
        
    Returns:
        Tuple of (success, error_message, updated_balances)
    """
    try:
        # Handle spending currency (choices, purchases)
        if currency_requirements:
            is_valid, error = validate_currency_requirements(user_progress, currency_requirements)
            if not is_valid:
                return False, error, None
                
            # Update balances
            for currency, spend_amount in currency_requirements.items():
                user_progress.currency_balances[currency] = user_progress.currency_balances.get(currency, 0) - spend_amount
                
                # Record transaction
                transaction = Transaction(
                    user_id=user_progress.user_id,
                    transaction_type=transaction_type,
                    from_currency=currency,
                    amount=spend_amount,
                    description=description,
                    story_node_id=story_node_id
                )
                db.session.add(transaction)
                
        # Handle currency trade/conversion
        elif from_currency and to_currency and amount:
            # Validate trade is allowed
            if from_currency == "💎" and to_currency not in ["💶", "💴"]:
                return False, "Diamonds can only be converted to Euros (💶) or Yen (💴)", None
                
            if to_currency == "💎":
                return False, "Cannot convert other currencies to diamonds", None
                
            if from_currency not in EXCHANGE_RATES or to_currency not in EXCHANGE_RATES[from_currency]:
                return False, "Invalid currency conversion", None
                
            # Validate sufficient balance
            current_balance = user_progress.currency_balances.get(from_currency, 0)
            if current_balance < amount:
                return False, f"Insufficient {from_currency} balance. Required: {amount}, Available: {current_balance}", None
                
            # Calculate conversion
            conversion_rate = EXCHANGE_RATES[from_currency][to_currency]
            converted_amount = int(amount * conversion_rate)
            
            # Record transaction
            transaction = Transaction(
                user_id=user_progress.user_id,
                transaction_type=transaction_type,
                from_currency=from_currency,
                to_currency=to_currency,
                amount=amount,
                description=description
            )
            db.session.add(transaction)
            
            # Update balances
            user_progress.currency_balances[from_currency] = current_balance - amount
            user_progress.currency_balances[to_currency] = user_progress.currency_balances.get(to_currency, 0) + converted_amount
        
        # Handle adding currency (rewards, gifts)
        elif to_currency and amount:
            # Update balance
            user_progress.currency_balances[to_currency] = user_progress.currency_balances.get(to_currency, 0) + amount
            
            # Record transaction
            transaction = Transaction(
                user_id=user_progress.user_id,
                transaction_type=transaction_type,
                to_currency=to_currency,
                amount=amount,
                description=description
            )
            db.session.add(transaction)
        
        else:
            return False, "Invalid transaction parameters", None
            
        # Commit changes
        db.session.commit()
        logger.info(f"Transaction processed for user {user_progress.user_id}: {description}")
        
        return True, None, user_progress.currency_balances
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error processing transaction: {str(e)}")
        return False, f"Transaction failed: {str(e)}", None
