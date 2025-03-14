
import os
import logging
import json
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_admin.contrib.sqla.filters import FilterEqual, FilterLike
from flask_admin.form import JSONField
from database import db
from models import Character, StoryGeneration, CharacterEvolution, UserProgress, Transaction

# Configure logging
logger = logging.getLogger(__name__)

admin = Admin(name='Story Creator Admin', template_mode='bootstrap4')

class BaseModelView(ModelView):
    can_view_details = True
    can_export = True
    page_size = 50
    
    def __init__(self, model, **kwargs):
        super(BaseModelView, self).__init__(model, db.session, **kwargs)

class CharacterView(BaseModelView):
    column_searchable_list = ['character_name', 'character_role']
    column_filters = [
        'character_role',
        FilterEqual(Character.character_role, 'Character Role')
    ]
    column_exclude_list = ['character_traits', 'plot_lines']
    column_default_sort = ('created_at', True)
    
    # Better column labels
    column_labels = {
        'character_name': 'Name',
        'character_role': 'Role',
        'image_url': 'Image URL',
        'created_at': 'Created'
    }
    
    # Format datetime
    column_formatters = {
        'created_at': lambda v, c, m, p: m.created_at.strftime('%Y-%m-%d %H:%M')
    }
    
    # Customize the displayed columns
    column_list = ['id', 'character_name', 'character_role', 'image_url', 'created_at']
    
    # Columns to display in the edit form
    form_columns = [
        'image_url',
        'character_name', 
        'character_role',
        'character_traits', 
        'description',
        'backstory'
    ]
    
    # Create template for displaying images
    list_template = 'admin/image_analysis_list.html'
    
    # Add JSON viewer for complex fields
    form_overrides = {
        'character_traits': JSONField,
        'personality_traits': JSONField,
        'plot_lines': JSONField,
        'potential_plot_lines': JSONField,
        'story_fit': JSONField,
        'dramatic_moments': JSONField
    }
    
    # Format JSON fields for display
    form_widget_args = {
        'character_traits': {'rows': 5},
        'personality_traits': {'rows': 5},
        'plot_lines': {'rows': 5},
        'description': {'rows': 5},
        'backstory': {'rows': 5},
        'setting_description': {'rows': 5}
    }

class StoryGenerationView(BaseModelView):
    column_searchable_list = ['primary_conflict', 'setting']
    column_filters = ['setting', 'primary_conflict']
    column_exclude_list = ['generated_story', 'session_data']
    column_default_sort = ('created_at', True)
    
    # Better column labels
    column_labels = {
        'primary_conflict': 'Conflict',
        'created_at': 'Created'
    }
    
    # Format datetime
    column_formatters = {
        'created_at': lambda v, c, m, p: m.created_at.strftime('%Y-%m-%d %H:%M')
    }
    
    # Add JSON viewer for complex fields
    form_overrides = {
        'generated_story': JSONField,
        'session_data': JSONField
    }
    
    # Format JSON fields for display
    form_widget_args = {
        'generated_story': {'rows': 15},
        'session_data': {'rows': 10},
        'primary_conflict': {'rows': 3},
        'setting': {'rows': 3}
    }

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
        
        # Add model views
        admin.add_view(CharacterView(Character, name='Characters'))
        admin.add_view(StoryGenerationView(StoryGeneration, name='Stories'))
        admin.add_view(CharacterEvolutionView(CharacterEvolution, name='Characters'))
        admin.add_view(UserProgressView(UserProgress, name='Users'))
        admin.add_view(TransactionView(Transaction, name='Transactions'))
        
        logger.info("Flask-Admin initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Flask-Admin: {str(e)}")
        raise
