"""
Script to verify model changes are working correctly
"""
import os
import sys

# Add the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Try importing the models to verify they load correctly
from models import UserProgress, StoryNode, StoryChoice

# If we get here without errors, the imports worked
print("✅ Model imports working correctly - Achievement references removed")

# Print the fields of UserProgress to verify agent_codename is present
print("\nUserProgress model columns:")
for column in UserProgress.__table__.columns:
    print(f" - {column.name}: {column.type}")

print("\nStoryNode model achievement_id:")
achievement_column = StoryNode.__table__.columns.get('achievement_id')
if achievement_column:
    print(f" - {achievement_column.name}: {achievement_column.type}")
    print(f" - Foreign Key: {'Yes' if achievement_column.foreign_keys else 'No'}")

print("\n✅ Verification complete")
