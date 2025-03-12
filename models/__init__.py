# Models package

from .base import db
from .currency import Currency, Transaction
from .images import ImageAnalysis
from .scene_images import SceneImages
from .stories import StoryGeneration, story_images, StoryNode, StoryChoice
from .user import UserProgress
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
    'ImageAnalysis', 
    'SceneImages',
    'StoryGeneration', 'story_images', 'StoryNode', 'StoryChoice',
    'UserProgress',
    'CharacterEvolution',
    'Mission',
    'Achievement',
    'PlotArc',
    'AIInstruction'
]