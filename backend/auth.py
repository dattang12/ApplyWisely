from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from database import get_db, User


def get_current_user(db: Session = Depends(get_db)) -> User:
    """No-auth mode: always return the single default user, creating it if needed."""
    DEFAULT_EMAIL = "default@applywise.local"
    user = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
    if user is None:
        try:
            user = User(
                email=DEFAULT_EMAIL,
                hashed_password="no-auth",
                full_name="Default User",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        except IntegrityError:
            db.rollback()
            user = db.query(User).filter(User.email == DEFAULT_EMAIL).first()
    return user
