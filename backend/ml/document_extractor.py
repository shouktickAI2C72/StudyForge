"""
Universal document text extractor for StudyForge's "Scan & Upload" feature.

Turns an uploaded file of ANY common type into plain text that the syllabus
topic parser can consume:

  - .pdf                -> real embedded text via pypdf; scanned/image-only
                           PDFs are rendered page-by-page and read with OCR
  - .docx/.pptx/.xlsx   -> real content from paragraphs / slides / cells
  - .txt/.md/.csv/...   -> decoded as text (utf-8, then latin-1 fallback)
  - images              -> real OCR via Tesseract

Nothing is ever invented here: if a file yields no readable text we return an
empty string (with the method used) and let the API layer tell the student
honestly instead of fabricating topics from the filename.
"""
from __future__ import annotations

import io
from typing import Tuple

IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"}
TEXT_EXTS = {"txt", "md", "markdown", "csv", "tsv", "log", "text"}
PDF_EXTS = {"pdf"}
DOCX_EXTS = {"docx"}
PPTX_EXTS = {"pptx"}
XLSX_EXTS = {"xlsx", "xlsm"}

# Scanned-PDF OCR limits: keep uploads responsive on the free tier
MAX_OCR_PAGES = 20
OCR_RENDER_DPI = 200


def _ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _decode_text(data: bytes) -> str:
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(enc)
        except Exception:
            continue
    return data.decode("utf-8", errors="ignore")


def ocr_image_bytes(data: bytes) -> str:
    """
    Real OCR via Tesseract. Returns '' when Tesseract is not installed,
    the image can't be opened, or no readable text is found.
    """
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return ""
    try:
        image = Image.open(io.BytesIO(data))
        return str(pytesseract.image_to_string(image)).strip()
    except pytesseract.TesseractNotFoundError:
        return ""
    except Exception:
        return ""


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


def _ocr_pdf_pages(data: bytes) -> str:
    """Render scanned PDF pages to images and OCR them. '' if OCR is unavailable."""
    try:
        import pymupdf
    except ImportError:
        try:
            import fitz as pymupdf  # type: ignore
        except ImportError:
            return ""

    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception:
        return ""

    chunks = []
    try:
        for page in doc[:MAX_OCR_PAGES]:
            try:
                pix = page.get_pixmap(dpi=OCR_RENDER_DPI)
                text = ocr_image_bytes(pix.tobytes("png"))
                if text:
                    chunks.append(text)
            except Exception:
                continue
    finally:
        doc.close()
    return "\n".join(chunks).strip()


def _extract_docx(data: bytes) -> str:
    """Read real paragraph + table text from a Word document."""
    from docx import Document

    doc = Document(io.BytesIO(data))
    chunks = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                chunks.append(" | ".join(cells))
    return "\n".join(chunks).strip()


def _extract_pptx(data: bytes) -> str:
    """Read real text from every PowerPoint slide (text frames + tables)."""
    from pptx import Presentation

    prs = Presentation(io.BytesIO(data))
    chunks = []
    for slide in prs.slides:
        for shape in slide.shapes:
            if getattr(shape, "has_text_frame", False):
                text_frame = getattr(shape, "text_frame", None)
                if text_frame is not None:
                    text = text_frame.text.strip()
                    if text:
                        chunks.append(text)
            if getattr(shape, "has_table", False):
                table = getattr(shape, "table", None)
                if table is not None:
                    for row in table.rows:
                        cells = [c.text.strip() for c in row.cells if c.text.strip()]
                        if cells:
                            chunks.append(" | ".join(cells))
    return "\n".join(chunks).strip()


def _extract_xlsx(data: bytes) -> str:
    """Read non-empty cell values from every worksheet."""
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    chunks = []
    try:
        for sheet in wb.worksheets:
            for row in sheet.iter_rows(values_only=True):
                cells = [str(c).strip() for c in row if c is not None and str(c).strip()]
                if cells:
                    chunks.append(" | ".join(cells))
    finally:
        wb.close()
    return "\n".join(chunks).strip()


def extract_text(data: bytes, filename: str, content_type: str = "") -> Tuple[str, str]:
    """
    Returns (extracted_text, method) where method describes how we read the file.
    An empty string means "no readable text found" — never fake content.
    Raises ValueError only when the file is empty or a format we can't attempt.
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
        # Image-only / scanned PDF: render pages and run real OCR.
        text = _ocr_pdf_pages(data)
        return (text, "pdf-ocr") if text else ("", "pdf-no-readable-text")

    # --- Office documents ------------------------------------------------
    if ext in DOCX_EXTS or "wordprocessingml" in ctype:
        return _extract_docx(data), "docx-text"

    if ext in PPTX_EXTS or "presentationml" in ctype:
        return _extract_pptx(data), "pptx-text"

    if ext in XLSX_EXTS or "spreadsheetml" in ctype:
        return _extract_xlsx(data), "xlsx-text"

    # --- Plain text ------------------------------------------------------
    if ext in TEXT_EXTS or ctype.startswith("text/"):
        text = _decode_text(data).strip()
        if not text:
            raise ValueError("The text file appears to be empty.")
        return text, "text-decode"

    # --- Images ----------------------------------------------------------
    if ext in IMAGE_EXTS or ctype.startswith("image/"):
        return ocr_image_bytes(data), "image-ocr"

    # --- Unknown extension: try text, then OCR, otherwise say so ---------
    maybe_text = _decode_text(data).strip()
    printable = sum(c.isprintable() or c.isspace() for c in maybe_text[:2000])
    if maybe_text and printable / max(1, len(maybe_text[:2000])) > 0.85:
        return maybe_text, "text-decode"

    text = ocr_image_bytes(data)
    if text:
        return text, "image-ocr"

    raise ValueError(
        "Couldn't find readable text in this file. Upload a PDF, Word document, "
        "PowerPoint, Excel sheet, text file, or a clear image of your syllabus."
    )
