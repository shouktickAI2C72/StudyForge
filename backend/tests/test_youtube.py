import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_topic_videos_endpoint():
    """
    Test that /topic-videos returns real educational video recommendations.
    """
    response = client.get("/topic-videos?topic=Sorting+Algorithms")
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Sorting Algorithms"
    assert "videos" in data
    assert len(data["videos"]) > 0
    assert "cached" in data

    # Verify video properties
    video = data["videos"][0]
    assert "video_id" in video and len(video["video_id"]) > 0
    assert "title" in video and len(video["title"]) > 0
    assert "channel_name" in video and len(video["channel_name"]) > 0
    assert "thumbnail_url" in video and video["thumbnail_url"].startswith("http")
    assert "duration" in video

def test_topic_videos_cache():
    """
    Test that consecutive requests for the same topic hit the in-memory cache.
    """
    # First request
    resp1 = client.get("/topic-videos?topic=Binary+Search+Trees")
    assert resp1.status_code == 200

    # Second request should be cached
    resp2 = client.get("/topic-videos?topic=Binary+Search+Trees")
    assert resp2.status_code == 200
    assert resp2.json()["cached"] is True

def test_topic_videos_empty_topic():
    """
    Test validation on missing/empty topic parameter.
    """
    response = client.get("/topic-videos?topic=")
    assert response.status_code == 422
