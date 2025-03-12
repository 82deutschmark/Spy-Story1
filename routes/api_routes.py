import os
import logging
import json
import uuid
from flask import Blueprint, request, jsonify, session
from datetime import datetime

from database import db
from models import (ImageAnalysis, StoryGeneration, UserProgress, Transaction, 
                   Mission, PlotArc, CharacterEvolution)
from services.mission_generator import (generate_mission, get_user_active_missions, 
                                        get_mission_by_id, update_mission_progress, 
                                        complete_mission, fail_mission)

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

from flask import Blueprint, jsonify, request
from models import ImageAnalysis
from database import db
import logging
from sqlalchemy import func

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

@api_bp.route('/character/random', methods=['GET'])
def get_random_character():
    """Get a random character from the database"""
    try:
        # Get a random character
        character = ImageAnalysis.query.filter_by(image_type='character').order_by(func.random()).first()

        if not character:
            return api_error_response("No character images found", 404)

        # Extract character details
        character_data = {
            'id': character.id,
            'image_url': character.image_url,
            'name': character.character_name or 'Unnamed Character',
            'role': character.character_role or 'undetermined',
            'traits': character.character_traits or [],
            'backstory': character.backstory or ''
        }

        # Log successful character fetch
        logging.info(f"Successfully fetched random character ID: {character.id}")

        return api_success_response(character=character_data)
    except Exception as e:
        logging.error(f"Error in get_random_character: {str(e)}")
        return api_error_response(str(e))

def api_success_response(message="Success", data=None, code=200):
    return jsonify({'success': True, 'message': message, 'data': data}), code

def api_error_response(message="Error", code=500):
    return jsonify({'success': False, 'message': message}), code