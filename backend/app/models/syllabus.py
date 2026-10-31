from datetime import datetime, timezone
import json
from typing import List
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class Syllabus(Base):
    __tablename__ = "syllabi"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    filename = Column(String(255), nullable=False, default="syllabus")
    course_name = Column(String(255), nullable=False, default="Course Syllabus")
    raw_text = Column(Text, nullable=True)
    is_sample = Column(Boolean, default=False)
    warning = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    topics = relationship("Topic", back_populates="syllabus", cascade="all, delete-orphan", order_by="Topic.order_index")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    syllabus_id = Column(Integer, ForeignKey("syllabi.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    subtopics_json = Column(Text, default="[]")
    subtopic_count = Column(Integer, default=4)
    word_count = Column(Integer, default=50)
    kind = Column(String(50), default="theory")  # 'theory' | 'numerical' | 'lab-heavy'
    estimated_minutes = Column(Integer, default=60)
    difficulty = Column(String(50), default="medium")  # 'easy' | 'medium' | 'hard'
    reason = Column(String(255), default="")
    order_index = Column(Integer, default=0)
    done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    syllabus = relationship("Syllabus", back_populates="topics")

    @property
    def subtopics(self) -> List[str]:
        try:
            return json.loads(self.subtopics_json or "[]")
        except Exception:
            return []

    @subtopics.setter
    def subtopics(self, val: List[str]):
        self.subtopics_json = json.dumps(val or [])
