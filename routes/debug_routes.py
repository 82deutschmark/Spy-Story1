import os
import logging
import json
import uuid
from flask import Blueprint, render_template, request, jsonify, url_for, redirect, flash, session

from database import db
from models import AIInstruction, ImageAnalysis, StoryGeneration
from services.openai_service import analyze_artwork, generate_image_description
from routes.main_routes import get_or_create_user_progress

# Configure logging
logger = logging.getLogger(__name__)

# Create Debug Blueprint
debug_bp = Blueprint('debug', __name__)

@debug_bp.route('/')
@debug_bp.route('/dashboard')
def debug_dashboard():
    """Debug page with image analysis tool and database view"""
    from datetime import datetime
    now = datetime.now().timestamp()
    recent_images = ImageAnalysis.query.order_by(ImageAnalysis.created_at.desc()).limit(10).all()
    recent_stories = StoryGeneration.query.order_by(StoryGeneration.created_at.desc()).limit(10).all()

    # Database statistics
    image_count = ImageAnalysis.query.count()
    character_count = ImageAnalysis.query.filter_by(image_type='character').count()
    scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
    story_count = StoryGeneration.query.count()
    orphaned_images = ImageAnalysis.query.filter(~ImageAnalysis.stories.any()).count()
    empty_stories = StoryGeneration.query.filter(StoryGeneration.generated_story.is_(None)).count()

    # Try to get admin URL, or use a fallback
    try:
        admin_url = url_for('admin.index')
    except:
        admin_url = '/admin'  # Fallback URL

    return render_template(
        'debug.html',
        recent_images=recent_images,
        recent_stories=recent_stories,
        image_count=image_count,
        character_count=character_count,
        scene_count=scene_count,
        story_count=story_count,
        orphaned_images=orphaned_images,
        empty_stories=empty_stories,
        admin_url=admin_url,
        now=now
    )

@debug_bp.route('/images')
def debug_image_details():
    """API endpoint for debug page to get images with pagination and additional details"""
    try:
        from utils.api_utils import api_success_response, api_error_response, paginate_query_results

        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        image_type = request.args.get('type')
        search = request.args.get('search')

        query = ImageAnalysis.query

        # Apply filters
        if image_type:
            query = query.filter_by(image_type=image_type)

        if search:
            # Search by ID or character name
            if search.isdigit():
                query = query.filter(ImageAnalysis.id == int(search))
            else:
                query = query.filter(ImageAnalysis.character_name.ilike(f'%{search}%'))

        # Execute count query
        total = query.count()

        # Get paginated results
        images = query.order_by(ImageAnalysis.id.desc()).paginate(page=page, per_page=limit)

        # Format results
        results = []
        for img in images.items:
            analysis = img.analysis_result or {}
            name = img.character_name or ''
            if not name and analysis:
                name = analysis.get('name', '')

            results.append({
                'id': img.id,
                'image_url': img.image_url,
                'image_type': img.image_type,
                'name': name,
                'created_at': img.created_at.strftime('%Y-%m-%d %H:%M'),
                'traits': img.character_traits or [],
                'role': img.character_role or '',
                'stories_count': img.stories.count()
            })

        # Use the pagination utility
        paginated_data = paginate_query_results(results, page, limit, total)

        return api_success_response(
            data={'images': paginated_data['results'], 'pagination': paginated_data['pagination']}
        )
    except Exception as e:
        logger.error(f"Error getting debug images: {str(e)}")
        return api_error_response(e, 500)

@debug_bp.route('/stories-detail', methods=['GET'])
def debug_story_details():
    """API endpoint for debug page to get stories with pagination and additional details"""
    try:
        logger.info("Fetching stories details with pagination")
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search')

        query = StoryGeneration.query

        # Apply search filter
        if search:
            if search.isdigit():
                query = query.filter(StoryGeneration.id == int(search))
            else:
                query = query.filter(
                    db.or_(
                        StoryGeneration.primary_conflict.ilike(f'%{search}%'),
                        StoryGeneration.setting.ilike(f'%{search}%')
                    )
                )

        # Execute count query
        total = query.count()

        # Get paginated results with larger limit support
        # Safety cap at 1000 to prevent excessive queries
        actual_limit = min(limit, 1000) 
        stories = query.order_by(StoryGeneration.id.desc()).paginate(page=page, per_page=actual_limit)

        # Format results
        results = []
        for story in stories.items:
            # Extract title from JSON if available
            title = "Untitled Story"
            if story.generated_story:
                try:
                    story_data = json.loads(story.generated_story)
                    if isinstance(story_data, dict) and 'title' in story_data:
                        title = story_data['title']
                except:
                    pass

            results.append({
                'id': story.id,
                'title': title,
                'conflict': story.primary_conflict,
                'setting': story.setting,
                'images_count': len(story.images),
                'character_names': [img.character_name for img in story.images if img.character_name],
                'created_at': story.created_at.strftime('%Y-%m-%d %H:%M')
            })

        return jsonify({
            'success': True,
            'stories': results,
            'pagination': {
                'page': page,
                'per_page': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Error getting debug stories: {str(e)}")
        return jsonify({'error': str(e)}), 500

@debug_bp.route('/generate', methods=['POST'])
def generate_post():
    """Handle image analysis requests from debug page"""
    image_url = request.form.get('image_url')

    if not image_url:
        return jsonify({'error': 'No image URL provided'}), 400

    try:
        # Validate URL format
        if not image_url.startswith(('http://', 'https://')):
            return jsonify({'error': 'Invalid image URL format. URL must start with http:// or https://'}), 400

        # Check for OpenAI API key
        if not os.environ.get("OPENAI_API_KEY"):
            return jsonify({'error': 'OpenAI API key not configured. Please add it to your Replit Secrets.'}), 500

        # Analyze the artwork using OpenAI
        analysis = analyze_artwork(image_url)

        # Generate a description of the analyzed image
        description = generate_image_description(analysis)

        return jsonify({
            'success': True,
            'description': description,
            'analysis': analysis,
            'saved_to_db': False,
            'image_url': image_url
        })

    except Exception as e:
        logger.error(f"Error generating post: {str(e)}")
        return jsonify({'error': str(e)}), 500

@debug_bp.route('/save_analysis', methods=['POST'])
def save_analysis():
    """Save the analyzed image data to the database after user confirmation"""
    data = request.json

    if not data or not data.get('analysis') or not data.get('image_url'):
        return jsonify({'error': 'Missing required data'}), 400

    try:
        image_url = data.get('image_url')
        analysis = data.get('analysis')

        # Extract image metadata
        metadata = analysis.get('image_metadata', {})

        # Determine if it's a character or scene based on image_type or standard indicators
        is_character = False

        # Check explicit image_type field first
        if 'image_type' in analysis and analysis['image_type'].lower() == 'character':
            is_character = True
            logger.debug("Detected character from image_type field")
        # Or check type field (from OpenAI response)
        elif 'type' in analysis and analysis['type'].upper() == 'CHARACTER':
            is_character = True
            logger.debug("Detected character from type field")
        # Check for nested character object
        elif 'character' in analysis and isinstance(analysis['character'], dict):
            is_character = True
            logger.debug("Detected character from nested 'character' object")
        # Or check for character-specific fields at the top level
        elif any(key in analysis for key in ['character_name', 'character_traits', 'plot_lines', 'personality_traits']):
            is_character = True
            logger.debug("Detected character from top-level character fields")
        # Or check for character-specific role field
        elif 'role' in analysis and analysis['role'] in ['hero', 'villain', 'neutral', 'mission-giver', 'antagonist', 'protagonist']:
            is_character = True
            logger.debug("Detected character from role field")

        logger.info(f"Image classified as: {'character' if is_character else 'scene'}")

        # Extract character details if this is a character image
        character_data = analysis.get('character', {})

        # Get character name - check all possible locations in a consistent manner
        character_name = None
        if is_character:
            # Try to find name in all possible locations
            if 'character' in analysis and isinstance(analysis['character'], dict):
                if 'name' in analysis['character']:
                    character_name = analysis['character'].get('name')

            # If not found in character object, check top level fields
            if not character_name:
                if 'character_name' in analysis:
                    character_name = analysis.get('character_name')
                elif 'name' in analysis:
                    character_name = analysis.get('name')

            # Log character name extraction for debugging
            logger.debug(f"Extracted character name: {character_name} from analysis structure")

            # Ensure we always have a name for characters
            if not character_name:
                logger.warning(f"Could not find a name in the API response. Using default name.")
                character_name = "Unnamed Character"

        # Handle the 'name' field (for compatibility with all DB schemas)
        name = character_name if is_character else analysis.get('setting', 'Unnamed Scene')

        # Extract traits and plot lines either from character object or top level
        character_traits = None
        if is_character:
            # Check all possible trait field names
            if 'character_traits' in analysis:
                character_traits = analysis.get('character_traits')
            elif 'personality_traits' in analysis:
                character_traits = analysis.get('personality_traits')
            elif 'character' in analysis and 'character_traits' in character_data:
                character_traits = character_data.get('character_traits')
            elif 'character' in analysis and 'personality_traits' in character_data:
                character_traits = character_data.get('personality_traits')

        # Sync personality_traits with character_traits for consistency
        personality_traits = character_traits

        character_role = None
        if is_character:
            if 'character' in analysis and 'role' in character_data:
                character_role = character_data.get('role')
            else:
                character_role = analysis.get('role')

            # Standardize character role to one of the valid options
            valid_roles = ['undetermined', 'villain', 'neutral', 'mission-giver']

            if character_role is None or character_role == '':
                character_role = 'undetermined'
            elif character_role.lower() == 'antagonist' or character_role.lower() == 'villain':
                character_role = 'villain'
            elif character_role.lower() == 'protagonist' or character_role.lower() == 'hero':
                character_role = 'neutral'
            elif character_role.lower() == 'mission giver':
                character_role = 'mission-giver'
            elif character_role.lower() not in valid_roles:
                character_role = 'undetermined'
            else:
                character_role = character_role.lower()

            logger.debug(f"Standardized character role: {character_role}")

        plot_lines = None
        if is_character:
            if 'plot_lines' in analysis:
                plot_lines = analysis.get('plot_lines')
            elif 'potential_plot_lines' in analysis:
                plot_lines = analysis.get('potential_plot_lines')
            elif 'character' in analysis and 'plot_lines' in character_data:
                plot_lines = character_data.get('plot_lines')
            elif 'character' in analysis and 'potential_plot_lines' in character_data:
                plot_lines = character_data.get('potential_plot_lines')

        # Get backstory if available
        backstory = None
        if is_character:
            if 'backstory' in analysis:
                backstory = analysis.get('backstory')
            elif 'character' in analysis and 'backstory' in character_data:
                backstory = character_data.get('backstory')

        # Get description if available
        description = None
        if 'description' in analysis:
            description = analysis.get('description')
        elif is_character and 'character' in analysis and 'description' in character_data:
            description = character_data.get('description')

        # Create new ImageAnalysis record
        image_analysis = ImageAnalysis(
            image_url=image_url,
            image_width=metadata.get('width'),
            image_height=metadata.get('height'),
            image_format=metadata.get('format'),
            image_size_bytes=metadata.get('size_bytes'),
            image_type='character' if is_character else 'scene',
            analysis_result=analysis,
            name=name,  # Set the name field for compatibility
            character_name=character_name,  
            character_traits=character_traits,
            personality_traits=personality_traits,  # Add personality_traits for consistency
            character_role=character_role,
            role=character_role,  # Set role field for compatibility
            plot_lines=plot_lines,
            potential_plot_lines=plot_lines,  # Set potential_plot_lines for compatibility
            backstory=backstory,
            description=description,
            scene_type=analysis.get('scene_type') if not is_character else None,
            setting=analysis.get('setting') if not is_character else None,
            setting_description=analysis.get('setting_description') if not is_character else None,
            story_fit=analysis.get('story_fit') if not is_character else None,
            dramatic_moments=analysis.get('dramatic_moments') if not is_character else None
        )

        db.session.add(image_analysis)
        db.session.commit()
        logger.info(f"Saved image analysis: {image_analysis.id}")

        return jsonify({
            'success': True,
            'message': 'Analysis saved to database',
            'image_id': image_analysis.id
        })

    except Exception as e:
        logger.error(f"Error saving analysis: {str(e)}")
        # Rollback and close the session to release any locks
        try:
            db.session.rollback()
        except:
            pass

        # Make sure we return a valid JSON response
        return jsonify({
            'success': False,
            'error': f"Database error: {str(e)}"
        }), 500

@debug_bp.route('/images/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    """Delete a specific image from the database"""
    try:
        image = ImageAnalysis.query.get_or_404(image_id)

        # Store image details for logging
        image_info = {
            'id': image.id,
            'type': image.image_type,
            'name': image.name or image.character_name or 'Unnamed'
        }

        # Delete the image
        db.session.delete(image)
        db.session.commit()

        logger.info(f"Deleted image: {image_info}")

        return jsonify({
            'success': True,
            'message': f'Image {image_id} deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting image {image_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@debug_bp.route('/images', methods=['DELETE'])
def delete_all_images():
    """Delete all images from the database"""
    try:
        from utils.api_utils import api_success_response, api_error_response, validate_action

        # Validate this dangerous action with confirmation
        confirmation = request.json.get('confirmation') if request.is_json else request.form.get('confirmation')
        is_valid, error_message = validate_action(
            action_type="delete_all", 
            confirmation=confirmation,
            required_confirmation="DELETE ALL IMAGES"
        )

        if not is_valid:
            return api_error_response(error_message, 400, error_type="validation_error")

        # Get count for logging
        count = ImageAnalysis.query.count()

        # Delete all images
        ImageAnalysis.query.delete()
        db.session.commit()

        logger.info(f"Deleted all images: {count} total")

        return api_success_response(
            message=f'All {count} images deleted successfully'
        )
    except Exception as e:
        logger.error(f"Error deleting all images: {str(e)}")
        db.session.rollback()
        return api_error_response(e, 500)

@debug_bp.route('/stories/<int:story_id>', methods=['DELETE'])
def delete_story(story_id):
    """Delete a specific story from the database"""
    try:
        story = StoryGeneration.query.get_or_404(story_id)

        # Store story details for logging
        title = "Untitled Story"
        if story.generated_story:
            try:
                story_data = json.loads(story.generated_story)
                if isinstance(story_data, dict) and 'title' in story_data:
                    title = story_data['title']
            except:
                pass

        story_info = {
            'id': story.id,
            'title': title
        }

        # Delete the story
        db.session.delete(story)
        db.session.commit()

        logger.info(f"Deleted story: {story_info}")

        return jsonify({
            'success': True,
            'message': f'Story {story_id} deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting story {story_id}: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@debug_bp.route('/stories', methods=['DELETE'])
def delete_all_stories():
    """Delete all stories from the database"""
    try:
        # Get count for logging
        count = StoryGeneration.query.count()

        # Delete all stories
        StoryGeneration.query.delete()
        db.session.commit()

        logger.info(f"Deleted all stories: {count} total")

        return jsonify({
            'success': True,
            'message': f'All {count} stories deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting all stories: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500