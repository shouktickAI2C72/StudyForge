"""
YouTube Lecture Finder Service.

Calls YouTube Data API v3 search.list and videos.list endpoints to find
educational lecture videos for topics.

Features:
- Structured queries: {topic} {course} lecture
- In-memory fast cache + SQLite 7-day persistence
- Duration parsing and filtering (prefers 10-90 min, drops <3 min promos)
- Clean fallback search URL on quota exhaustion or network errors
"""
import os
import re
import time
import logging
import urllib.request
import urllib.parse
import urllib.error
import json
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# In-memory cache for fast lookups & test compatibility
_cache: Dict[str, tuple[float, List[Dict[str, Any]]]] = {}
_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 25
_rate_limits: Dict[str, List[float]] = {}


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
    """Convert YouTube ISO 8601 duration (PT1H2M30S) to human-readable (1:02:30 or 12:05 or 0:45)."""
    if not iso:
        return "?"
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not match:
        return "?"
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def parse_iso8601_duration_seconds(iso: str) -> int:
    """Convert YouTube ISO 8601 duration to seconds."""
    if not iso:
        return 0
    match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso)
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def is_rate_limited(client_key: str) -> bool:
    """True if client exceeded request quota in the rolling window."""
    now = time.time()
    history = _rate_limits.setdefault(client_key, [])
    _rate_limits[client_key] = [t for t in history if now - t < RATE_LIMIT_WINDOW_SECONDS]
    if len(_rate_limits[client_key]) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    _rate_limits[client_key].append(now)
    return False


def _fetch_from_youtube(topic: str, course_name: str = "", max_results: int = 5) -> List[Dict[str, Any]]:
    """
    Search YouTube Data API v3 and fetch durations.
    Phase 3 spec: videoEmbeddable=true, relevanceLanguage=en, safeSearch=strict,
    Education category first with fallback, duration filtering (drop <3min, prefer 10-90min).
    Raises RuntimeError on API failure / missing key / quota exhaustion.
    """
    api_key = _get_api_key()
    if not api_key:
        raise RuntimeError("YOUTUBE_API_KEY is not configured.")

    # Build query from topic + course + "lecture"
    search_query = f"{topic} {course_name} lecture".strip() if course_name else f"{topic} lecture"

    def _search(params_extra: Dict[str, str]) -> List[Dict[str, Any]]:
        base_params = {
            "part": "snippet",
            "q": search_query,
            "type": "video",
            "videoEmbeddable": "true",
            "relevanceLanguage": "en",
            "safeSearch": "strict",
            "maxResults": max_results + 3,  # fetch extra for duration filtering
            "order": "relevance",
            "key": api_key,
        }
        base_params.update(params_extra)
        url = f"https://www.googleapis.com/youtube/v3/search?{urllib.parse.urlencode(base_params)}"
        try:
            with urllib.request.urlopen(url, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8")).get("items", [])
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            logger.error("YouTube search error %s: %s", e.code, body)
            if e.code == 403:
                raise RuntimeError("YouTube API quota exceeded or key invalid. Try again later.")
            raise RuntimeError(f"YouTube API error ({e.code}).")
        except RuntimeError:
            raise
        except Exception as e:
            raise RuntimeError(f"Could not reach YouTube API: {e}")

    # First try with Education category (videoCategoryId=27)
    items = _search({"videoCategoryId": "27"})

    # If fewer than 3 results, retry without category filter
    if len(items) < 3:
        items = _search({})

    if not items:
        return []

    video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]
    if not video_ids:
        return []

    # Fetch durations via videos.list (batched IDs)
    duration_map: Dict[str, str] = {}
    duration_sec_map: Dict[str, int] = {}
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
            raw = v.get("contentDetails", {}).get("duration", "")
            duration_map[v["id"]] = _parse_iso8601_duration(raw)
            duration_sec_map[v["id"]] = parse_iso8601_duration_seconds(raw)
    except Exception as e:
        logger.warning("Could not fetch video durations: %s", e)

    # Build results, filtering by duration
    results: List[Dict[str, Any]] = []
    for item in items:
        vid = item.get("id", {}).get("videoId")
        if not vid:
            continue
        sec = duration_sec_map.get(vid, 0)
        # Drop videos under 3 minutes (usually promos/intros)
        if sec > 0 and sec < 180:
            continue
        snippet = item.get("snippet", {})
        thumb = (
            snippet.get("thumbnails", {}).get("high", {}).get("url")
            or snippet.get("thumbnails", {}).get("medium", {}).get("url")
            or snippet.get("thumbnails", {}).get("default", {}).get("url", "")
        )
        formatted = duration_map.get(vid, "?")

        results.append({
            "video_id": vid,
            "title": snippet.get("title", ""),
            "channel": snippet.get("channelTitle", ""),
            "channel_name": snippet.get("channelTitle", ""),
            "thumbnail": thumb,
            "thumbnail_url": thumb,
            "duration": formatted,
            "duration_seconds": sec,
            "url": f"https://www.youtube.com/watch?v={vid}",
            "watch_url": f"https://www.youtube.com/watch?v={vid}",
            "embed_url": f"https://www.youtube.com/embed/{vid}",
        })

    # Prefer 10–90 minute lectures when there's a choice
    if len(results) > max_results:
        preferred = [r for r in results if 600 <= r["duration_seconds"] <= 5400]
        others = [r for r in results if r not in preferred]
        results = (preferred + others)[:max_results]
    else:
        results = results[:max_results]

    return results


def get_topic_videos(topic: str, course_name: str = "", max_results: int = 5) -> Dict[str, Any]:
    """
    Returns videos for a topic using in-memory cache if available.
    Preserves exact behavior expected by older tests.
    """
    cache_key = f"{topic.strip().lower()}|{course_name.strip().lower()}|{max_results}"

    if cache_key in _cache:
        cached_at, cached_results = _cache[cache_key]
        if time.time() - cached_at < _CACHE_TTL_SECONDS:
            return {"topic": topic, "videos": cached_results, "cached": True}
        else:
            del _cache[cache_key]

    results = _fetch_from_youtube(topic, course_name=course_name, max_results=max_results)
    _cache[cache_key] = (time.time(), results)
    return {"topic": topic, "videos": results, "cached": False}


def find_youtube_lectures(
    topic_name: str,
    course_name: str = "",
    db: Optional[Session] = None,
    max_results: int = 5,
    client_ip: str = "default"
) -> Dict[str, Any]:
    """
    Phase 3: Database-backed YouTube lookup with 7-day persistence and honest degradation.
    """
    clean_topic = topic_name.strip()
    clean_course = course_name.strip()
    query = f"{clean_topic} {clean_course} lecture".strip()
    fallback_url = f"https://www.youtube.com/results?search_query={urllib.parse.quote_plus(query)}"

    # Check SQLite cache (serves both "ok" and "unavailable" results)
    if db is not None:
        try:
            from ..models.video_cache import VideoCache
            cache_key = f"{clean_topic.lower()}|{clean_course.lower()}"
            record = db.query(VideoCache).filter(VideoCache.query_key == cache_key).first()
            if record:
                cached_at = record.cached_at
                if cached_at.tzinfo is None:
                    cached_at = cached_at.replace(tzinfo=timezone.utc)
                age_delta = datetime.now(timezone.utc) - cached_at
                if age_delta < timedelta(days=7):
                    age_days = int(age_delta.total_seconds() // 86400)
                    return {
                        "topic": clean_topic,
                        "course": clean_course,
                        "videos": record.videos,
                        "status": record.status,
                        "cached": True,
                        "cache_age_days": age_days,
                        "cache_label": "Updated today" if age_days == 0 else f"Updated {age_days} days ago",
                        "fallback_search_url": record.fallback_url or fallback_url,
                        "message": "" if record.status == "ok" else "YouTube lectures are temporarily unavailable. Use the search link below.",
                    }
        except Exception as e:
            logger.warning("[find_youtube_lectures] DB cache lookup error: %s", e)

    # Use get_topic_videos for fetch (with course context)
    try:
        res = get_topic_videos(clean_topic, course_name=clean_course, max_results=max_results)
        videos = res.get("videos", [])
        status_str = "ok"
        error_msg = ""
    except RuntimeError as e:
        videos = []
        status_str = "unavailable"
        error_msg = str(e)
    except Exception as e:
        videos = []
        status_str = "unavailable"
        error_msg = str(e)

    # Save to SQLite if db available (cache both successes and failures)
    if db is not None:
        try:
            from ..models.video_cache import VideoCache
            cache_key = f"{clean_topic.lower()}|{clean_course.lower()}"
            record = db.query(VideoCache).filter(VideoCache.query_key == cache_key).first()
            if not record:
                record = VideoCache(
                    query_key=cache_key,
                    topic_name=clean_topic,
                    course_name=clean_course,
                )
                db.add(record)
            record.videos = videos
            record.status = status_str
            record.fallback_url = fallback_url
            record.cached_at = datetime.now(timezone.utc)
            db.commit()
        except Exception:
            db.rollback()

    return {
        "topic": clean_topic,
        "course": clean_course,
        "videos": videos,
        "status": status_str,
        "cached": False,
        "cache_age_days": 0,
        "cache_label": "Updated today",
        "fallback_search_url": fallback_url,
        "message": error_msg,
    }
