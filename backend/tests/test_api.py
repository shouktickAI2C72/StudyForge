import pytest
from fastapi.testclient import TestClient
import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.database import Base, engine

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Module 1" in data["module"]

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "operational"

def test_predict_effort_numerical():
    payload = {
        "topic_name": "Complete Binary Trees",
        "subtopic_count": 4,
        "topic_type": "numerical",
        "desc_word_count": 48
    }
    response = client.post("/predict-effort", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["topic_name"] == "Complete Binary Trees"
    assert data["predicted_hours"] > 0
    assert "formatted_time" in data
    assert data["difficulty_tier"] in ["Easy", "Medium", "High", "Challenging"]
    assert 0.0 <= data["confidence_score"] <= 1.0
    assert data["id"] is not None

def test_predict_effort_theory():
    payload = {
        "topic_name": "Operating System System Calls",
        "subtopic_count": 3,
        "topic_type": "theory",
        "desc_word_count": 30
    }
    response = client.post("/predict-effort", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["topic_type"] == "theory"
    assert data["predicted_hours"] > 0

def test_predict_effort_invalid_topic_type():
    payload = {
        "topic_name": "Invalid Topic",
        "subtopic_count": 4,
        "topic_type": "invalid_type",
        "desc_word_count": 40
    }
    response = client.post("/predict-effort", json=payload)
    assert response.status_code == 422  # Pydantic validation error

def test_get_predictions_history():
    response = client.get("/predictions?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "predictions" in data
    assert isinstance(data["predictions"], list)
