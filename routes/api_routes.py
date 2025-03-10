
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
            elif 'character_name' in analysis:
                image.character_name = analysis.get('character_name')

            # Update character role with validation
            if 'role' in analysis:
                role = analysis.get('role')
                # Standardize role
                valid_roles = ['undetermined', 'villain', 'neutral', 'mission-giver']
                if role is None or role == '':
                    image.character_role = 'undetermined'
                elif role.lower() == 'antagonist' or role.lower() == 'villain':
                    image.character_role = 'villain'
                elif role.lower() == 'protagonist' or role.lower() == 'hero':
                    image.character_role = 'neutral'
                elif role.lower() == 'mission giver':
                    image.character_role = 'mission-giver'
                elif role.lower() not in valid_roles:
                    image.character_role = 'undetermined'
                else:
                    image.character_role = role.lower()

            # Update traits and plot lines
            if 'personality_traits' in analysis:
                image.character_traits = analysis.get('personality_traits')
            elif 'character_traits' in analysis:
                image.character_traits = analysis.get('character_traits')

            if 'potential_plot_lines' in analysis:
                image.plot_lines = analysis.get('potential_plot_lines')
            elif 'plot_lines' in analysis:
                image.plot_lines = analysis.get('plot_lines')

        db.session.commit()
        logger.info(f"Successfully saved analysis for image ID {image_id}")

        return jsonify({
            'success': True,
            'message': 'Analysis updated successfully'
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
    """API endpoint to complete a mission"""
    try:
        # Get user progress
        user_progress = get_or_create_user_progress()

        # Complete the mission
        success = complete_mission(mission_id, user_progress.user_id)

        if not success:
            return jsonify({'error': 'Failed to complete mission'}), 500

        return jsonify({
            'success': True,
            'message': 'Mission completed successfully',
            'new_balances': user_progress.currency_balances
        })
    except Exception as e:
        logger.error(f"Error completing mission: {str(e)}")
        return jsonify({'error': str(e)}), 500

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

@api_bp.route('/currency/trade', methods=['POST'])
def trade_currency():
    """Trade between different currency types"""
    try:
        data = request.json
        from_currency = data.get('from_currency')
        to_currency = data.get('to_currency')
        amount = data.get('amount')

        if not all([from_currency, to_currency, amount]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Convert amount to int if it's a string
        try:
            amount = int(amount)
        except ValueError:
            return jsonify({'error': 'Amount must be a number'}), 400

        # Get user from session
        if 'user_id' not in session:
            return jsonify({'error': 'Session expired'}), 401

        logger.debug(f"Trade request: {from_currency} -> {to_currency}, amount: {amount}")

        # Get exchange rates based on the new rules
        rates = {
            "💎": {  # Diamonds can only be converted to EUR and YEN
                "💶": 1000,    # 1 diamond = 1000 EUR
                "💴": 150000,  # 1 diamond = 150000 YEN
            },
            "💶": {  # EUR to other currencies (except diamonds)
                "💴": 150,     # 1 EUR = 150 YEN
                "💵": 1.1,     # 1 EUR = 1.1 USD
                "💷": 0.85,    # 1 EUR = 0.85 GBP
            },
            "💴": {  # YEN to other currencies (except diamonds)
                "💶": 0.0067,  # 1 YEN = 0.0067 EUR
                "💵": 0.0073,  # 1 YEN = 0.0073 USD
                "💷": 0.0057,  # 1 YEN = 0.0057 GBP
            },
            "💵": {  # USD to other currencies (except diamonds)
                "💶": 0.91,    # 1 USD = 0.91 EUR
                "💴": 136.5,   # 1 USD = 136.5 YEN
                "💷": 0.77,    # 1 USD = 0.77 GBP
            },
            "💷": {  # GBP to other currencies (except diamonds)
                "💶": 1.18,    # 1 GBP = 1.18 EUR
                "💴": 177,     # 1 GBP = 177 YEN
                "💵": 1.3,     # 1 GBP = 1.3 USD
            }
        }

        # Check if the conversion is allowed
        if from_currency == "💎" and to_currency not in ["💶", "💴"]:
            return jsonify({
                'error': 'Diamonds can only be converted to Euros (💶) or Yen (💴)'
            }), 400

        if to_currency == "💎":
            return jsonify({
                'error': 'Cannot convert other currencies to diamonds'
            }), 400

        if from_currency not in rates or to_currency not in rates[from_currency]:
            return jsonify({
                'error': 'Invalid currency conversion'
            }), 400

        # Get user progress using the helper function
        user_progress = get_or_create_user_progress()
        if not user_progress:
            return jsonify({'error': 'User progress not found'}), 404

        # Check if user has enough currency
        current_balance = user_progress.currency_balances.get(from_currency, 0)
        if current_balance < amount:
            return jsonify({
                'error': 'Insufficient funds',
                'current_balance': current_balance,
                'required_amount': amount
            }), 400

        # Calculate conversion
        conversion_rate = rates[from_currency][to_currency]
        converted_amount = int(amount * conversion_rate)  # Use integer for currency amounts

        logger.debug(f"Conversion rate: {conversion_rate}, Converted amount: {converted_amount}")

        # Record transaction
        transaction = Transaction(
            user_id=user_progress.user_id,
            transaction_type='trade',
            from_currency=from_currency,
            to_currency=to_currency,
            amount=amount,
            description=f"Traded {amount} {from_currency} for {converted_amount} {to_currency}"
        )
        db.session.add(transaction)

        # Perform the exchange
        user_progress.currency_balances[from_currency] = current_balance - amount
        user_progress.currency_balances[to_currency] = user_progress.currency_balances.get(to_currency, 0) + converted_amount

        try:
            db.session.commit()
            logger.info(f"Currency trade successful for user {user_progress.user_id}: {amount} {from_currency} -> {converted_amount} {to_currency}")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Database error during currency trade: {str(e)}")
            return jsonify({'error': 'Failed to process trade'}), 500

        return jsonify({
            'success': True,
            'message': f'Successfully traded {amount} {from_currency} for {converted_amount} {to_currency}',
            'new_balances': user_progress.currency_balances
        })

    except Exception as e:
        logger.error(f"Error trading currency: {str(e)}")
        return jsonify({'error': str(e)}), 500
