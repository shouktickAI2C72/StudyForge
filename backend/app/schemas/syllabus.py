from typing import List, Optional
from pydantic import BaseModel, Field
from .youtube import TopicVideo


class TopicResponse(BaseModel):
    id: int
    title: str
    subtopics: List[str] = Field(default_factory=list)
    subtopic_count: int = 4
    word_count: int = 40
    kind: str = "theory"
    estimated_minutes: int = 60
    difficulty: str = "medium"
    reason: str = ""
    videos_status: str = "ok"
    top_video: Optional[TopicVideo] = None
    order_index: int = 0
    done: bool = False

    class Config:
        from_attributes = True


class SyllabusResponse(BaseModel):
    syllabus_id: int
    course_name: str
    filename: str
    is_sample: bool = False
    warning: Optional[str] = None
    total_topics: int = 0
    total_estimated_minutes: int = 0
    topics: List[TopicResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class TopicProgressUpdate(BaseModel):
    done: bool
