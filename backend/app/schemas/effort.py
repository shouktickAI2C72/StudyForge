from pydantic import BaseModel, Field, ConfigDict
from typing import Literal, Optional
from datetime import datetime

TopicType = Literal["theory", "numerical", "lab-heavy"]

class PredictRequest(BaseModel):
    topic_name: str = Field(..., description="Topic name", json_schema_extra={"example": "Complete Binary Trees"})
    subtopic_count: int = Field(..., ge=1, le=50, description="Number of subtopics or units in this topic", json_schema_extra={"example": 4})
    topic_type: TopicType = Field(..., description="Type of learning content: theory, numerical, or lab-heavy", json_schema_extra={"example": "numerical"})
    desc_word_count: int = Field(..., ge=1, le=1000, description="Word count of syllabus description", json_schema_extra={"example": 48})

class PredictResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    topic_name: str
    subtopic_count: int
    topic_type: str
    desc_word_count: int
    predicted_hours: float
    formatted_time: str
    difficulty_tier: str
    confidence_score: float
    created_at: Optional[datetime] = None

class HistoryResponse(BaseModel):
    total: int
    predictions: list[PredictResponse]
