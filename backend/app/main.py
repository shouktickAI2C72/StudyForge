from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers.effort import router as effort_router
from .routers.reoptimize import router as reoptimize_router
from .routers.notes import router as notes_router
from .routers.auth import router as auth_router
from .routers.youtube import router as youtube_router
from .services.predictor_service import predictor_service
# Import models so their tables are registered on Base before create_all
from . import models  # noqa: F401

# Create SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="StudyForge AI — Core API",
    description="Intelligent Syllabus-to-Study-Plan Platform. Module 1: Topic Effort Predictor. Module 2: Study Plan Re-Optimizer. Module 3: Handwritten Notes & Syllabus Scanner. YouTube Lecture Finder.",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Web (Next.js) and Mobile (React Native / Expo)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8081",
    "http://localhost:19000",
    "http://localhost:19006",
    "*"  # Allow all for local pair programming & mobile emulator dev
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(effort_router)
app.include_router(reoptimize_router)
app.include_router(notes_router)
app.include_router(youtube_router)

@app.get("/")
def root():
    return {
        "project": "StudyForge AI",
        "modules": [
            "Module 1: Topic Effort Predictor",
            "Module 2: Study Plan Re-Optimizer",
            "Module 3: Handwritten Notes & Syllabus Scanner"
        ],
        "status": "operational",
        "docs": "/docs",
        "endpoints": {
            "predict_effort": "POST /predict-effort",
            "prediction_history": "GET /predictions",
            "reoptimize_schedule": "POST /reoptimize-schedule",
            "reoptimization_history": "GET /reoptimizations",
            "scan_notes": "POST /scan-notes",
            "topic_videos": "GET /topic-videos?topic={topic_name}",
            "health": "GET /health"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
