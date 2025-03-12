
import logging
from flask import Blueprint, request, jsonify

# Configure logging
logger = logging.getLogger(__name__)

# Create Blueprint
api_bp = Blueprint('api', __name__)

@api_bp.route('/status', methods=['GET'])
def status():
    """Basic API endpoint to check if the API is working"""
    return jsonify({
        'status': 'success',
        'message': 'API is operational'
    })
