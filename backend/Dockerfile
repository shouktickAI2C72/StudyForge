# Render deployment image: FastAPI backend + Tesseract OCR for scanned
# syllabus uploads. Python-runtime Render images can't install system
# packages, so we ship the OCR engine in a slim Docker image instead.
FROM python:3.11-slim

# Tesseract OCR engine (images & scanned/image-only PDFs)
RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements-deploy.txt .
RUN pip install --no-cache-dir -r requirements-deploy.txt

COPY . .

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
