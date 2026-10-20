import pytest
from fastapi.testclient import TestClient
import io
import sys
from pathlib import Path
from PIL import Image
import torch

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from ml.notes_scanner import SyllabusCNNBackbone, SyllabusCRNN, parse_syllabus_topics

client = TestClient(app)

def create_test_image_bytes(filename: str = "test.png") -> io.BytesIO:
    """Helper creating an in-memory PNG image."""
    img = Image.new("L", (180, 80), color=255)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def test_scan_notes_endpoint_valid_image():
    """
    Test that POST /scan-notes processes an uploaded image,
    extracts topics via CNN OCR, and chains each to Module 1 for effort prediction.
    """
    buf = create_test_image_bytes("os_syllabus.png")
    files = {"file": ("os_syllabus.png", buf.getvalue(), "image/png")}

    response = client.post("/scan-notes", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert "os_syllabus.png" in data["filename"]
    assert len(data["extracted_raw_text"]) > 0
    assert data["total_topics_detected"] > 0
    assert data["total_estimated_hours"] > 0
    assert isinstance(data["topics"], list)

    # Check that topics have Module 1 predictions
    first_topic = data["topics"][0]
    assert "topic_name" in first_topic
    assert first_topic["predicted_hours"] > 0
    assert "formatted_time" in first_topic
    assert first_topic["difficulty_tier"] in ["Easy", "Medium", "High", "Challenging"]
    assert 0.0 <= first_topic["confidence_score"] <= 1.0

    # Check CNN backbone metadata
    meta = data["cnn_backbone_metadata"]
    assert "CRNN" in meta["model_architecture"]
    assert "3x3" in meta["kernel_details"]
    assert "Stride=1" in meta["stride_details"]
    assert "Padding=1" in meta["padding_details"]
    assert "MaxPool2d" in meta["pooling_details"]


def test_scan_notes_empty_file():
    """
    Test that uploading an empty file returns 400 Bad Request.
    """
    empty_file = io.BytesIO(b"")
    files = {"file": ("empty.png", empty_file.getvalue(), "image/png")}

    response = client.post("/scan-notes", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_cnn_backbone_and_crnn_shapes():
    """
    Unit test verifying the CNN backbone transforms a 2D image [B, 1, 32, W]
    into a sequential feature representation [B, 512, 1, W/4] with 3x3 kernels,
    padding=1, and asymmetric pooling.
    """
    cnn = SyllabusCNNBackbone(in_channels=1)
    dummy_input = torch.randn(2, 1, 32, 256)
    features = cnn(dummy_input)

    # Receptive field channels must be 512, height collapsed to 1
    assert features.shape[0] == 2
    assert features.shape[1] == 512
    assert features.shape[2] == 1
    assert features.shape[3] == 64

    # Test full CRNN
    crnn = SyllabusCRNN(num_classes=80)
    crnn_out = crnn(dummy_input)
    assert crnn_out.shape[0] == 64  # Time/sequence length
    assert crnn_out.shape[1] == 2   # Batch size
    assert crnn_out.shape[2] == 80  # Character classes


def test_topic_parsing_logic():
    """
    Unit test verifying that raw handwritten text is parsed into
    structured topic candidates with proper topic_type keyword classification.
    """
    sample_text = """
    Syllabus Overview: Computer Science
    1. Dynamic Programming Knapsack Algorithm - 6 subtopics
    2. CNN Convolutions and Pooling Lab - 7 subtopics
    3. CPU Scheduling and Process Synchronization - 4 subtopics
    """
    topics = parse_syllabus_topics(sample_text)
    assert len(topics) == 3

    assert topics[0]["topic_type"] == "numerical"
    assert "Knapsack" in topics[0]["topic_name"]
    assert topics[0]["subtopic_count"] == 6

    assert topics[1]["topic_type"] == "lab-heavy"
    assert "CNN" in topics[1]["topic_name"]
    assert topics[1]["subtopic_count"] == 7

    assert topics[2]["topic_type"] == "theory"
    assert "Scheduling" in topics[2]["topic_name"]
    assert topics[2]["subtopic_count"] == 4
