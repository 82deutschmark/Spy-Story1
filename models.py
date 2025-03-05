from app import db

class Hashtag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(50), unique=True, nullable=False)

    def __repr__(self):
        return f'<Hashtag {self.text}>'
