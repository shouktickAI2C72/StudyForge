from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime
from ..database import Base

class EffortPrediction(Base):
    __tablename__ = "effort_predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    topic_name = Column(String(255), nullable=False, index=True)
    subtopic_count = Column(Integer, nullable=False)
    topic_type = Column(String(50), nullable=False)
    desc_word_count = Column(Integer, nullable=False)
    predicted_hours = Column(Float, nullable=False)
    difficulty_tier = Column(String(50), nullable=False, default="Medium")
    confidence_score = Column(Float, nullable=False, default=0.85)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
