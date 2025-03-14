from models.base import db
from models.currency import Currency, Transaction
from models.character import Character
from models.stories import StoryGeneration, StoryNode, StoryChoice
from models.user import UserProgress
from models.character import CharacterEvolution
from models.missions import Mission
from models.achievements import Achievement
from models.plot import PlotArc
from models.ai import AIInstruction

# For backward compatibility
# Import all models into the models namespace
__all__ = [
    'db',
    'Currency', 'Transaction',
    'Character',
    'StoryGeneration', 'StoryNode', 'StoryChoice',
    'UserProgress',
    'CharacterEvolution',
    'Mission',
    'Achievement',
    'PlotArc',
    'AIInstruction'
]