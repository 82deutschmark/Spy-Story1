
from blinker import signal

# Define signals
app_started = signal('app-started')
app_stopping = signal('app-stopping')
story_generated = signal('story-generated')
choice_made = signal('choice-made') 
mission_completed = signal('mission-completed')
level_up = signal('level-up')
achievement_unlocked = signal('achievement-unlocked')

# Example of how to connect a receiver function to a signal
# @story_generated.connect
# def handle_story_generated(sender, **kwargs):
#     story_data = kwargs.get('story_data')
#     user_id = kwargs.get('user_id')
#     print(f"Story generated for user {user_id}")
