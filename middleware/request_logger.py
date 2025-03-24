
import time
import logging
from flask import request, g

logger = logging.getLogger(__name__)

class RequestLoggerMiddleware:
    """Middleware for logging requests and their processing time"""
    
    def __init__(self, app):
        """Initialize the middleware by registering Flask hooks"""
        self.app = app
        # Register the before_request and after_request functions with Flask
        app.before_request(self.before_request)
        app.after_request(self.after_request)
    
    def before_request(self):
        """Log the request and set the start time"""
        g.start_time = time.time()
        path = request.path
        method = request.method
        logger.info(f"Request started: {method} {path}")
    
    def after_request(self, response):
        """Log the response time"""
        try:
            path = request.path
            method = request.method
            duration = time.time() - g.start_time
            status_code = response.status_code
            
            logger.info(f"Request completed: {method} {path} {status_code} in {duration:.2f}s")
        except Exception as e:
            logger.error(f"Error in after_request: {str(e)}")
        
        return response
import time
import logging

logger = logging.getLogger(__name__)

class RequestLoggerMiddleware:
    def __init__(self, app):
        self.app = app
        logger.info("RequestLoggerMiddleware initialized")
        
        @app.before_request
        def before_request():
            request_id = time.time()
            logger.info(f"Request started: {request_id}")
            
        @app.after_request
        def after_request(response):
            logger.info(f"Request completed with status: {response.status_code}")
            return response
