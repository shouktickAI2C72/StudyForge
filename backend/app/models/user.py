from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime
from ..database import Base


class User(Base):
    """Registered user account for StudyForge authentication."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    # Stored as "pbkdf2_sha256$<iterations>$<salt_hex>$<hash_hex>" — see auth_service
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
