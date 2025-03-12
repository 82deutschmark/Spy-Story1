
import os
import logging
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_admin.contrib.sqla.filters import FilterEqual, FilterLike
from database import db
from models import ImageAnalysis, StoryGeneration, CharacterEvolution, UserProgress, Transaction

# Configure logging
logger = logging.getLogger(__name__)

admin = Admin(name='Story Creator Admin', template_mode='bootstrap4')

class BaseModelView(ModelView):
    can_view_details = True
    can_export = True
    page_size = 50
    
    def __init__(self, model, **kwargs):
        super(BaseModelView, self).__init__(model, db.session, **kwargs)

class ImageAnalysisView(BaseModelView):
    column_searchable_list = ['character_name', 'image_type']
    column_filters = ['image_type', 'character_role']
    column_exclude_list = ['analysis_result']
    column_default_sort = ('created_at', True)
    form_columns = ['image_url', 'character_name', 'image_type', 'character_role', 'character_traits', 'description']

class StoryGenerationView(BaseModelView):
    column_searchable_list = ['primary_conflict', 'setting']
    column_filters = ['setting', 'primary_conflict']
    column_exclude_list = ['generated_story', 'session_data']
    column_default_sort = ('created_at', True)

class CharacterEvolutionView(BaseModelView):
    column_searchable_list = ['user_id', 'status', 'role']
    column_filters = ['status', 'role']
    column_exclude_list = ['evolved_traits', 'plot_contributions', 'relationship_network', 'evolution_log']
    column_default_sort = ('last_updated', True)

class UserProgressView(BaseModelView):
    column_searchable_list = ['user_id']
    column_default_sort = ('last_updated', True)
    column_exclude_list = ['choice_history', 'currency_balances', 'completed_plot_arcs', 'active_plot_arcs', 'game_state']

class TransactionView(BaseModelView):
    column_searchable_list = ['user_id', 'transaction_type']
    column_filters = ['transaction_type', 'from_currency', 'to_currency']
    column_default_sort = ('created_at', True)

def init_admin(app):
    """Initialize Flask-Admin with models"""
    try:
        admin.init_app(app)
        
        # Add model views with explicit, unique endpoints to avoid conflicts
        admin.add_view(ImageAnalysisView(ImageAnalysis, name='Images', endpoint='admin_image_analysis'))
        admin.add_view(StoryGenerationView(StoryGeneration, name='Stories', endpoint='admin_story_generation'))
        admin.add_view(CharacterEvolutionView(CharacterEvolution, name='Characters', endpoint='admin_character_evolution'))
        admin.add_view(UserProgressView(UserProgress, name='Users', endpoint='admin_user_progress'))
        admin.add_view(TransactionView(Transaction, name='Transactions', endpoint='admin_transactions'))
        
        logger.info("Flask-Admin initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Flask-Admin: {str(e)}")
        raise
