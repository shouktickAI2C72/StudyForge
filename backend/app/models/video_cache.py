from datetime import datetime, timezone
import json
from typing import List, Dict, Any
from sqlalchemy import Column, Integer, String, DateTime, Text
from ..database import Base


class VideoCache(Base):
    __tablename__ = "video_cache"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    query_key = Column(String(255), unique=True, index=True, nullable=False)
    topic_name = Column(String(255), nullable=False)
    course_name = Column(String(255), default="")
    videos_json = Column(Text, default="[]")
    status = Column(String(50), default="ok")  # 'ok' | 'unavailable'
    fallback_url = Column(String(512), default="")
    cached_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    @property
    def videos(self) -> List[Dict[str, Any]]:
        try:
            return json.loads(self.videos_json or "[]")
        except Exception:
            return []

    @videos.setter
    def videos(self, val: List[Dict[str, Any]]):
        self.videos_json = json.dumps(val or [])
