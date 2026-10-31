import io
import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.services import youtube_service

client = TestClient(app)


def make_test_pdf(text: str) -> bytes:
    """Generate minimal valid PDF bytes with selectable text."""
    from pypdf import PdfWriter
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    # We can use PyMuPDF or pypdf to insert text
    import fitz
    doc = fitz.open()
    p = doc.new_page(width=612, height=792)
    p.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture
def auth_headers():
    """Create test user and return JWT bearer auth headers."""
    import secrets
    email = f"student_{secrets.token_hex(4)}@studyforge.edu"
    signup_res = client.post("/signup", json={"email": email, "password": "Password123!"})
    assert signup_res.status_code in [201, 200]
    token = signup_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def fake_youtube_env(monkeypatch):
    """Ensure YouTube calls return instant mock data in tests."""
    def fake_fetch(topic, max_results=5):
        return [{
            "video_id": "test_vid_123",
            "title": f"{topic} Lecture Video",
            "channel": "Professor Code",
            "channel_name": "Professor Code",
            "thumbnail": "https://img.youtube.com/vi/test_vid_123/hqdefault.jpg",
            "thumbnail_url": "https://img.youtube.com/vi/test_vid_123/hqdefault.jpg",
            "duration": "24:15",
            "duration_seconds": 1455,
            "url": "https://www.youtube.com/watch?v=test_vid_123",
            "watch_url": "https://www.youtube.com/watch?v=test_vid_123",
            "embed_url": "https://www.youtube.com/embed/test_vid_123",
        }]

    monkeypatch.setattr(youtube_service, "_fetch_from_youtube", fake_fetch)
    youtube_service._cache.clear()
    yield
    youtube_service._cache.clear()


# ---------------------------------------------------------------------------
# Phase 1: Syllabus Intake & Sample
# ---------------------------------------------------------------------------
def test_syllabus_sample_endpoint(fake_youtube_env):
    """POST /syllabus/sample returns demo syllabus clearly labelled sample=true."""
    res = client.post("/syllabus/sample")
    assert res.status_code == 200
    data = res.json()

    assert data["is_sample"] is True
    assert data["total_topics"] >= 3
    assert "Algorithms" in data["course_name"]

    first = data["topics"][0]
    assert first["id"] > 0
    assert first["title"] != ""
    assert first["estimated_minutes"] > 0
    assert first["difficulty"] in ["easy", "medium", "hard"]
    assert first["reason"] != ""
    assert first["done"] is False


def test_syllabus_upload_typed_pdf(auth_headers, fake_youtube_env):
    """POST /syllabus/upload with real selectable PDF extracts topics and estimates time."""
    syllabus_text = (
        "CS 201: Data Structures and Algorithms\n"
        "1. Asymptotic Complexity and Big-O Notation\n"
        "   - Best, worst, average case analysis\n"
        "   - Master theorem and recurrence relations\n"
        "2. Dynamic Programming and DAG Shortest Paths\n"
        "   - Memoization and tabulation\n"
        "   - Knapsack problem\n"
        "3. Graph Traversals: BFS and DFS\n"
        "   - Breadth first search\n"
        "   - Depth first search\n"
    )

    pdf_bytes = make_test_pdf(syllabus_text)
    files = {"file": ("algorithms_syllabus.pdf", pdf_bytes, "application/pdf")}

    res = client.post("/syllabus/upload", files=files, headers=auth_headers)
    assert res.status_code == 201
    data = res.json()

    assert data["syllabus_id"] > 0
    assert "Data Structures" in data["course_name"]
    assert data["total_topics"] == 3
    assert data["is_sample"] is False

    titles = [t["title"] for t in data["topics"]]
    assert any("Asymptotic Complexity" in t for t in titles)
    assert any("Dynamic Programming" in t for t in titles)


def test_syllabus_upload_unsupported_file_rejected(auth_headers):
    """Rejects unsupported file types with clear message."""
    files = {"file": ("malicious.exe", b"binary content", "application/octet-stream")}
    res = client.post("/syllabus/upload", files=files, headers=auth_headers)
    assert res.status_code == 415
    assert "Unsupported file format" in res.json()["detail"]


def test_syllabus_upload_empty_file_rejected(auth_headers):
    """Rejects empty files with 400."""
    files = {"file": ("empty.txt", b"", "text/plain")}
    res = client.post("/syllabus/upload", files=files, headers=auth_headers)
    assert res.status_code == 400
    assert "empty" in res.json()["detail"].lower()


def test_syllabus_upload_requires_auth():
    """Unauthenticated upload returns 401."""
    files = {"file": ("syllabus.txt", b"1. Trees\n2. Graphs\n", "text/plain")}
    res = client.post("/syllabus/upload", files=files)
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# Phase 3: YouTube Topic Videos
# ---------------------------------------------------------------------------
def test_topic_videos_by_id_endpoint(fake_youtube_env):
    """GET /topics/{id}/videos returns real/cached lecture videos for a persisted topic."""
    # First create a sample syllabus so topics exist
    sample_res = client.post("/syllabus/sample")
    topic_id = sample_res.json()["topics"][0]["id"]

    res = client.get(f"/topics/{topic_id}/videos")
    assert res.status_code == 200
    data = res.json()

    assert len(data["videos"]) >= 1
    v = data["videos"][0]
    assert v["video_id"] != ""
    assert v["embed_url"].startswith("https://www.youtube.com/embed/")
    assert v["duration_seconds"] > 0


# ---------------------------------------------------------------------------
# Phase 4: Weekly Plan, Progress, Missed Day & Dashboard
# ---------------------------------------------------------------------------
def test_weekly_plan_flow_and_dashboard(auth_headers, fake_youtube_env):
    """End-to-end plan creation, topic progress update, missed-day rebalance, and dashboard."""
    # 1. Create a sample syllabus
    sample_res = client.post("/syllabus/sample", headers=auth_headers)
    s_id = sample_res.json()["syllabus_id"]
    topics = sample_res.json()["topics"]
    first_topic_id = topics[0]["id"]

    # 2. Create weekly plan
    plan_req = {
        "start_date": "2026-11-02",
        "hours_per_day": 2.0,
        "study_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    }
    plan_res = client.post(f"/syllabus/{s_id}/plan", json=plan_req, headers=auth_headers)
    assert plan_res.status_code == 201
    plan_data = plan_res.json()
    plan_id = plan_data["id"]

    assert plan_data["total_minutes"] > 0
    assert len(plan_data["items"]) >= len(topics) + 1  # includes light review slot
    # Final item is review
    assert plan_data["items"][-1]["is_review"] is True

    # 3. Check Dashboard with active plan
    dash_res = client.get("/dashboard", headers=auth_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    assert dash_data["has_plan"] is True
    assert dash_data["next_topic"] is not None
    assert dash_data["next_topic"]["title"] != ""
    assert dash_data["progress_percent"] == 0.0

    # 4. Mark first topic done via PATCH /topics/{id}/progress
    prog_res = client.patch(f"/topics/{first_topic_id}/progress", json={"done": True}, headers=auth_headers)
    assert prog_res.status_code == 200
    assert prog_res.json()["done"] is True

    # 5. Check Dashboard updated from database
    dash_res2 = client.get("/dashboard", headers=auth_headers)
    assert dash_res2.status_code == 200
    dash_data2 = dash_res2.json()
    assert dash_data2["completed_topics"] >= 1
    assert dash_data2["progress_percent"] > 0.0

    # 6. Rebalance missed day via POST /plan/{id}/missed-day
    missed_req = {"date": "2026-11-02"}
    rebalance_res = client.post(f"/plan/{plan_id}/missed-day", json=missed_req, headers=auth_headers)
    assert rebalance_res.status_code == 200
    reb_data = rebalance_res.json()

    assert reb_data["plan_id"] == plan_id
    assert "redistributed" in reb_data["explanation"].lower() or "no pending" in reb_data["explanation"].lower()


# ---------------------------------------------------------------------------
# Phase 5: Auth Providers & Health Check
# ---------------------------------------------------------------------------
def test_auth_providers_endpoint():
    """GET /auth/providers returns available auth providers."""
    res = client.get("/auth/providers")
    assert res.status_code == 200
    data = res.json()
    assert "google" in data
    assert "email_password" in data
    assert data["email_password"] is True


def test_health_endpoint():
    """GET /health returns 200 ok."""
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] in ["ok", "online"]
