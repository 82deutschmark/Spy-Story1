from app import app, db
from api.unity_routes import unity_bp
from api.story_branch_routes import story_branch_bp
from api.image_routes import image_bp

# Register blueprints
app.register_blueprint(unity_bp)
app.register_blueprint(story_branch_bp)
app.register_blueprint(image_bp)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)