import sys
from pathlib import Path
from typing import Dict, Any, List

# Ensure ml package path is resolved
ml_dir = Path(__file__).resolve().parent.parent.parent / "ml"
if str(ml_dir) not in sys.path:
    sys.path.insert(0, str(ml_dir))

from notes_scanner import parse_syllabus_topics
# REUSE EXISTING MODULE 1 PREDICTOR SERVICE (Do not duplicate prediction logic)
from .predictor_service import predictor_service
from .youtube_service import get_topic_videos

# Sensible caps so one huge syllabus can't burn YouTube quota or flood the UI
MAX_TOPICS_PER_SCAN = 15
LECTURES_PER_TOPIC = 3


class NotesScannerService:
    """
    Module 3 Service: parses real topics out of extracted syllabus text, chains
    each through Module 1's existing PyTorch MLP effort predictor, and attaches
    YouTube lecture recommendations matched to each detected topic.

    YouTube failures never fail the scan — topics still come back with an empty
    lecture list plus a clear availability note.
    """

    def predict_from_text(self, extracted_text: str, filename: str, method: str = "text") -> Dict[str, Any]:
        """
        Shared pipeline for every upload type (PDF, Office docs, text, images).
        Raises ValueError when no readable text was extracted so the API can
        answer honestly instead of inventing topics.
        """
        if not extracted_text or not extracted_text.strip():
            raise ValueError(
                "No readable text was found in this file. Please upload a clearer "
                "scan or a document with selectable text."
            )

        # Topic parsing (bounded so huge files stay responsive)
        parsed_candidates = parse_syllabus_topics(extracted_text)[:MAX_TOPICS_PER_SCAN]

        topic_predictions = []
        total_hours = 0.0
        lectures_available = True
        lecture_message = ""

        for candidate in parsed_candidates:
            # Call existing Module 1 predict() function
            pred = predictor_service.predict(
                topic_name=candidate["topic_name"],
                subtopic_count=candidate["subtopic_count"],
                topic_type=candidate["topic_type"],
                desc_word_count=candidate["desc_word_count"]
            )

            total_hours += pred["predicted_hours"]

            # Attach YouTube lectures for this topic; degrade gracefully.
            lectures: List[Dict[str, Any]] = []
            if lectures_available:
                try:
                    lectures = get_topic_videos(
                        candidate["topic_name"], max_results=LECTURES_PER_TOPIC
                    )["videos"]
                except RuntimeError as e:
                    lectures_available = False
                    lecture_message = f"YouTube lectures are unavailable right now: {e}"

            topic_predictions.append({
                "topic_name": pred["topic_name"],
                "subtopic_count": pred["subtopic_count"],
                "topic_type": pred["topic_type"],
                "desc_word_count": pred["desc_word_count"],
                "predicted_hours": pred["predicted_hours"],
                "formatted_time": pred["formatted_time"],
                "difficulty_tier": pred["difficulty_tier"],
                "confidence_score": pred["confidence_score"],
                "lectures": lectures,
            })

        # User-friendly reader metadata — the frontend still renders this block,
        # so keep the shape but describe what actually happens (no fake CNN/OCR talk).
        reader_metadata = {
            "model_architecture": "StudyForge Syllabus Reader (document text extraction + topic detection)",
            "kernel_details": "Text is read directly from your document — PDF pages, Word paragraphs, slides, or spreadsheet cells.",
            "stride_details": "Topics are detected from real headings, numbering, and bullet structure in your file.",
            "padding_details": "Scanned images and image-only PDFs are read with OCR when it is available.",
            "pooling_details": "No topics are invented — if no readable text is found, we tell you instead of guessing.",
        }

        return {
            "status": "success",
            "filename": filename,
            "extraction_method": method,
            "extracted_raw_text": extracted_text,
            "total_topics_detected": len(topic_predictions),
            "total_estimated_hours": round(total_hours, 2),
            "topics": topic_predictions,
            "cnn_backbone_metadata": reader_metadata,
            "lectures_available": lectures_available,
            "lecture_message": lecture_message,
        }

# Global singleton service
notes_scanner_service = NotesScannerService()
