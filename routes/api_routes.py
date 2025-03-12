import os
import logging
import json
import uuid
from flask import Blueprint, request, jsonify, session, url_for
from datetime import datetime

from database import db
from models import (ImageAnalysis, StoryGeneration, UserProgress, Transaction, 
                   Mission, PlotArc, CharacterEvolution, StoryNode, StoryChoice)
from services.mission_generator import (generate_mission, get_user_active_missions, 
                                        get_mission_by_id, update_mission_progress, 
                                        complete_mission, fail_mission)
from services.openai_service import analyze_artwork, generate_image_description
from utils.currency_utils import process_transaction
from utils.validation_utils import validate_currency_amount
from utils.input_validation import validate_input
from utils.image_utils import update_image_from_analysis

# Configure logging
logger = logging.getLogger(__name__)

# Create API Blueprint
api_bp = Blueprint('api', __name__)

def get_or_create_user_progress():
    """Get or create user progress record for the current session"""
    if 'user_id' not in session:
        session['user_id'] = str(uuid.uuid4())
        logger.debug(f"Created new user session with ID: {session['user_id']}")

    user_progress = UserProgress.query.filter_by(user_id=session['user_id']).first()
    if not user_progress:
        logger.debug(f"Creating new user progress for ID: {session['user_id']}")
        user_progress = UserProgress(
            user_id=session['user_id'],
            currency_balances={
                "💎": 500,  # Diamonds
                "💷": 5000,  # Pounds
                "💶": 5000,  # Euros
                "💴": 5000,  # Yen
                "💵": 5000,  # Dollars
            }
        )
        db.session.add(user_progress)
        db.session.commit()
        logger.debug(f"Created user progress with initial balances: {user_progress.currency_balances}")
    else:
        logger.debug(f"Found existing user progress for ID: {session['user_id']}")

    return user_progress

@api_bp.route('/save_analysis', methods=['POST'])
def save_analysis():
    """Save edited analysis from debug page"""
    try:
        data = request.json
        image_id = data.get('image_id')
        analysis = data.get('analysis')

        if not image_id or not analysis:
            return jsonify({'error': 'Missing image_id or analysis'}), 400

        image = ImageAnalysis.query.get_or_404(image_id)

        # Update analysis_result field
        image.analysis_result = analysis

        # If this is a character image, update character fields from analysis
        if image.image_type == 'character':
            # Update character name if present
            if 'name' in analysis:
                image.character_name = analysis.get('name')
                image.name = analysis.get('name')  # Update both name fields
            elif 'character_name' in analysis:
                image.character_name = analysis.get('character_name')
                image.name = analysis.get('character_name')

            # Update character traits
            if 'character_traits' in analysis:
                image.character_traits = analysis.get('character_traits')
                image.personality_traits = analysis.get('character_traits')
            elif 'personality_traits' in analysis:
                image.personality_traits = analysis.get('personality_traits')
                image.character_traits = analysis.get('personality_traits')

            # Update role
            if 'role' in analysis:
                image.role = analysis.get('role')
                image.character_role = analysis.get('role')
            elif 'character_role' in analysis:
                image.character_role = analysis.get('character_role')
                image.role = analysis.get('character_role')

            # Update plot lines
            if 'plot_lines' in analysis:
                image.plot_lines = analysis.get('plot_lines')
                image.potential_plot_lines = analysis.get('plot_lines')
            elif 'potential_plot_lines' in analysis:
                image.potential_plot_lines = analysis.get('potential_plot_lines')
                image.plot_lines = analysis.get('potential_plot_lines')

            # Update backstory if present
            if 'backstory' in analysis:
                image.backstory = analysis.get('backstory')

            # Update description if present
            if 'description' in analysis:
                image.description = analysis.get('description')

        else:  # This is a scene image
            # Update scene name/setting
            if 'setting' in analysis:
                image.setting = analysis.get('setting')
                image.name = analysis.get('setting')

            # Update scene type
            if 'scene_type' in analysis:
                image.scene_type = analysis.get('scene_type')

            # Update scene description
            if 'description' in analysis:
                image.setting_description = analysis.get('description')
                image.description = analysis.get('description')

            # Update dramatic moments
            if 'dramatic_moments' in analysis:
                image.dramatic_moments = analysis.get('dramatic_moments')

            # Update story fit
            if 'story_fit' in analysis:
                image.story_fit = analysis.get('story_fit')

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Analysis updated for image {image_id}'
        })

    except Exception as e:
        logger.error(f"Error saving analysis: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/images/all')
def get_all_images():
    """API endpoint to get all images with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
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
        images = query.order_by(ImageAnalysis.id.desc()).paginate(page=page, per_page=per_page)

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

        return jsonify({
            'success': True,
            'images': results,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        })
    except Exception as e:
        logger.error(f"Error getting all images: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/stories/all')
def get_all_stories():
    """API endpoint to get all stories with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
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

        # Get paginated results
        stories = query.order_by(StoryGeneration.id.desc()).paginate(page=page, per_page=per_page)

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
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        })
    except Exception as e:
        logger.error(f"Error getting all stories: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/random_character')
def random_character():
    """API endpoint to get a random character from the database"""
    try:
        random_image = ImageAnalysis.query.filter_by(image_type='character').order_by(db.func.random()).first()

        if not random_image:
            return jsonify({'error': 'No character images found in database'}), 404

        analysis = random_image.analysis_result
        return jsonify({
            'success': True,
            'id': random_image.id,
            'image_url': random_image.image_url,
            'name': analysis.get('name', ''),
            'style': analysis.get('style', ''),
            'character_traits': random_image.character_traits or []
        })
    except Exception as e:
        logger.error(f"Error getting random character: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/missions/active')
def get_active_missions():
    """API endpoint to get all active missions for the current user"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()

        # Get active missions
        if not user_progress.active_missions:
            return jsonify({
                'success': True,
                'missions': []
            })

        missions = Mission.query.filter(Mission.id.in_(user_progress.active_missions)).all()

        # Format mission data
        mission_data = []
        for mission in missions:
            # Get giver and target names
            giver_name = "Unknown"
            target_name = "Unknown"

            if mission.giver:
                giver_name = mission.giver.character_name

            if mission.target:
                target_name = mission.target.character_name

            mission_data.append({
                'id': mission.id,
                'title': mission.title,
                'description': mission.description,
                'objective': mission.objective,
                'giver': giver_name,
                'target': target_name,
                'difficulty': mission.difficulty,
                'reward_currency': mission.reward_currency,
                'reward_amount': mission.reward_amount,
                'deadline': mission.deadline,
                'progress': mission.progress,
                'status': mission.status,
                'created_at': mission.created_at.strftime('%Y-%m-%d %H:%M')
            })

        return jsonify({
            'success': True,
            'missions': mission_data
        })
    except Exception as e:
        logger.error(f"Error getting active missions: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/missions/<int:mission_id>')
def get_mission_details(mission_id):
    """API endpoint to get details of a specific mission"""
    try:
        mission = get_mission_by_id(mission_id)
        if not mission:
            return jsonify({'error': 'Mission not found'}), 404

        # Get user progress to verify the mission belongs to the user
        user_progress = get_or_create_user_progress()

        if mission.user_id != user_progress.user_id:
            return jsonify({'error': 'Unauthorized access to mission'}), 403

        # Get giver and target details
        giver_data = None
        target_data = None

        if mission.giver:
            giver_data = {
                'id': mission.giver.id,
                'name': mission.giver.character_name,
                'image_url': mission.giver.image_url
            }

        if mission.target:
            target_data = {
                'id': mission.target.id,
                'name': mission.target.character_name,
                'image_url': mission.target.image_url
            }

        # Format mission data
        mission_data = {
            'id': mission.id,
            'title': mission.title,
            'description': mission.description,
            'objective': mission.objective,
            'giver': giver_data,
            'target': target_data,
            'difficulty': mission.difficulty,
            'reward_currency': mission.reward_currency,
            'reward_amount': mission.reward_amount,
            'deadline': mission.deadline,
            'progress': mission.progress,
            'status': mission.status,
            'created_at': mission.created_at.strftime('%Y-%m-%d %H:%M'),
            'completed_at': mission.completed_at.strftime('%Y-%m-%d %H:%M') if mission.completed_at else None,
            'progress_updates': mission.progress_updates
        }

        return jsonify({
            'success': True,
            'mission': mission_data
        })
    except Exception as e:
        logger.error(f"Error getting mission details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/missions/generate', methods=['POST'])
def generate_new_mission():
    """API endpoint to generate a new mission for the user"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()

        # Get story ID if provided
        story_id = request.json.get('story_id')

        # Generate the mission
        mission = generate_mission(user_progress.user_id, story_id)

        if not mission:
            return jsonify({'error': 'Failed to generate mission'}), 500

        # Get giver and target names
        giver_name = "Unknown"
        target_name = "Unknown"

        if mission.giver:
            giver_name = mission.giver.character_name

        if mission.target:
            target_name = mission.target.character_name

        # Format mission data
        mission_data = {
            'id': mission.id,
            'title': mission.title,
            'description': mission.description,
            'objective': mission.objective,
            'giver': giver_name,
            'target': target_name,
            'difficulty': mission.difficulty,
            'reward_currency': mission.reward_currency,
            'reward_amount': mission.reward_amount,
            'deadline': mission.deadline,
            'progress': mission.progress,
            'status': mission.status,
            'created_at': mission.created_at.strftime('%Y-%m-%d %H:%M')
        }

        return jsonify({
            'success': True,
            'mission': mission_data
        })
    except Exception as e:
        logger.error(f"Error generating new mission: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/missions/<int:mission_id>/update', methods=['POST'])
def update_mission(mission_id):
    """API endpoint to update mission progress"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()

        # Get mission
        mission = get_mission_by_id(mission_id)
        if not mission:
            return jsonify({'error': 'Mission not found'}), 404

        # Verify the mission belongs to the user
        if mission.user_id != user_progress.user_id:
            return jsonify({'error': 'Unauthorized access to mission'}), 403

        # Get progress and description
        data = request.json
        progress = data.get('progress')
        description = data.get('description')

        if progress is None:
            return jsonify({'error': 'Progress is required'}), 400

        # Update the mission
        success = update_mission_progress(mission_id, progress, description)

        if not success:
            return jsonify({'error': 'Failed to update mission progress'}), 500

        return jsonify({
            'success': True,
            'message': 'Mission progress updated successfully',
            'new_progress': progress
        })
    except Exception as e:
        logger.error(f"Error updating mission progress: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/missions/<int:mission_id>/complete', methods=['POST'])
def complete_mission_route(mission_id):
    """API route to mark a mission as completed"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'User session not found'}), 401

        success = complete_mission(mission_id, user_id)
        if success:
            # Get updated user progress with fresh data
            user_progress = UserProgress.query.filter_by(user_id=user_id).first()

            # Ensure user progress data is refreshed from database
            db.session.refresh(user_progress)

            return jsonify({
                'success': True, 
                'message': 'Mission completed successfully',
                'new_balances': user_progress.currency_balances if user_progress else None,
                'experience_points': user_progress.experience_points,
                'level': user_progress.level,
                'active_missions': user_progress.active_missions,
                'completed_missions': user_progress.completed_missions
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to complete mission'}), 400
    except Exception as e:
        logger.error(f"Error completing mission: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@api_bp.route('/missions/<int:mission_id>/fail', methods=['POST'])
def fail_mission_route(mission_id):
    """API endpoint to mark a mission as failed"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()

        # Get reason if provided
        reason = request.json.get('reason')

        # Fail the mission
        success = fail_mission(mission_id, user_progress.user_id, reason)

        if not success:
            return jsonify({'error': 'Failed to mark mission as failed'}), 500

        return jsonify({
            'success': True,
            'message': 'Mission marked as failed'
        })
    except Exception as e:
        logger.error(f"Error failing mission: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/reanalyze/<int:image_id>', methods=['POST'])
def reanalyze_image(image_id):
    """Reanalyze an existing image using OpenAI"""
    try:
        from utils.api_utils import api_success_response, api_error_response
        from utils.image_utils import update_image_from_analysis
        from services.openai_service import analyze_artwork

        data = request.json or {}
        preserve_relations = data.get('preserve_relations', True)

        # Get the image from the database
        image = ImageAnalysis.query.get_or_404(image_id)

        # Store related stories if we need to preserve relations
        related_stories = []
        if preserve_relations:
            related_stories = [story.id for story in image.stories]

        # Reanalyze the image
        logger.info(f"Reanalyzing image: {image_id}")
        analysis = analyze_artwork(image.image_url)

        if not analysis:
            return api_error_response("Failed to reanalyze image", 500)

        # Update image fields based on the analysis using our utility function
        update_image_from_analysis(image, analysis, preserve_relations)

        # Save changes to the database
        db.session.commit()
        logger.info(f"Reanalyzed image: {image_id}")

        # Restore relations if needed
        if preserve_relations and related_stories:
            from models import Story 
            for story_id in related_stories:
                story = Story.query.get(story_id)
                if story and image not in story.images:
                    story.images.append(image)
            db.session.commit()

        # Prepare a complete analysis object for the frontend that includes all fields
        complete_analysis = {
            'id': image.id,
            'name': image.name,
            'character_name': image.character_name,
            'image_type': image.image_type,
            'description': image.description,
            'image_url': image.image_url,
            'role': image.role,
            'character_traits': image.character_traits or [],
            'personality_traits': image.personality_traits or [],
            'plot_lines': image.plot_lines or [],
            'scene_type': image.scene_type,
            'setting': image.setting,
            'dramatic_moments': image.dramatic_moments or [],
            'created_at': str(image.created_at)
        }

        return api_success_response(
            message="Image reanalyzed successfully",
            data={"analysis": complete_analysis}
        )
    except Exception as e:
        logger.error(f"Error reanalyzing image: {str(e)}")
        db.session.rollback()
        return api_error_response(e, 500)

@api_bp.route('/currency/trade', methods=['POST'])
def trade_currency():
    """Trade between different currency types"""
    from utils.currency_utils import process_transaction
    from utils.validation_utils import validate_currency_amount

    try:
        data = request.json
        from_currency = data.get('from_currency')
        to_currency = data.get('to_currency')
        amount = data.get('amount')

        # Validate required fields
        if not all([from_currency, to_currency, amount]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Validate and convert amount
        is_valid, error, amount = validate_currency_amount(amount)
        if not is_valid:
            return jsonify({'error': error}), 400

        # Get user from session
        if 'user_id' not in session:
            return jsonify({'error': 'Session expired'}), 401

        logger.debug(f"Trade request: {from_currency} -> {to_currency}, amount: {amount}")

        # Get user progress
        user_progress = get_or_create_user_progress()
        if not user_progress:
            return jsonify({'error': 'User progress not found'}), 404

        # Process the transaction
        description = f"Traded {amount} {from_currency} for {to_currency}"
        success, error_message, updated_balances = process_transaction(
            user_progress=user_progress,
            transaction_type='trade',
            description=description,
            from_currency=from_currency,
            to_currency=to_currency,
            amount=amount
        )

        if not success:
            return jsonify({'error': error_message}), 400

        return jsonify({
            'success': True,
            'message': description,
            'new_balances': updated_balances
        })

    except Exception as e:
        logger.error(f"Error trading currency: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/user-progress', methods=['GET'])
def get_user_progress():
    """API endpoint to get user progress"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'success': False, 'error': 'User not logged in'}), 401

    user_progress = UserProgress.query.filter_by(user_id=user_id).first()
    if not user_progress:
        return jsonify({'success': False, 'error': 'User progress not found'}), 404

    return jsonify({
        'success': True,
        'data': {
            'level': user_progress.level,
            'experience_points': user_progress.experience_points,
            'completed_plot_arcs': user_progress.completed_plot_arcs if user_progress.completed_plot_arcs else [],
            'choice_history': user_progress.choice_history if user_progress.choice_history else [],
            'active_missions': user_progress.active_missions if user_progress.active_missions else [],
            'completed_missions': user_progress.completed_missions if user_progress.completed_missions else [],
            'currency_balances': user_progress.currency_balances if user_progress.currency_balances else {}
        }
    })

@api_bp.route('/image/<int:image_id>')
def get_image_details(image_id):
    """API endpoint to get details of a specific image"""
    try:
        image = ImageAnalysis.query.get_or_404(image_id)

        return jsonify({
            'success': True,
            'id': image.id,
            'image_url': image.image_url,
            'image_type': image.image_type,
            'analysis': image.analysis_result,
            'created_at': image.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    except Exception as e:
        logger.error(f"Error getting image details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/image/<int:image_id>', methods=['DELETE'])
def delete_image(image_id):
    """API endpoint to delete a specific image record"""
    try:
        image = ImageAnalysis.query.get_or_404(image_id)

        # Remove associations with stories
        for story in image.stories:
            story.images.remove(image)

        db.session.delete(image)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Image record {image_id} deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting image: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/story/<int:story_id>', methods=['DELETE'])
def delete_story(story_id):
    """API endpoint to delete a specific story record"""
    try:
        story = StoryGeneration.query.get_or_404(story_id)
        db.session.delete(story)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Story record {story_id} deleted successfully'
        })
    except Exception as e:
        logger.error(f"Error deleting story: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/db/delete-all-images', methods=['POST'])
def delete_all_images():
    """API endpoint to delete all image records"""
    try:
        # First remove associations with stories
        for image in ImageAnalysis.query.all():
            for story in image.stories:
                story.images.remove(image)

        # Then delete all images
        num_deleted = db.session.query(ImageAnalysis).delete()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Deleted {num_deleted} image records'
        })
    except Exception as e:
        logger.error(f"Error deleting all images: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/db/delete-all-stories', methods=['POST'])
def delete_all_stories():
    """API endpoint to delete all story records"""
    try:
        num_deleted = db.session.query(StoryGeneration).delete()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Deleted {num_deleted} story records'
        })
    except Exception as e:
        logger.error(f"Error deleting all stories: {str(e)}")
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/db/health-check', methods=['GET'])
def db_health_check():
    """API endpoint to perform a database health check"""
    try:
        # Get counts
        image_count = ImageAnalysis.query.count()
        character_count = ImageAnalysis.query.filter_by(image_type='character').count()
        scene_count = ImageAnalysis.query.filter_by(image_type='scene').count()
        story_count = StoryGeneration.query.count()
        orphaned_images = ImageAnalysis.query.filter(~ImageAnalysis.stories.any()).count()
        empty_stories = StoryGeneration.query.filter(StoryGeneration.generated_story.is_(None)).count()

        # Check for potential issues
        issues = []

        # Check for orphaned images
        if orphaned_images > 0:
            issues.append({
                'severity': 'warning',
                'message': f'Found {orphaned_images} images not associated with any story.'
            })

        # Check for empty stories
        if empty_stories > 0:
            issues.append({
                'severity': 'error',
                'message': f'Found {empty_stories} stories with no content.'
            })

        # Check for characters without names
        unnamed_characters = ImageAnalysis.query.filter(
            (ImageAnalysis.image_type == 'character') & 
            ((ImageAnalysis.character_name.is_(None)) | (ImageAnalysis.character_name == ''))
        ).count()

        if unnamed_characters > 0:
            issues.append({
                'severity': 'warning',
                'message': f'Found {unnamed_characters} character images without names.'
            })

        # Check for characters without roles
        characters_without_roles = ImageAnalysis.query.filter(
            (ImageAnalysis.image_type == 'character') & 
            ((ImageAnalysis.character_role.is_(None)) | (ImageAnalysis.character_role == ''))
        ).count()

        if characters_without_roles > 0:
            issues.append({
                'severity': 'warning',
                'message': f'Found {characters_without_roles} character images without roles.'
            })

        # Return health check results
        return jsonify({
            'success': True,
            'stats': {
                'image_count': image_count,
                'character_count': character_count,
                'scene_count': scene_count,
                'story_count': story_count,
                'orphaned_images': orphaned_images,
                'empty_stories': empty_stories
            },
            'issues': issues,
            'has_issues': len(issues) > 0
        })
    except Exception as e:
        logger.error(f"Error performing health check: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/story_nodes/all')
def get_all_story_nodes():
    """API endpoint to get all story nodes with pagination"""
    try:
        # Get pagination parameters from request
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        # Apply limit to per_page to prevent excessive queries
        if per_page > 100:
            per_page = 100

        # Create paginated query
        nodes_query = StoryNode.query.order_by(StoryNode.id.desc())

        # Get total count for pagination metadata
        total_count = nodes_query.count()

        # Execute paginated query
        paginated_nodes = nodes_query.paginate(page=page, per_page=per_page)

        # Format results
        results = []
        for node in paginated_nodes.items:
            choice_count = len(node.choices) if hasattr(node, 'choices') else 0

            results.append({
                'id': node.id,
                'parent_node_id': node.parent_node_id,
                'text_preview': node.narrative_text[:100] + '...' if len(node.narrative_text) > 100 else node.narrative_text,
                'choices_count': choice_count,
                'is_endpoint': node.is_endpoint,
                'image_id': node.image_id
            })

        # Return paginated response
        return jsonify({
            'success': True,
            'nodes': results,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_count,
                'pages': (total_count + per_page - 1) // per_page
            }
        })
    except Exception as e:
        logger.error(f"Error getting all story nodes: {str(e)}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/generate', methods=['POST'])
def generate_post():
    """Generate analysis for an image URL"""
    image_url = request.form.get('image_url')

    if not image_url:
        return jsonify({'error': 'No image URL provided'}), 400

    try:
        # Validate URL format
        if not image_url.startswith(('http://', 'https://')):
            return jsonify({'error': 'Invalid image URL format'}), 400

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

@api_bp.route('/save_analysis_original', methods=['POST'])
def save_analysis_original():
    """Save the analyzed image data to the database after user confirmation"""
    data = request.json

    if not data or not data.get('analysis') or not data.get('image_url'):
        return jsonify({'error': 'Missing required data'}), 400

    try:
        image_url = data.get('image_url')
        analysis = data.get('analysis')

        # Extract image metadata
        metadata = analysis.get('image_metadata', {})

        # Determine if it's a character or scene based on character indicators
        is_character = False

        # Check for explicit type field (new format)
        if 'type' in analysis and analysis['type'] == 'CHARACTER':
            is_character = True
            logger.debug("Detected character from 'type' field")
        # Check for nested character object (old format)
        elif 'character' in analysis and isinstance(analysis['character'], dict):
            is_character = True
            logger.debug("Detected character from nested 'character' object")
        # Or check for character-specific fields at the top level
        elif any(key in analysis for key in ['character_name', 'character_traits', 'plot_lines', 'personality_traits', 'potential_plot_lines']):
            is_character = True
            logger.debug("Detected character from character-specific fields")
        # Or check for character-specific role field
        elif 'role' in analysis and analysis['role'].lower() in ['hero', 'villain', 'neutral', 'protagonist', 'antagonist']:
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

        # Extract traits and plot lines either from character object or top level
        character_traits = None
        if is_character:
            # Check for personality_traits (new format) first
            if 'personality_traits' in analysis:
                character_traits = analysis.get('personality_traits')
            # Then check old format options
            elif 'character' in analysis and 'character_traits' in character_data:
                character_traits = character_data.get('character_traits')
            else:
                character_traits = analysis.get('character_traits')

        character_role = None
        if is_character:
            if 'character' in analysis and 'role' in character_data:
                character_role = character_data.get('role')
            else:
                character_role = analysis.get('role')

        plot_lines = None
        if is_character:
            # Check for potential_plot_lines (new format) first
            if 'potential_plot_lines' in analysis:
                plot_lines = analysis.get('potential_plot_lines')
            # Then check old format options
            elif 'character' in analysis and 'plot_lines' in character_data:
                plot_lines = character_data.get('plot_lines')
            else:
                plot_lines = analysis.get('plot_lines')

        # Create new ImageAnalysis record
        image_analysis = ImageAnalysis(
            image_url=image_url,
            image_width=metadata.get('width'),
            image_height=metadata.get('height'),
            image_format=metadata.get('format'),
            image_size_bytes=metadata.get('size_bytes'),
            image_type='character' if is_character else 'scene',
            analysis_result=analysis,
            character_name=character_name,  # Get name with our new logic
            character_traits=character_traits,
            character_role=character_role,
            plot_lines=plot_lines,
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

@api_bp.route('/validate_image_types')
def validate_image_types():
    """API endpoint to validate image type storage and check for inconsistencies"""
    try:
        # Get all images
        images = ImageAnalysis.query.all()

        results = {
            'character_images': 0,
            'scene_images': 0,
            'character_missing_traits': 0,
            'scene_missing_details': 0,
            'inconsistent_fields': 0,
            'samples': []
        }

        for img in images:
            # Check image type
            if img.image_type == 'character':
                results['character_images'] += 1

                # Check if character data is missing
                if not img.character_traits or not img.character_role or not img.plot_lines:
                    results['character_missing_traits'] += 1

                # Add sample data
                if len(results['samples']) < 3 and img.image_type == 'character':
                    sample = {
                        'id': img.id,
                        'image_url': img.image_url,
                        'image_type': img.image_type,
                        'character_traits': img.character_traits,
                        'character_role': img.character_role,
                        'plot_lines': img.plot_lines
                    }
                    results['samples'].append(sample)

            elif img.image_type == 'scene':
                results['scene_images'] += 1

                # Check if scene data is missing
                if not img.scene_type or not img.setting or not img.dramatic_moments:
                    results['scene_missing_details'] += 1

                # Add sample data
                if len(results['samples']) < 6 and img.image_type == 'scene' and len(results['samples']) >= 3:
                    sample = {
                        'id': img.id,
                        'image_url': img.image_url,
                        'image_type': img.image_type,
                        'scene_type': img.scene_type,
                        'setting': img.setting,
                        'dramatic_moments': img.dramatic_moments
                    }
                    results['samples'].append(sample)

            # Check for inconsistencies in analysis_result vs. specific fields
            if img.analysis_result:
                inconsistency = False
                if img.image_type == 'character':
                    if img.character_traits != img.analysis_result.get('character_traits'):
                        inconsistency = True
                elif img.image_type == 'scene':
                    if img.scene_type != img.analysis_result.get('scene_type'):
                        inconsistency = True

                if inconsistency:
                    results['inconsistent_fields'] += 1

        return jsonify(results)
    except Exception as e:
        logger.error(f"Error validating image types: {str(e)}")
        return jsonify({'error': str(e)}), 500
from flask import Blueprint, jsonify, request
from models import ImageAnalysis
from database import db
import logging

logger = logging.getLogger(__name__)

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/random_character', methods=['GET'])
def random_character():
    """Get a random character for character selection"""
    try:
        # Get random character image
        character = ImageAnalysis.query.filter_by(image_type='character').order_by(db.func.random()).first()
        
        if not character:
            return jsonify({
                'success': False,
                'error': 'No character images found'
            }), 404
        
        # Prepare character data
        character_data = {
            'id': character.id,
            'image_url': character.image_url,
            'name': character.character_name or 'Mystery Character',
        }
        
        # Add additional data if available
        if character.character_traits:
            character_data['traits'] = character.character_traits
        
        if character.analysis_result:
            try:
                analysis = character.analysis_result
                if 'style' in analysis:
                    character_data['style'] = analysis.get('style', 'A mysterious character')
            except Exception as e:
                logger.error(f"Error parsing analysis result: {str(e)}")
        
        return jsonify({
            'success': True,
            'character': character_data
        })
        
    except Exception as e:
        logger.error(f"Error fetching random character: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
