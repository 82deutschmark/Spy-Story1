import json
from models import StoryGeneration, Character, db

def check_associations():
    """Check the associations between stories and images in the database"""
    # Get total counts
    story_count = StoryGeneration.query.count()
    character_count = Character.query.count() # Changed ImageAnalysis to Character

    print(f"Total stories: {story_count}")
    print(f"Total characters: {character_count}") # Changed images to characters

    # Check stories with associated images
    stories_with_characters = StoryGeneration.query.filter(StoryGeneration.characters.any()).count() # Changed images to characters
    print(f"Stories with at least one character: {stories_with_characters}") # Changed images to characters

    # Check images with associated stories
    characters_with_stories = Character.query.filter(Character.stories.any()).count() # Changed ImageAnalysis to Character
    print(f"Characters with at least one story: {characters_with_stories}") # Changed images to characters

    # Check a sample story and its characters
    if story_count > 0:
        sample_story = StoryGeneration.query.order_by(StoryGeneration.id.desc()).first()
        character_count = sample_story.characters.count() # Changed images to characters
        print(f"\nSample story (ID: {sample_story.id}):")
        print(f"  Setting: {sample_story.setting}")
        print(f"  Conflict: {sample_story.primary_conflict}")
        print(f"  Associated characters: {character_count}") # Changed images to characters

        if character_count > 0: # Changed images to characters
            print("\nAssociated characters:") # Changed images to characters
            for char in sample_story.characters: # Changed img to char
                print(f"  ID: {char.id}, Type: {char.character_type}, Name: {char.character_name or 'Unknown'}") # Adjusted field names as needed


    # Check responses from key endpoints
    import requests
    base_url = "http://localhost:5000"

    print("\nTesting /debug/images endpoint:")
    try:
        response = requests.get(f"{base_url}/debug/images?page=1&limit=5")
        data = response.json()
        print(f"  Status code: {response.status_code}")
        print(f"  Response structure: {list(data.keys())}")
        if 'data' in data:
            print(f"  'data' keys: {list(data['data'].keys())}")
        elif 'images' in data:
            print(f"  'images' key exists at top level")
        print(f"  Pagination info: {data.get('pagination') or data.get('data', {}).get('pagination')}")
    except Exception as e:
        print(f"  Error testing images endpoint: {str(e)}")

    print("\nTesting /debug/stories-detail endpoint:")
    try:
        response = requests.get(f"{base_url}/debug/stories-detail?page=1&limit=5")
        data = response.json()
        print(f"  Status code: {response.status_code}")
        print(f"  Response structure: {list(data.keys())}")
        if 'stories' in data:
            sample_story = data['stories'][0] if data['stories'] else None
            if sample_story:
                print(f"  Sample story structure: {list(sample_story.keys())}")
    except Exception as e:
        print(f"  Error testing stories endpoint: {str(e)}")

if __name__ == "__main__":
    from main import create_app

    app = create_app()
    with app.app_context():
        check_associations()