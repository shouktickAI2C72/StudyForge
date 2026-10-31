from typing import List, Optional
from pydantic import BaseModel, Field


class TopicVideo(BaseModel):
    video_id: str = Field(..., description="YouTube video ID")
    title: str = Field(..., description="Video title")
    channel: str = Field("", description="Channel title")
    channel_name: str = Field("", description="Channel title (alias for compatibility)")
    thumbnail: str = Field("", description="Thumbnail image URL")
    thumbnail_url: str = Field("", description="Thumbnail image URL (alias for compatibility)")
    duration_seconds: int = Field(0, description="Duration in seconds")
    duration: str = Field("?", description="Formatted duration e.g. 14:20")
    url: str = Field("", description="YouTube watch URL")
    watch_url: str = Field("", description="YouTube watch URL (alias for compatibility)")
    embed_url: str = Field("", description="Embeddable iframe URL")


class TopicVideosResponse(BaseModel):
    topic: str = Field(..., description="Topic queried")
    course: str = Field("", description="Course / subject queried")
    videos: List[TopicVideo] = Field(default_factory=list, description="List of matched educational video lectures")
    status: str = Field("ok", description="'ok' or 'unavailable'")
    cached: bool = Field(False, description="Whether this response was served from cache")
    cache_age_days: int = Field(0, description="Age of cache in days")
    cache_label: str = Field("Updated today", description="Human-readable cache age label")
    fallback_search_url: str = Field("", description="Direct YouTube search link when quota is exhausted or videos unavailable")
    message: str = Field("", description="Plain explanation if unavailable")
