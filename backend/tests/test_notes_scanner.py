import io
import sys
from pathlib import Path

import pytest
import torch
from fastapi.testclient import TestClient
from PIL import Image

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

import importlib

from app.main import app
# importlib returns the actual module: the package attribute of the same name is
# shadowed by the singleton instance the module defines at its bottom, so a plain
# `import ... as` would bind the instance and monkeypatching would fail.
service_module = importlib.import_module("app.services.notes_scanner_service")
from ml.document_extractor import extract_text
from ml.notes_scanner import SyllabusCNNBackbone, SyllabusCRNN, parse_syllabus_topics

client = TestClient(app)

SYLLABUS_TEXT = (
    "Syllabus: Computer Science\n"
    "1. Dynamic Programming and the Knapsack Problem - 6 subtopics\n"
    "2. CPU Scheduling Algorithms and Deadlocks - 4 subtopics\n"
    "3. Relational Database Normalization and SQL - 5 subtopics\n"
)


def fake_video(topic: str) -> dict:
    return {
        "video_id": "abc123",
        "title": f"{topic} lecture",
        "channel_name": "Study Channel",
        "thumbnail_url": "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
        "duration": "12:05",
        "watch_url": "https://www.youtube.com/watch?v=abc123",
    }


@pytest.fixture
def fake_youtube(monkeypatch):
    """Replace the YouTube lookup so scan tests never touch the real API."""
    monkeypatch.setattr(
        service_module,
        "get_topic_videos",
        lambda topic, max_results=5: {
            "topic": topic,
            "videos": [fake_video(topic)][:max_results],
            "cached": False,
        },
    )


@pytest.fixture
def broken_youtube(monkeypatch):
    """Simulate a missing / quota-exhausted YouTube API key."""
    def raise_unavailable(topic, max_results=5):
        raise RuntimeError("YOUTUBE_API_KEY is not configured.")

    monkeypatch.setattr(service_module, "get_topic_videos", raise_unavailable)


def make_png_bytes(color: int = 255, size=(180, 80)) -> bytes:
    img = Image.new("L", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# End-to-end upload: real extraction + lectures attached
# ---------------------------------------------------------------------------
def test_scan_notes_txt_upload_returns_topics_and_lectures(fake_youtube):
    """Plain-text syllabus upload: real text in, real predictions + lectures out."""
    files = {"file": ("syllabus.txt", SYLLABUS_TEXT.encode("utf-8"), "text/plain")}

    response = client.post("/scan-notes", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert data["extraction_method"] == "text-decode"
    assert data["total_topics_detected"] == 3
    assert data["total_estimated_hours"] > 0
    assert data["lectures_available"] is True
    assert data["lecture_message"] == ""

    first = data["topics"][0]
    assert first["predicted_hours"] > 0
    assert first["difficulty_tier"] in ["Easy", "Medium", "High", "Challenging"]
    assert 0.0 <= first["confidence_score"] <= 1.0
    assert len(first["lectures"]) > 0
    assert first["lectures"][0]["watch_url"].startswith("https://www.youtube.com/watch?v=")

    # Backward compat: frontend still renders this metadata block
    meta = data["cnn_backbone_metadata"]
    assert meta["model_architecture"]
    assert meta["kernel_details"] and meta["pooling_details"]


def test_scan_notes_real_pdf_extraction(fake_youtube):
    """A real PDF with embedded text must be read page-by-page via pypdf."""
    pymupdf = pytest.importorskip("pymupdf")

    doc = pymupdf.open()
    page = doc.new_page()
    y = 72
    for line in SYLLABUS_TEXT.splitlines():
        page.insert_text((50, y), line, fontsize=11)
        y += 18
    pdf_bytes = doc.tobytes()
    doc.close()

    files = {"file": ("syllabus.pdf", pdf_bytes, "application/pdf")}
    response = client.post("/scan-notes", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["extraction_method"] == "pdf-text"
    assert "Knapsack" in data["extracted_raw_text"]
    assert data["total_topics_detected"] >= 1


def test_scan_notes_docx_upload(fake_youtube):
    """Word documents: real paragraph text, not filename guesses."""
    docx = pytest.importorskip("docx")

    doc = docx.Document()
    for line in SYLLABUS_TEXT.splitlines():
        doc.add_paragraph(line)
    buf = io.BytesIO()
    doc.save(buf)

    files = {
        "file": (
            "syllabus.docx",
            buf.getvalue(),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    }
    response = client.post("/scan-notes", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["extraction_method"] == "docx-text"
    assert data["total_topics_detected"] >= 1


def test_extract_text_pptx_xlsx_csv():
    """PowerPoint slides, Excel cells and CSV all yield their real content."""
    pptx = pytest.importorskip("pptx")
    from openpyxl import Workbook

    prs = pptx.Presentation()
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    slide.shapes.title.text = "Module 2: Graph Theory"
    tf = slide.placeholders[1].text_frame
    tf.text = "Dijkstra Shortest Path Algorithm"
    tf.add_paragraph().text = "Prim's Minimum Spanning Tree"
    buf = io.BytesIO()
    prs.save(buf)
    text, method = extract_text(buf.getvalue(), "slides.pptx", "")
    assert method == "pptx-text"
    assert "Dijkstra" in text and "Graph Theory" in text

    wb = Workbook()
    ws = wb.active
    ws.append(["Week", "Topic"])
    ws.append([1, "Binary Search Trees and AVL Rotations"])
    buf = io.BytesIO()
    wb.save(buf)
    text, method = extract_text(buf.getvalue(), "plan.xlsx", "")
    assert method == "xlsx-text"
    assert "Binary Search Trees" in text

    text, method = extract_text(b"Unit 1\nSorting Algorithms\n", "topics.csv", "")
    assert method == "text-decode"
    assert "Sorting Algorithms" in text


def test_camera_ocr_text_form_field(fake_youtube):
    """Mobile camera flow: client-provided OCR text is used as-is."""
    files = {"file": ("photo.png", make_png_bytes(), "image/png")}
    response = client.post("/scan-notes", files=files, data={"ocr_text": SYLLABUS_TEXT})
    assert response.status_code == 200
    data = response.json()
    assert data["extraction_method"] == "camera-ocr"
    assert data["total_topics_detected"] >= 1


# ---------------------------------------------------------------------------
# Honesty: no fake fallback topics, ever
# ---------------------------------------------------------------------------
def test_blank_image_returns_honest_error_not_fake_topics(fake_youtube):
    """A blank image named os_syllabus.png must NOT produce a fabricated OS syllabus."""
    files = {"file": ("os_syllabus.png", make_png_bytes(), "image/png")}
    response = client.post("/scan-notes", files=files)
    assert response.status_code == 422
    detail = response.json()["detail"].lower()
    assert "readable text" in detail
    for fake_marker in ("deadlock", "cpu scheduling", "avl", "general syllabus concepts"):
        assert fake_marker not in detail


def test_parser_has_no_fallback_topics():
    assert parse_syllabus_topics("") == []
    assert parse_syllabus_topics("   \n\t\n") == []


def test_predict_from_text_rejects_empty():
    with pytest.raises(ValueError):
        service_module.notes_scanner_service.predict_from_text("   ", "blank.txt", "text-decode")


def _tesseract_available() -> bool:
    try:
        import pytesseract
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _tesseract_available(), reason="Tesseract OCR binary not installed")
def test_image_ocr_reads_real_text(fake_youtube):
    """Real OCR path (runs wherever the tesseract binary is installed, e.g. Render)."""
    from PIL import ImageDraw, ImageFont

    try:
        font = ImageFont.load_default(size=42)
    except TypeError:
        font = ImageFont.load_default()

    img = Image.new("RGB", (900, 260), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((20, 30), "Unit 1: Sorting Algorithms", fill="black", font=font)
    draw.text((20, 140), "Unit 2: Graph Traversal BFS DFS", fill="black", font=font)
    buf = io.BytesIO()
    img.save(buf, format="PNG")

    files = {"file": ("syllabus_photo.png", buf.getvalue(), "image/png")}
    response = client.post("/scan-notes", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["extraction_method"] == "image-ocr"
    assert data["total_topics_detected"] >= 1


# ---------------------------------------------------------------------------
# YouTube degradation: the upload must still succeed
# ---------------------------------------------------------------------------
def test_youtube_failure_does_not_fail_upload(broken_youtube):
    files = {"file": ("syllabus.txt", SYLLABUS_TEXT.encode("utf-8"), "text/plain")}
    response = client.post("/scan-notes", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["total_topics_detected"] == 3
    assert data["lectures_available"] is False
    assert "unavailable" in data["lecture_message"].lower()
    for topic in data["topics"]:
        assert topic["lectures"] == []


def test_scan_notes_empty_file():
    """Uploading an empty file returns 400 Bad Request."""
    files = {"file": ("empty.png", b"", "image/png")}
    response = client.post("/scan-notes", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Limits: sensible caps on topics and search-friendly names
# ---------------------------------------------------------------------------
def test_topics_capped_at_fifteen(fake_youtube):
    lines = "\n".join(f"{i}. Study Topic Number {i}" for i in range(1, 21))
    result = service_module.notes_scanner_service.predict_from_text(lines, "big.txt", "text-decode")
    assert result["total_topics_detected"] == 15


def test_topic_names_are_search_friendly():
    long_line = "1. " + "Very Long Topic Name " * 8
    topics = parse_syllabus_topics(long_line)
    assert len(topics) == 1
    assert len(topics[0]["topic_name"]) <= 60


# ---------------------------------------------------------------------------
# Model architecture unit tests (unchanged surface)
# ---------------------------------------------------------------------------
def test_cnn_backbone_and_crnn_shapes():
    """
    Unit test verifying the CNN backbone transforms a 2D image [B, 1, 32, W]
    into a sequential feature representation [B, 512, 1, W/4] with 3x3 kernels,
    padding=1, and asymmetric pooling.
    """
    cnn = SyllabusCNNBackbone(in_channels=1)
    dummy_input = torch.randn(2, 1, 32, 256)
    features = cnn(dummy_input)

    assert features.shape[0] == 2
    assert features.shape[1] == 512
    assert features.shape[2] == 1
    assert features.shape[3] == 64

    crnn = SyllabusCRNN(num_classes=80)
    crnn_out = crnn(dummy_input)
    assert crnn_out.shape[0] == 64  # Time/sequence length
    assert crnn_out.shape[1] == 2   # Batch size
    assert crnn_out.shape[2] == 80  # Character classes


def test_topic_parsing_logic():
    """
    Unit test verifying that raw syllabus text is parsed into structured topic
    candidates with proper topic_type keyword classification.
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
