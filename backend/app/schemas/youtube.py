from typing import List
from pydantic import BaseModel, Field

class TopicVideo(BaseModel):
    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    channel_name: str = Field(..., description="YouTube channel name")
    thumbnail_url: str = Field(..., description="High/Medium resolution thumbnail URL")
    duration: str = Field(..., description="Human-readable duration (e.g. 14:52)")

class TopicVideosResponse(BaseModel):
    topic: str = Field(..., description="Topic queried")
    videos: List[TopicVideo] = Field(..., description="List of educational video recommendations")
    cached: bool = Field(..., description="Whether this response was served from the in-memory cache")
