
import os
from pbadmin4 import Admin
from database import db
from models import ImageAnalysis, StoryGeneration, CharacterEvolution, UserProgress, Transaction

def init_admin(app):
    # Initialize Admin
    admin = Admin(app, name='StoryCreator Admin', template_mode='bootstrap4')
    
    # Add database connection
    admin.add_view(ModelView(ImageAnalysis, db.session, name='Characters & Scenes'))
    admin.add_view(ModelView(StoryGeneration, db.session, name='Stories'))
    admin.add_view(ModelView(CharacterEvolution, db.session, name='Character Evolution'))
    admin.add_view(ModelView(UserProgress, db.session, name='User Progress'))
    admin.add_view(ModelView(Transaction, db.session, name='Transactions'))
    
    # Add custom model views with advanced features
    class ImageAnalysisView(ModelView):
        column_searchable_list = ['character_name', 'image_type']
        column_filters = ['image_type', 'character_role']
        column_default_sort = ('created_at', True)
        
    class StoryGenerationView(ModelView):
        column_searchable_list = ['primary_conflict', 'setting']
        column_filters = ['created_at']
        column_default_sort = ('created_at', True)
        
    # Replace basic views with advanced ones
    admin.replace_view(ImageAnalysisView(ImageAnalysis, db.session, name='Characters & Scenes'))
    admin.replace_view(StoryGenerationView(StoryGeneration, db.session, name='Stories'))
    
    return admin
