
"""
Constants and configuration values for the application.
Centralizing these values makes them easier to maintain and update.
"""

# Database & ORM
DEFAULT_PER_PAGE = 10
MAX_PER_PAGE = 100

# Currency & Economy
CURRENCY_TYPES = {
    "💎": "Diamond",
    "💷": "Pound",
    "💶": "Euro",
    "💴": "Yen",
    "💵": "Dollar"
}

DEFAULT_CURRENCY_BALANCES = {
    "💎": 500,   # Diamonds
    "💷": 5000,  # Pounds
    "💶": 5000,  # Euros
    "💴": 5000,  # Yen
    "💵": 5000,  # Dollars
}

# Currency exchange rates
EXCHANGE_RATES = {
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

# Character system
CHARACTER_ROLES = [
    'undetermined',
    'villain',
    'neutral',
    'mission-giver'
]

CHARACTER_ROLE_MAPPING = {
    'antagonist': 'villain',
    'villain': 'villain',
    'protagonist': 'neutral',
    'hero': 'neutral',
    'mission giver': 'mission-giver'
}

# OpenAI
DEFAULT_OPENAI_MODEL = "gpt-4o"
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 2000

# Security
DANGEROUS_ACTIONS = [
    "delete_all", 
    "purge", 
    "reset", 
    "clear_database", 
    "truncate"
]

# Confirmations required for dangerous actions
CONFIRMATION_PHRASES = {
    "delete_all_images": "DELETE ALL IMAGES",
    "delete_all_stories": "DELETE ALL STORIES",
    "reset_database": "RESET DATABASE"
}
