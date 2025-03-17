# Models package

from models.base import db
from models.currency import Currency, Transaction
from models.scene_images import SceneImages
from models.stories import StoryGeneration, StoryNode, StoryChoice
from models.user import UserProgress
from models.character import CharacterEvolution
from models.missions import Mission
from models.achievements import Achievement
from models.plot import PlotArc
from models.ai import AIInstruction
from models.character_data import Character

# For backward compatibility
# Import all models into the models namespace
__all__ = [
    'db',
    'Currency', 'Transaction',
    'SceneImages', 
    'StoryGeneration', 'StoryNode', 'StoryChoice',
    'UserProgress',
    'CharacterEvolution',
    'Mission',
    'Achievement',
    'PlotArc',
    'AIInstruction',
    'Character'
]
