from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from ..database import Base

class ScheduleReoptimization(Base):
    """
    Module 2 SQLite table: Stores study plan re-optimization runs,
    benchmarks (Adam vs RMSprop, Xavier vs He), and redistribution metadata.
    """
    __tablename__ = "schedule_reoptimizations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trigger_reason = Column(String(100), nullable=False, default="monday_skipped")
    optimizer_winner = Column(String(50), nullable=False)
    adam_loss = Column(Float, nullable=False)
    rmsprop_loss = Column(Float, nullable=False)
    init_winner = Column(String(50), nullable=False)
    xavier_variance = Column(Float, nullable=False)
    he_variance = Column(Float, nullable=False)
    total_original_hours = Column(Float, nullable=False)
    total_optimized_hours = Column(Float, nullable=False)
    banner_text = Column(String(255), nullable=False)
    details_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
