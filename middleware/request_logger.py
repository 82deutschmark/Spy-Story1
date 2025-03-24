
import time
import logging
import os
import gc
import psutil
from flask import request, g

logger = logging.getLogger(__name__)

class RequestLoggerMiddleware:
    """Middleware for logging requests and their processing time with memory tracking"""
    
    def __init__(self, app):
        """Initialize the middleware by registering Flask hooks"""
        self.app = app
        self.process = psutil.Process(os.getpid())
        # Register the before_request and after_request functions with Flask
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        app.teardown_request(self.teardown_request)
    
    def before_request(self):
        """Log the request, set the start time, and track memory usage"""
        g.start_time = time.time()
        g.start_memory = self.process.memory_info().rss / 1024 / 1024  # MB
        
        path = request.path
        method = request.method
        content_length = request.content_length or 0
        content_type = request.content_type or 'unknown'
        
        logger.info(f"Request started: {method} {path} | Size: {content_length/1024:.2f}KB | Type: {content_type}")
        
        # Log large requests that might cause memory issues
        if content_length > 1024 * 1024:  # If request is larger than 1MB
            logger.warning(f"Large request detected: {method} {path} | Size: {content_length/1024/1024:.2f}MB")
    
    def after_request(self, response):
        """Log the response time and memory usage"""
        try:
            path = request.path
            method = request.method
            duration = time.time() - g.start_time
            status_code = response.status_code
            
            # Get current memory usage
            current_memory = self.process.memory_info().rss / 1024 / 1024  # MB
            memory_diff = current_memory - g.start_memory
            
            logger.info(f"Request completed: {method} {path} {status_code} in {duration:.2f}s | Memory: {current_memory:.2f}MB (Δ{memory_diff:+.2f}MB)")
            
            # Alert on high memory usage
            if current_memory > 500:  # If using more than 500MB
                logger.warning(f"High memory usage: {current_memory:.2f}MB | Consider manual garbage collection")
                # Suggest manual garbage collection if memory usage is too high
                if current_memory > 700:  # If using more than 700MB
                    gc.collect()
                    logger.info("Manual garbage collection triggered")
        except Exception as e:
            logger.error(f"Error in after_request: {str(e)}")
        
        return response
    
    def teardown_request(self, exception):
        """Handle memory cleanup after request, regardless of errors"""
        if exception:
            logger.error(f"Request error: {str(exception)}")
            # Force garbage collection on error
            gc.collect()
