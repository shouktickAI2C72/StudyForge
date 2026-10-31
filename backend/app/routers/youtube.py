from fastapi import APIRouter, Depends, Query, HTTPException, Request, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.syllabus import Topic
from ..schemas.youtube import TopicVideosResponse
from ..services.youtube_service import find_youtube_lectures, get_topic_videos, is_rate_limited

router = APIRouter(tags=["YouTube Lecture Finder"])


@router.get("/topic-videos", response_model=TopicVideosResponse, status_code=status.HTTP_200_OK)
def get_lectures_for_topic(
    request: Request,
    topic: str = Query(..., min_length=1, description="Topic name to search educational lectures for"),
    course: str = Query("", description="Optional course / subject name to improve query context"),
    max_results: int = Query(5, ge=1, le=10, description="Max videos to return (default 5)"),
    db: Session = Depends(get_db),
):
    """
    Search YouTube Data API v3 for high-quality educational lecture videos for a given topic.
    Results are cached in-memory and in SQLite to conserve quota.
    """
    try:
        data = get_topic_videos(topic, max_results=max_results)
        return TopicVideosResponse(
            topic=data["topic"],
            course=course,
            videos=data["videos"],
            status="ok",
            cached=data.get("cached", False),
            cache_age_days=0,
            cache_label="Updated today",
            fallback_search_url=f"https://www.youtube.com/results?search_query={topic}",
            message="",
        )
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error fetching YouTube lectures: {e}"
        )


@router.get("/topics/{topic_id}/videos", response_model=TopicVideosResponse, status_code=status.HTTP_200_OK)
def get_topic_videos_by_id(
    topic_id: int,
    request: Request,
    max_results: int = Query(5, ge=1, le=10, description="Max videos to return (default 5)"),
    db: Session = Depends(get_db),
):
    """
    Phase 3: Fetch educational YouTube lectures for a persisted syllabus topic.
    Extracts course name from the parent syllabus for enriched relevance.
    Rate-limited per client IP to protect YouTube quota.
    """
    client_ip = request.client.host if request.client else "default"
    if is_rate_limited(client_ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait a moment before fetching more videos."
        )

    topic = db.query(Topic).filter(Topic.id == topic_id).first()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Topic with id {topic_id} was not found."
        )

    course_name = topic.syllabus.course_name if topic.syllabus else ""

    return find_youtube_lectures(
        topic_name=str(topic.title),
        course_name=str(course_name) if course_name else "",
        db=db,
        max_results=max_results,
        client_ip=client_ip,
    )
