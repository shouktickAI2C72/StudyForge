from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from .youtube import TopicVideo


class PlanCreateRequest(BaseModel):
    start_date: Optional[str] = Field(None, description="Plan start date in YYYY-MM-DD format (defaults to today)")
    hours_per_day: float = Field(2.0, ge=0.5, le=12.0, description="Daily study hours budget")
    study_days: List[str] = Field(
        default_factory=lambda: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        description="Active study days of the week"
    )
    exam_date: Optional[str] = Field(None, description="Optional target exam / deadline date in YYYY-MM-DD format")


class MissedDayRequest(BaseModel):
    date: str = Field(..., description="The date missed in YYYY-MM-DD format")


class PlanItemResponse(BaseModel):
    id: int
    plan_id: int
    topic_id: Optional[int] = None
    topic_title: Optional[str] = None
    date: str
    day_of_week: str = ""
    minutes: int
    done: bool = False
    is_review: bool = False
    notes: str = ""
    top_video: Optional[TopicVideo] = None

    class Config:
        from_attributes = True


class PlanResponse(BaseModel):
    id: int
    syllabus_id: Optional[int] = None
    course_name: Optional[str] = None
    start_date: str
    hours_per_day: float
    study_days: List[str]
    exam_date: Optional[str] = None
    total_minutes: int = 0
    completed_minutes: int = 0
    progress_percent: float = 0.0
    items: List[PlanItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class MissedDayResponse(BaseModel):
    plan_id: int
    missed_date: str
    missed_minutes: int
    explanation: str
    before_daily_minutes: Dict[str, int]
    after_daily_minutes: Dict[str, int]
    items: List[PlanItemResponse] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    has_plan: bool = False
    course_name: Optional[str] = None
    next_topic: Optional[Dict[str, Any]] = None
    today_tasks: List[PlanItemResponse] = Field(default_factory=list)
    progress_percent: float = 0.0
    total_topics: int = 0
    completed_topics: int = 0
    total_minutes: int = 0
    completed_minutes: int = 0
