"""
Constants and configuration values for the application.
Centralizing these values makes them easier to maintain and update.
"""



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



# OpenAI
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
DEFAULT_TEMPERATURE = 0.6
DEFAULT_MAX_TOKENS = 12000
INITIAL_STORY_TEMPERATURE = 0.8  # Lower temperature for more focused, instruction-following responses
STORY_SEGMENT_TEMPERATURE = 0.8
CHARACTER_INTERACTION_TEMPERATURE = 0.8

# Model configuration dictionary for easy reference
MODEL_CONFIG = {
    "model": DEFAULT_OPENAI_MODEL,
    "temperature": DEFAULT_TEMPERATURE,
    "max_tokens": DEFAULT_MAX_TOKENS
}

