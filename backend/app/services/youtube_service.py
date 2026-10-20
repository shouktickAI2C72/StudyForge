"""
YouTube Lecture Finder Service.

Calls the YouTube Data API v3 search.list endpoint to find educational
lecture-style videos for a given topic. Caches results per topic for 24 hours
to conserve API quota.
"""
import os
import re
import time
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

# In-memory cache: topic -> (timestamp, results)
_cache: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
_CACHE_TTL_SECONDS = 24 * 60 * 60  # 24 hours


def _get_api_key() -> Optional[str]:
    """Read YOUTUBE_API_KEY from config/environment."""
    try:
        from ..config import YOUTUBE_API_KEY
        if YOUTUBE_API_KEY:
            return YOUTUBE_API_KEY
    except Exception:
        pass
    return os.environ.get("YOUTUBE_API_KEY", "").strip() or None


def _parse_iso8601_duration(iso: str) -> str:
    """Convert YouTube ISO 8601 duration (PT1H2M30S) to human-readable (1:02:30)."""
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not match:
        return "?"
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def _fetch_from_youtube(topic: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Call YouTube Data API v3 search.list + videos.list (for duration).
    Uses urllib so we don't need extra dependencies.
    """
    import urllib.request
    import urllib.parse
    import json

    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("YOUTUBE_API_KEY is not configured.")

    # Step 1: Search for educational videos
    search_query = f"{topic} lecture explained"
    search_params = urllib.parse.urlencode({
        "part": "snippet",
        "q": search_query,
        "type": "video",
        "videoCategoryId": "27",  # Education category
        "maxResults": max_results,
        "order": "relevance",
        "safeSearch": "strict",
        "key": api_key,
    })
    search_url = f"https://www.googleapis.com/youtube/v3/search?{search_params}"

    try:
        with urllib.request.urlopen(search_url, timeout=10) as resp:
            search_data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        logger.error("YouTube search API error %s: %s", e.code, body)
        if e.code == 403:
            raise RuntimeError("YouTube API quota exceeded or key invalid. Try again later.")
        raise RuntimeError(f"YouTube API error ({e.code}).")
    except Exception as e:
        logger.error("YouTube search request failed: %s", e)
        raise RuntimeError("Could not reach the YouTube API right now.")

    items = search_data.get("items", [])
    if not items:
        return []

    video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]
    if not video_ids:
        return []

    # Step 2: Get video durations via videos.list
    duration_map: Dict[str, str] = {}
    videos_params = urllib.parse.urlencode({
        "part": "contentDetails",
        "id": ",".join(video_ids),
        "key": api_key,
    })
    videos_url = f"https://www.googleapis.com/youtube/v3/videos?{videos_params}"

    try:
        with urllib.request.urlopen(videos_url, timeout=10) as resp:
            videos_data = json.loads(resp.read().decode("utf-8"))
        for v in videos_data.get("items", []):
            raw_duration = v.get("contentDetails", {}).get("duration", "")
            duration_map[v["id"]] = _parse_iso8601_duration(raw_duration)
    except Exception as e:
        logger.warning("Could not fetch video durations: %s", e)
        # Non-fatal — we'll just show "?" for duration

    # Step 3: Build result list
    results: List[Dict[str, Any]] = []
    for item in items:
        vid = item.get("id", {}).get("videoId")
        if not vid:
            continue
        snippet = item.get("snippet", {})
        results.append({
            "video_id": vid,
            "title": snippet.get("title", ""),
            "channel_name": snippet.get("channelTitle", ""),
            "thumbnail_url": (
                snippet.get("thumbnails", {}).get("high", {}).get("url")
                or snippet.get("thumbnails", {}).get("medium", {}).get("url")
                or snippet.get("thumbnails", {}).get("default", {}).get("url", "")
            ),
            "duration": duration_map.get(vid, "?"),
        })

    return results


def get_topic_videos(topic: str, max_results: int = 5) -> Dict[str, Any]:
    """
    Public API: returns videos for a topic, using cache if available.
    Returns { topic, videos, cached }.
    """
    cache_key = topic.strip().lower()

    # Check cache
    if cache_key in _cache:
        cached_at, cached_results = _cache[cache_key]
        if time.time() - cached_at < _CACHE_TTL_SECONDS:
            return {"topic": topic, "videos": cached_results, "cached": True}
        else:
            del _cache[cache_key]  # expired

    # Fetch fresh
    results = _fetch_from_youtube(topic, max_results=max_results)

    # Cache even empty results to avoid hammering quota
    _cache[cache_key] = (time.time(), results)

    return {"topic": topic, "videos": results, "cached": False}
