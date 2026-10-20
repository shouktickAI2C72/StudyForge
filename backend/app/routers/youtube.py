from fastapi import APIRouter, Query, HTTPException, status
from ..schemas.youtube import TopicVideosResponse
from ..services.youtube_service import get_topic_videos

router = APIRouter(tags=["YouTube Lecture Finder"])

@router.get("/topic-videos", response_model=TopicVideosResponse, status_code=status.HTTP_200_OK)
def get_lectures_for_topic(
    topic: str = Query(..., min_length=1, description="Topic name to search educational lectures for"),
    max_results: int = Query(5, ge=1, le=10, description="Max videos to return (default 5)")
):
    """
    Search YouTube Data API v3 for high-quality educational lecture videos for a given topic.
    Results are cached in-memory for 24 hours to conserve quota.
    """
    try:
        data = get_topic_videos(topic, max_results=max_results)
        return data
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
