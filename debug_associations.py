
import json
from models import StoryGeneration, ImageAnalysis, db

def check_associations():
    """Check the associations between stories and images in the database"""
    # Get total counts
    story_count = StoryGeneration.query.count()
    image_count = ImageAnalysis.query.count()
    
    print(f"Total stories: {story_count}")
    print(f"Total images: {image_count}")
    
    # Check stories with associated images
    stories_with_images = StoryGeneration.query.filter(StoryGeneration.images.any()).count()
    print(f"Stories with at least one image: {stories_with_images}")
    
    # Check images with associated stories
    images_with_stories = ImageAnalysis.query.filter(ImageAnalysis.stories.any()).count()
    print(f"Images with at least one story: {images_with_stories}")
    
    # Check a sample story and its images
    if story_count > 0:
        sample_story = StoryGeneration.query.order_by(StoryGeneration.id.desc()).first()
        image_count = sample_story.images.count()
        print(f"\nSample story (ID: {sample_story.id}):")
        print(f"  Setting: {sample_story.setting}")
        print(f"  Conflict: {sample_story.primary_conflict}")
        print(f"  Associated images: {image_count}")
        
        if image_count > 0:
            print("\nAssociated images:")
            for img in sample_story.images:
                print(f"  ID: {img.id}, Type: {img.image_type}, Name: {img.character_name or 'Unknown'}")
    
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
