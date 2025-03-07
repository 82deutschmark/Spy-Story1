from app import app
from api.image_routes import image_api

# Register API blueprints
app.register_blueprint(image_api)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)