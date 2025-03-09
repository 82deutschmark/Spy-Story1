
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
import os

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# For use with connection pooling if needed
def get_pooled_database_url():
    database_url = os.environ.get("DATABASE_URL")
    if database_url and '.us-east-2' in database_url:
        return database_url.replace('.us-east-2', '-pooler.us-east-2')
    return database_url
