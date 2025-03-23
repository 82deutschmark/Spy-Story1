"""
config.py - Application Configuration Management
=============================================

This module manages the application's configuration settings through environment-based
configuration classes. It provides different configurations for development,
production, and testing environments.

Key Features:
------------
- Environment-based configuration selection
- Database connection management
- Session security settings
- SQLAlchemy configuration
- OpenAI API integration
- Logging level management
- Admin interface settings

Configuration Sources:
-------------------
1. Environment variables (.env file)
2. Default values for development
3. Environment-specific overrides

Required Environment Variables:
---------------------------
- DATABASE_URL: Database connection string
- SESSION_SECRET: Secret key for session encryption
- OPENAI_API_KEY: API key for OpenAI integration
- FLASK_ENV: Application environment (development/production/testing)
- LOG_LEVEL: Logging configuration level

Usage:
-----
To get the current configuration:
    from config import get_config
    config = get_config()

Security Notes:
------------
1. Never commit sensitive credentials to version control
2. Use strong session secrets in production
3. Protect admin interface access
4. Use appropriate database URLs per environment
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """
    Base configuration class that defines common settings across all environments.
    
    Attributes:
        DEBUG (bool): Enable/disable debug mode
        TESTING (bool): Enable/disable testing mode
        SQLALCHEMY_DATABASE_URI (str): Database connection string
        SESSION_SECRET (str): Secret key for session encryption
        SQLALCHEMY_TRACK_MODIFICATIONS (bool): SQLAlchemy event system flag
        SQLALCHEMY_ENGINE_OPTIONS (dict): Database connection pool settings
        OPENAI_API_KEY (str): OpenAI API authentication key
        LOG_LEVEL (str): Application logging level
        FLASK_ADMIN_SWATCH (str): Admin interface theme
        ADMIN_URL_PREFIX (str): Admin interface URL prefix
    """
    DEBUG = False
    TESTING = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SESSION_SECRET = os.environ.get("SESSION_SECRET", "dev-secret-key")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 300,  # Recycle connections every 5 minutes
        "pool_pre_ping": True,  # Enable connection health checks
    }
    OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    # Flask-Admin settings
    FLASK_ADMIN_SWATCH = 'cerulean'
    ADMIN_URL_PREFIX = '/admin'


class DevelopmentConfig(Config):
    """
    Development environment configuration.
    
    Enables debug mode and sets more verbose logging for development purposes.
    """
    DEBUG = True
    LOG_LEVEL = "DEBUG"


class ProductionConfig(Config):
    """
    Production environment configuration.
    
    Uses base configuration settings optimized for production deployment.
    Inherits secure defaults from base Config class.
    """
    pass


class TestingConfig(Config):
    """
    Testing environment configuration.
    
    Enables testing mode and uses an in-memory SQLite database by default.
    
    Attributes:
        TESTING (bool): Enabled for testing environment
        SQLALCHEMY_DATABASE_URI (str): Test database URL, defaults to in-memory SQLite
    """
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL", "sqlite:///:memory:")


# Configuration dictionary mapping environment names to configuration classes
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}


def get_config():
    """
    Get the current configuration based on the FLASK_ENV environment variable.
    
    Returns:
        Config: Configuration class instance for the current environment.
        Defaults to development configuration if FLASK_ENV is not set.
    """
    env = os.environ.get("FLASK_ENV", "development")
    return config.get(env, config['default'])