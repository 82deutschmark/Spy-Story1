
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
            
            # Alert on high memory usage and force garbage collection more aggressively
            if current_memory > 400:  # Lower threshold to 400MB
                logger.warning(f"High memory usage: {current_memory:.2f}MB | Memory management activated")
                # Force garbage collection at lower thresholds
                gc.collect()
                logger.info(f"Manual garbage collection triggered at {current_memory:.2f}MB")
                
                # More aggressive memory cleanup for higher thresholds
                if current_memory > 500:  # If memory is critically high
                    # Clear any caches or temporary data that might be stored in the application
                    if hasattr(g, '_cached_data'):
                        g._cached_data = {}
                    
                    # Get detailed diagnostics only in critical situations
                    try:
                        memory_info = self.process.memory_info()
                        logger.warning(f"Critical memory situation: {current_memory:.2f}MB - RSS={memory_info.rss/1024/1024:.2f}MB")
                        
                        # Only collect detailed memory maps when absolutely necessary (>550MB)
                        if current_memory > 550:
                            memory_maps = self.process.memory_maps()
                            if memory_maps:
                                top_maps = sorted(memory_maps, key=lambda x: getattr(x, 'private', 0), reverse=True)[:3]
                                for i, m in enumerate(top_maps):
                                    logger.critical(f"Top memory consumer #{i+1}: {getattr(m, 'path', 'unknown')} - {getattr(m, 'private', 0)/1024/1024:.2f}MB")
                    except Exception as e:
                        logger.error(f"Failed to collect memory diagnostics: {str(e)}")
                    
                    # Second pass of garbage collection with different generation
                    gc.collect(2)
                    logger.warning(f"Critical memory situation: {current_memory:.2f}MB - Running aggressive cleanup")
                    
                    # Get memory usage after collection
                    post_gc_memory = self.process.memory_info().rss / 1024 / 1024
                    logger.info(f"Memory after cleanup: {post_gc_memory:.2f}MB (Δ{post_gc_memory-current_memory:+.2f}MB)")
        except Exception as e:
            logger.error(f"Error in after_request: {str(e)}")
        
        return response
    
    def teardown_request(self, exception):
        """Handle memory cleanup after request, regardless of errors"""
        if exception:
            logger.error(f"Request error: {str(exception)}")
            # Force garbage collection on error
            gc.collect()
            
            # Check if this is a memory-related error
            error_str = str(exception).lower()
            if any(term in error_str for term in ['memory', 'allocation', 'out of memory', 'killed']):
                logger.critical(f"MEMORY-RELATED ERROR DETECTED: {str(exception)}")
                # Log process details for diagnosis
                try:
                    memory_info = self.process.memory_info()
                    logger.critical(f"Process memory details: RSS={memory_info.rss/1024/1024:.2f}MB, VMS={memory_info.vms/1024/1024:.2f}MB")
                    
                    # Get top memory consumers in the process
                    memory_maps = self.process.memory_maps()
                    if memory_maps:
                        top_maps = sorted(memory_maps, key=lambda x: x.private, reverse=True)[:5]
                        for i, m in enumerate(top_maps):
                            logger.critical(f"Top memory consumer #{i+1}: {m.path} - Private: {m.private/1024/1024:.2f}MB")
                except Exception as e:
                    logger.error(f"Failed to collect memory diagnostics: {str(e)}")
