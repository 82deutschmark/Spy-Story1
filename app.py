import os
import logging
from flask import Flask, render_template, request, flash, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")

# Configure SQLAlchemy
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///yorkie.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

db.init_app(app)

from models import Hashtag
from services.openai_service import analyze_artwork
from services.instagram_service import post_to_instagram

@app.route('/')
def index():
    hashtags = Hashtag.query.all()
    return render_template('index.html', hashtags=hashtags)

@app.route('/analyze', methods=['POST'])
def analyze():
    image_url = request.form.get('image_url')
    if not image_url:
        flash('Please provide an image URL', 'error')
        return redirect(url_for('index'))
    
    try:
        analysis = analyze_artwork(image_url)
        selected_hashtags = request.form.getlist('hashtags')
        
        if request.form.get('post_to_instagram'):
            post_to_instagram(analysis['description'], image_url, selected_hashtags)
            flash('Successfully posted to Instagram!', 'success')
        
        return render_template('index.html', 
                             analysis=analysis,
                             image_url=image_url,
                             hashtags=Hashtag.query.all())
    except Exception as e:
        flash(f'Error: {str(e)}', 'error')
        return redirect(url_for('index'))

@app.route('/hashtags', methods=['GET', 'POST'])
def manage_hashtags():
    if request.method == 'POST':
        tag = request.form.get('hashtag')
        if tag:
            if not tag.startswith('#'):
                tag = f'#{tag}'
            hashtag = Hashtag(text=tag)
            db.session.add(hashtag)
            db.session.commit()
            flash('Hashtag added successfully!', 'success')
    
    hashtags = Hashtag.query.all()
    return render_template('hashtags.html', hashtags=hashtags)

@app.route('/hashtags/delete/<int:id>', methods=['POST'])
def delete_hashtag(id):
    hashtag = Hashtag.query.get_or_404(id)
    db.session.delete(hashtag)
    db.session.commit()
    flash('Hashtag deleted successfully!', 'success')
    return redirect(url_for('manage_hashtags'))

with app.app_context():
    db.create_all()
