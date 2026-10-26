import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.services import youtube_service

client = TestClient(app)


class FakeResponse:
    """urlopen() stand-in returning a canned JSON payload."""

    def __init__(self, payload: dict):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return json.dumps(self._payload).encode("utf-8")


SEARCH_PAYLOAD = {
    "items": [
        {
            "id": {"videoId": "vid001"},
            "snippet": {
                "title": "Sorting Explained",
                "channelTitle": "CS Academy",
                "thumbnails": {"high": {"url": "https://i.ytimg.com/vi/vid001/hqdefault.jpg"}},
            },
        },
        {
            "id": {"videoId": "vid002"},
            "snippet": {
                "title": "Sorting Deep Dive",
                "channelTitle": "Lecture Hub",
                "thumbnails": {"medium": {"url": "https://i.ytimg.com/vi/vid002/mqdefault.jpg"}},
            },
        },
    ]
}
VIDEOS_PAYLOAD = {
    "items": [
        {"id": "vid001", "contentDetails": {"duration": "PT1H2M30S"}},
        {"id": "vid002", "contentDetails": {"duration": "PT12M5S"}},
    ]
}


@pytest.fixture
def fake_api(monkeypatch):
    """Patch the HTTP layer + API key so tests never touch the real YouTube API."""
    import urllib.request

    def fake_urlopen(url, timeout=None):
        return FakeResponse(SEARCH_PAYLOAD if "/search?" in url else VIDEOS_PAYLOAD)

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    monkeypatch.setattr(youtube_service, "_get_api_key", lambda: "test-key")
    youtube_service._cache.clear()
    yield
    youtube_service._cache.clear()


def test_topic_videos_endpoint(fake_api):
    """The endpoint returns full video details including a watch link."""
    response = client.get("/topic-videos?topic=Sorting+Algorithms")
    assert response.status_code == 200
    data = response.json()

    assert data["topic"] == "Sorting Algorithms"
    assert data["cached"] is False
    assert len(data["videos"]) == 2

    video = data["videos"][0]
    assert video["video_id"] == "vid001"
    assert video["title"] == "Sorting Explained"
    assert video["channel_name"] == "CS Academy"
    assert video["thumbnail_url"].startswith("http")
    assert video["duration"] == "1:02:30"
    assert video["watch_url"] == "https://www.youtube.com/watch?v=vid001"
    assert data["videos"][1]["duration"] == "12:05"


def test_topic_videos_cache(fake_api):
    """Second request for the same topic + count is served from cache."""
    resp1 = client.get("/topic-videos?topic=Binary+Trees")
    assert resp1.status_code == 200
    assert resp1.json()["cached"] is False

    resp2 = client.get("/topic-videos?topic=Binary+Trees")
    assert resp2.status_code == 200
    assert resp2.json()["cached"] is True


def test_cache_key_includes_result_count(monkeypatch):
    """A different max_results must not be served a stale cached list."""
    fetches = []

    def fake_fetch(topic, max_results=5):
        fetches.append((topic, max_results))
        return [{
            "video_id": f"v{max_results}",
            "title": "t",
            "channel_name": "c",
            "thumbnail_url": "https://x/y.jpg",
            "duration": "1:00",
            "watch_url": f"https://www.youtube.com/watch?v=v{max_results}",
        }]

    monkeypatch.setattr(youtube_service, "_fetch_from_youtube", fake_fetch)
    youtube_service._cache.clear()
    try:
        r1 = youtube_service.get_topic_videos("Graphs", max_results=3)
        r2 = youtube_service.get_topic_videos("Graphs", max_results=3)  # cached
        r3 = youtube_service.get_topic_videos("Graphs", max_results=5)  # fresh fetch
        assert r1["cached"] is False
        assert r2["cached"] is True
        assert r3["cached"] is False
        assert fetches == [("Graphs", 3), ("Graphs", 5)]
    finally:
        youtube_service._cache.clear()


def test_topic_videos_api_failure(monkeypatch):
    """RuntimeError from the YouTube layer surfaces as a clear 502."""
    def boom(topic, max_results=5):
        raise RuntimeError("YouTube API quota exceeded or key invalid. Try again later.")

    monkeypatch.setattr(youtube_service, "_fetch_from_youtube", boom)
    youtube_service._cache.clear()
    try:
        response = client.get("/topic-videos?topic=Sorting")
        assert response.status_code == 502
        assert "youtube" in response.json()["detail"].lower()
    finally:
        youtube_service._cache.clear()


def test_topic_videos_empty_topic():
    """Validation on missing/empty topic parameter."""
    response = client.get("/topic-videos?topic=")
    assert response.status_code == 422


def test_parse_iso8601_duration():
    assert youtube_service._parse_iso8601_duration("PT1H2M30S") == "1:02:30"
    assert youtube_service._parse_iso8601_duration("PT12M5S") == "12:05"
    assert youtube_service._parse_iso8601_duration("PT45S") == "0:45"
    assert youtube_service._parse_iso8601_duration("") == "?"
