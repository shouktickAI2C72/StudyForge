import sys
from pathlib import Path

from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status

from ..schemas.notes_scanner import ScanNotesResponse
from ..services.notes_scanner_service import notes_scanner_service

# Ensure the ml/ package dir is importable, then load the universal extractor.
_ml_dir = Path(__file__).resolve().parent.parent.parent / "ml"
if str(_ml_dir) not in sys.path:
    sys.path.insert(0, str(_ml_dir))
from document_extractor import extract_text

router = APIRouter(tags=["Notes & Syllabus Scanner"])

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB limit (PDFs run larger than photos)


@router.post("/scan-notes", response_model=ScanNotesResponse, status_code=status.HTTP_200_OK)
async def scan_notes(
    file: UploadFile = File(...),
    ocr_text: Optional[str] = Form(None)
):
    """
    Scan & Upload endpoint. Accepts ANY common study file — PDF, TXT/Markdown/CSV,
    or a photo/scan (JPG, PNG, WEBP, BMP) — extracts its text, parses topic
    candidates, pipes each topic through Module 1's effort predictor to build
    a study estimate, and returns matched YouTube video recommendations.
    """
    filename = file.filename or "upload"
    content_type = file.content_type or ""

    # 1. Read + size guards
    try:
        data = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read the uploaded file: {str(e)}",
        )

    if len(data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the 15MB limit (received {len(data) / 1024 / 1024:.2f}MB).",
        )

    # 2. Extract text from whatever file type this is
    if ocr_text and ocr_text.strip():
        extracted_text = ocr_text.strip()
        method = "camera-ocr"
    else:
        try:
            extracted_text, method = extract_text(data, filename=filename, content_type=content_type)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Couldn't read this file. It may be corrupt or password-protected: {str(e)}",
            )

    # 3. Parse topics + chain through the effort predictor
    try:
        result = notes_scanner_service.predict_from_text(extracted_text, filename=filename, method=method)
        return ScanNotesResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Study-plan pipeline failed: {str(e)}",
        )
