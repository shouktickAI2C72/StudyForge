from datetime import datetime, timezone
import json
from typing import List
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    syllabus_id = Column(Integer, ForeignKey("syllabi.id"), nullable=True, index=True)
    start_date = Column(String(50), nullable=False)
    hours_per_day = Column(Float, default=2.0)
    study_days_json = Column(Text, default='["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]')
    exam_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    items = relationship("PlanItem", back_populates="plan", cascade="all, delete-orphan", order_by="PlanItem.date, PlanItem.id")
    syllabus = relationship("Syllabus")

    @property
    def study_days(self) -> List[str]:
        try:
            return json.loads(self.study_days_json or '["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]')
        except Exception:
            return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    @study_days.setter
    def study_days(self, val: List[str]):
        self.study_days_json = json.dumps(val or ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])


class PlanItem(Base):
    __tablename__ = "plan_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False, index=True)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True, index=True)
    date = Column(String(50), nullable=False, index=True)  # YYYY-MM-DD
    minutes = Column(Integer, default=60)
    done = Column(Boolean, default=False)
    is_review = Column(Boolean, default=False)
    notes = Column(String(255), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    plan = relationship("Plan", back_populates="items")
    topic = relationship("Topic")
