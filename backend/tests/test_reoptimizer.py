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
from ml.reoptimizer import EffortPredictorV2, run_reoptimization

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield

def test_reoptimize_schedule_endpoint():
    """
    Test that POST /reoptimize-schedule runs re-optimization and returns
    before/after topic adjustments, comparison metrics, and schedule redistribution.
    """
    payload = {
        "skipped_day": "MON",
        "force_retrain": False,  # Use cached or quick run
        "epochs": 40
    }
    response = client.post("/reoptimize-schedule", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "reoptimized"
    assert data["model_version"] == "v2"
    assert data["batch_size"] == 8
    assert data["dropout_rate"] == 0.2
    assert data["dataset_size"] == 50
    assert data["feedback_rows_count"] == 15

    # Check optimizer comparison
    opt_comp = data["optimizer_comparison"]
    assert opt_comp["winner"] in ["Adam", "RMSprop"]
    assert "adam_loss" in opt_comp
    assert "rmsprop_loss" in opt_comp
    assert len(opt_comp["summary"]) > 0

    # Check initialization comparison
    init_comp = data["init_comparison"]
    assert init_comp["winner"] in ["Xavier", "He"]
    assert "xavier_loss_variance" in init_comp
    assert "he_loss_variance" in init_comp
    assert len(init_comp["summary"]) > 0

    # Check topic adjustments (before and after)
    topics = data["topic_adjustments"]
    assert len(topics) >= 5
    for t in topics:
        assert "name" in t
        assert "day" in t
        assert "original_minutes" in t
        assert "optimized_minutes" in t
        assert "delta_minutes" in t

    # Check redistribution
    redist = data["redistribution"]
    assert redist["monday_skipped"] is True
    assert redist["monday_workload_minutes"] > 0
    assert "TUE" in redist["redistributed"]

    # Check banner text
    assert "AI REOPTIMIZED" in data["reopt_banner_text"]


def test_reoptimizations_history_endpoint():
    """
    Test that GET /reoptimizations returns history recorded in SQLite table.
    """
    response = client.get("/reoptimizations?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "records" in data
    assert isinstance(data["records"], list)
    assert data["total"] >= 1
    latest = data["records"][0]
    assert latest["optimizer_winner"] in ["Adam", "RMSprop"]
    assert latest["init_winner"] in ["Xavier", "He"]
    assert latest["total_original_hours"] > 0


def test_dropout_model_architecture():
    """
    Test that EffortPredictorV2 contains Dropout layers with rate 0.2
    specifically designed to prevent overfitting on small feedback data.
    """
    import torch
    import torch.nn as nn

    model = EffortPredictorV2(input_dim=5, hidden1=16, hidden2=8, dropout_rate=0.2)
    dropout_layers = [m for m in model.modules() if isinstance(m, nn.Dropout)]
    assert len(dropout_layers) == 2
    assert dropout_layers[0].p == 0.2
    assert dropout_layers[1].p == 0.2

    # Verify forward pass shape
    dummy_x = torch.randn(4, 5)
    model.eval()
    out = model(dummy_x)
    assert out.shape == (4, 1)


def test_weights_versioning_preserves_module1():
    """
    Verify that effort_predictor_v2.pt is created without overwriting effort_predictor.pt.
    """
    weights_dir = backend_dir / "ml" / "weights"
    v1_path = weights_dir / "effort_predictor.pt"
    v2_path = weights_dir / "effort_predictor_v2.pt"

    assert v1_path.exists(), "Original Module 1 effort_predictor.pt must not be deleted!"
    assert v2_path.exists(), "Module 2 effort_predictor_v2.pt must be present!"
    assert v1_path.stat().st_size > 0
    assert v2_path.stat().st_size > 0
