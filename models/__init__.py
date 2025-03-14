# Models package

from .base import db
from .currency import Currency, Transaction
from .scene_images import SceneImages
from .stories import StoryGeneration, StoryNode, StoryChoice
from .user import UserProgress
from .character_data import Character
from .character import CharacterEvolution
from .missions import Mission
from .achievements import Achievement
from .plot import PlotArc
from .ai import AIInstruction

# For backward compatibility
# Import all models into the models namespace
__all__ = [
    'db',
    'Currency', 'Transaction',
    'Character',
    'SceneImages',
    'StoryGeneration', 'StoryNode', 'StoryChoice',
    'UserProgress',
    'CharacterEvolution',
    'Mission',
    'Achievement',
    'PlotArc',
    'AIInstruction'
]