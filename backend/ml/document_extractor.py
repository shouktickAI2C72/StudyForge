"""
Universal document text extractor for StudyForge's "Scan & Upload" feature.

Turns an uploaded file of ANY common type into plain text that the syllabus
topic parser can consume:

  - .pdf              -> real text extraction via pypdf (page by page)
  - .txt/.md/.csv...  -> decoded as text (utf-8, then latin-1 fallback)
  - images            -> existing vision pipeline (notes_scanner_model)
  - anything else      -> best-effort text decode, then image pipeline

If a PDF has no embedded text (e.g. a scanned photo saved as PDF) we fall back
to the filename-aware topic detector so the user still gets a usable plan
instead of an error — but we never invent numbers: every topic is still run
through the real effort predictor downstream.
"""
from __future__ import annotations

import io
from pathlib import Path
from typing import Tuple

from notes_scanner import notes_scanner_model

IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"}
TEXT_EXTS = {"txt", "md", "markdown", "csv", "tsv", "rtf", "log", "text"}
PDF_EXTS = {"pdf"}


def _ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _decode_text(data: bytes) -> str:
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(enc)
        except Exception:
            continue
    return data.decode("utf-8", errors="ignore")


def _extract_pdf(data: bytes) -> str:
    """Extract embedded text from a PDF. Returns '' if the PDF is image-only."""
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    chunks = []
    for page in reader.pages:
        try:
            chunks.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n".join(c.strip() for c in chunks if c.strip()).strip()


def extract_text(data: bytes, filename: str, content_type: str = "") -> Tuple[str, str]:
    """
    Returns (extracted_text, method) where method describes how we read the file.
    Raises ValueError only when the file is empty/unreadable in every path.
    """
    if not data:
        raise ValueError("The uploaded file is empty.")

    ext = _ext(filename)
    ctype = (content_type or "").lower()

    # --- PDF -------------------------------------------------------------
    if ext in PDF_EXTS or "pdf" in ctype:
        text = _extract_pdf(data)
        if text:
            return text, "pdf-text"
        # Image-only / scanned PDF: use the filename-aware topic detector.
        fallback = notes_scanner_model._decode_visual_content_by_name(filename)  # type: ignore[attr-defined]
        return fallback, "pdf-scanned-fallback"

    # --- Plain text ------------------------------------------------------
    if ext in TEXT_EXTS or ctype.startswith("text/"):
        text = _decode_text(data).strip()
        if not text:
            raise ValueError("The text file appears to be empty.")
        return text, "text-decode"

    # --- Images ----------------------------------------------------------
    if ext in IMAGE_EXTS or ctype.startswith("image/"):
        text = notes_scanner_model.extract_text_from_image(data, filename=filename)
        return text, "image-vision"

    # --- Unknown: try text, then fall back to the image pipeline ---------
    maybe_text = _decode_text(data).strip()
    printable = sum(c.isprintable() or c.isspace() for c in maybe_text[:2000])
    if maybe_text and printable / max(1, len(maybe_text[:2000])) > 0.85:
        return maybe_text, "text-decode"

    try:
        text = notes_scanner_model.extract_text_from_image(data, filename=filename)
        return text, "image-vision"
    except Exception:
        return notes_scanner_model._decode_visual_content_by_name(filename), "name-fallback"  # type: ignore[attr-defined]
