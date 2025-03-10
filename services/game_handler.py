
import json
import logging
from decimal import Decimal
from models import UserProgress, StoryChoice, Transaction, StoryNode, db

# Configure logging
logger = logging.getLogger(__name__)

class GameHandler:
    """Handler for game logic, choices, and currency transactions"""
    
    @staticmethod
    def process_choice(user_id, choice_id=None, custom_choice=None):
        """Process a story choice and handle currency requirements
        
        Args:
            user_id (str): The user's unique identifier
            choice_id (int, optional): The ID of the selected choice
            custom_choice (str, optional): Text for a custom choice
            
        Returns:
            dict: Response with transaction results
        """
        try:
            # Get user progress
            user_progress = UserProgress.query.filter_by(user_id=user_id).first()
            if not user_progress:
                return {
                    'success': False,
                    'error': 'User progress not found',
                    'code': 'user_not_found'
                }

            if custom_choice:
                # Handle custom choice (costs diamonds)
                currency_requirements = {'💎': 100}
                
                # Validate diamond balance
                if not user_progress.can_afford(currency_requirements):
                    return {
                        'success': False,
                        'error': 'Insufficient diamonds',
                        'required': 100,
                        'current_balance': user_progress.currency_balances.get('💎', 0),
                        'code': 'insufficient_funds'
                    }
                
                # Process the transaction
                success = user_progress.spend_currency(
                    currency_requirements,
                    'choice',
                    f'Custom choice: {custom_choice[:50]}...' if len(custom_choice) > 50 else custom_choice
                )
                
                if not success:
                    return {
                        'success': False,
                        'error': 'Failed to process currency transaction',
                        'code': 'transaction_failed'
                    }
                
                return {
                    'success': True,
                    'new_balances': user_progress.currency_balances,
                    'message': 'Custom choice processed successfully',
                    'choice_type': 'custom'
                }
                
            else:
                # Handle predefined choice
                if not choice_id:
                    return {
                        'success': False,
                        'error': 'No choice ID provided',
                        'code': 'missing_choice_id'
                    }
                
                # Get the choice
                choice = StoryChoice.query.get(choice_id)
                if not choice:
                    return {
                        'success': False,
                        'error': f'Choice with ID {choice_id} not found',
                        'code': 'choice_not_found'
                    }
                
                # Check if user can afford the choice
                if not user_progress.can_afford(choice.currency_requirements):
                    return {
                        'success': False,
                        'error': 'Insufficient funds',
                        'requirements': choice.currency_requirements,
                        'current_balances': user_progress.currency_balances,
                        'code': 'insufficient_funds'
                    }
                
                # Process the transaction
                success = user_progress.spend_currency(
                    choice.currency_requirements,
                    'choice',
                    f'Story choice: {choice.choice_text[:50]}...' if len(choice.choice_text) > 50 else choice.choice_text,
                    choice.node_id
                )
                
                if not success:
                    return {
                        'success': False,
                        'error': 'Failed to process currency transaction',
                        'code': 'transaction_failed'
                    }
                
                # Update user's current node
                user_progress.current_node_id = choice.next_node_id
                
                # Track choice in history
                if not user_progress.choice_history:
                    user_progress.choice_history = []
                
                user_progress.choice_history.append({
                    'choice_id': choice_id,
                    'choice_text': choice.choice_text,
                    'node_id': choice.node_id,
                    'next_node_id': choice.next_node_id,
                    'currency_spent': choice.currency_requirements
                })
                
                db.session.commit()
                
                return {
                    'success': True,
                    'new_balances': user_progress.currency_balances,
                    'message': 'Choice processed successfully',
                    'next_node_id': choice.next_node_id,
                    'choice_type': 'predefined'
                }
                
        except Exception as e:
            logger.error(f"Error processing choice: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'error': str(e),
                'code': 'server_error'
            }
    
    @staticmethod
    def trade_currency(user_id, from_currency, to_currency, amount):
        """Handle currency trading between different types
        
        Args:
            user_id (str): The user's unique identifier
            from_currency (str): Currency symbol to convert from
            to_currency (str): Currency symbol to convert to
            amount (int): Amount to convert
            
        Returns:
            dict: Response with trade results
        """
        try:
            # Convert amount to int if it's not already
            amount = int(amount)
            
            # Get exchange rates
            rates = {
                "💎": {  # Diamonds can only be converted to EUR and YEN
                    "💶": 1000,    # 1 diamond = 1000 EUR
                    "💴": 150000,  # 1 diamond = 150000 YEN
                },
                "💶": {  # EUR to other currencies (except diamonds)
                    "💴": 150,     # 1 EUR = 150 YEN
                    "💵": 1.1,     # 1 EUR = 1.1 USD
                    "💷": 0.85,    # 1 EUR = 0.85 GBP
                },
                "💴": {  # YEN to other currencies (except diamonds)
                    "💶": 0.0067,  # 1 YEN = 0.0067 EUR
                    "💵": 0.0073,  # 1 YEN = 0.0073 USD
                    "💷": 0.0057,  # 1 YEN = 0.0057 GBP
                },
                "💵": {  # USD to other currencies (except diamonds)
                    "💶": 0.91,    # 1 USD = 0.91 EUR
                    "💴": 136.5,   # 1 USD = 136.5 YEN
                    "💷": 0.77,    # 1 USD = 0.77 GBP
                },
                "💷": {  # GBP to other currencies (except diamonds)
                    "💶": 1.18,    # 1 GBP = 1.18 EUR
                    "💴": 177,     # 1 GBP = 177 YEN
                    "💵": 1.3,     # 1 GBP = 1.3 USD
                }
            }
            
            # Validate conversion
            if from_currency == "💎" and to_currency not in ["💶", "💴"]:
                return {
                    'success': False,
                    'error': 'Diamonds can only be converted to Euros (💶) or Yen (💴)'
                }

            if to_currency == "💎":
                return {
                    'success': False,
                    'error': 'Cannot convert other currencies to diamonds'
                }

            if from_currency not in rates or to_currency not in rates[from_currency]:
                return {
                    'success': False,
                    'error': 'Invalid currency conversion'
                }
            
            # Get user progress
            user_progress = UserProgress.query.filter_by(user_id=user_id).first()
            if not user_progress:
                return {
                    'success': False,
                    'error': 'User progress not found'
                }
            
            # Check balance
            current_balance = user_progress.currency_balances.get(from_currency, 0)
            if current_balance < amount:
                return {
                    'success': False,
                    'error': 'Insufficient funds',
                    'current_balance': current_balance,
                    'required_amount': amount
                }
            
            # Calculate conversion
            conversion_rate = rates[from_currency][to_currency]
            converted_amount = int(amount * Decimal(str(conversion_rate)))
            
            # Update balances
            user_progress.currency_balances[from_currency] = current_balance - amount
            user_progress.currency_balances[to_currency] = user_progress.currency_balances.get(to_currency, 0) + converted_amount
            
            # Record transaction
            transaction = Transaction(
                user_id=user_id,
                transaction_type='trade',
                from_currency=from_currency,
                to_currency=to_currency,
                amount=amount,
                description=f'Traded {amount} {from_currency} for {converted_amount} {to_currency}'
            )
            db.session.add(transaction)
            
            try:
                db.session.commit()
            except Exception as e:
                db.session.rollback()
                logger.error(f"Database error during currency trade: {str(e)}")
                return {
                    'success': False,
                    'error': 'Failed to process trade'
                }
            
            return {
                'success': True,
                'message': f'Successfully traded {amount} {from_currency} for {converted_amount} {to_currency}',
                'new_balances': user_progress.currency_balances,
                'from_currency': from_currency,
                'to_currency': to_currency,
                'amount_from': amount,
                'amount_to': converted_amount
            }
            
        except Exception as e:
            logger.error(f"Error trading currency: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'error': str(e)
            }

    @staticmethod
    def get_user_inventory(user_id):
        """Get the user's inventory and currency balances
        
        Args:
            user_id (str): The user's unique identifier
            
        Returns:
            dict: User's inventory and currency information
        """
        try:
            user_progress = UserProgress.query.filter_by(user_id=user_id).first()
            if not user_progress:
                return {
                    'success': False,
                    'error': 'User progress not found'
                }
            
            # Get transaction history
            transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.created_at.desc()).limit(10).all()
            transaction_history = []
            
            for transaction in transactions:
                transaction_history.append({
                    'id': transaction.id,
                    'type': transaction.transaction_type,
                    'from_currency': transaction.from_currency,
                    'to_currency': transaction.to_currency,
                    'amount': transaction.amount,
                    'description': transaction.description,
                    'created_at': transaction.created_at.strftime('%Y-%m-%d %H:%M:%S')
                })
            
            return {
                'success': True,
                'balances': user_progress.currency_balances,
                'transactions': transaction_history,
                'achievements': user_progress.achievements_earned or []
            }
            
        except Exception as e:
            logger.error(f"Error getting user inventory: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
