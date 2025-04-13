from models.base import db
from models.currency import Currency, Transaction
from models.stories import StoryGeneration, story_images, StoryNode, StoryChoice
from models.user import UserProgress
from models.character_evolution import CharacterEvolution
from models.missions import Mission
# Achievement module has been removed from the project
from models.plot import PlotArc
from models.ai import AIInstruction

# For backward compatibility
# Import all models into the models namespace
__all__ = [
    'db',
    'Currency', 'Transaction',
    'StoryGeneration', 'story_images', 'StoryNode', 'StoryChoice',
    'UserProgress',
    'CharacterEvolution',
    'Mission',
    # 'Achievement', # Removed as module no longer exists
    'PlotArc',
    'AIInstruction'
]

class Mission(db.Model):
    giver_id = db.Column(db.Integer, ForeignKey('characters.id'))
    target_id = db.Column(db.Integer, ForeignKey('characters.id'))