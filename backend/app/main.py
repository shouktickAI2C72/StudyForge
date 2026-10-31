import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers.effort import router as effort_router
from .routers.reoptimize import router as reoptimize_router
from .routers.notes import router as notes_router
from .routers.auth import router as auth_router
from .routers.youtube import router as youtube_router
from .routers.syllabus import router as syllabus_router
from .services.predictor_service import predictor_service
# Import models so their tables are registered on Base before create_all
from . import models  # noqa: F401

# Create SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="StudyForge AI — Core API",
    description="Intelligent Syllabus-to-Study-Plan Platform. Upload syllabus -> extract topics -> estimate study time -> find YouTube lectures -> build weekly plan -> adapt on missed days.",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS for Web (Next.js on Vercel) and Mobile (React Native / Expo)
cors_env = os.environ.get("CORS_ORIGINS", "")
origins = [
    "https://studyforge-web-five.vercel.app",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:19000",
    "http://localhost:19006",
]
if cors_env:
    for o in cors_env.split(","):
        clean_origin = o.strip()
        if clean_origin and clean_origin not in origins:
            origins.append(clean_origin)

# Allow all origins in dev if wildcard or unconfigured
if "*" not in origins:
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(syllabus_router)
app.include_router(effort_router)
app.include_router(reoptimize_router)
app.include_router(notes_router)
app.include_router(youtube_router)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "StudyForge AI Backend",
        "version": "3.0.0"
    }


@app.get("/")
def root():
    return {
        "project": "StudyForge AI",
        "status": "operational",
        "flow": "Upload syllabus -> extract topics -> estimate study time -> find YouTube lectures -> build weekly plan -> adapt on missed days",
        "docs": "/docs",
        "endpoints": {
            "syllabus_upload": "POST /syllabus/upload",
            "syllabus_sample": "POST /syllabus/sample",
            "weekly_plan": "POST /syllabus/{id}/plan",
            "topic_progress": "PATCH /topics/{id}/progress",
            "missed_day": "POST /plan/{id}/missed-day",
            "dashboard": "GET /dashboard",
            "topic_videos": "GET /topics/{id}/videos",
            "auth_providers": "GET /auth/providers",
            "health": "GET /health",
            "predict_effort": "POST /predict-effort",
            "reoptimize_schedule": "POST /reoptimize-schedule",
            "scan_notes": "POST /scan-notes"
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=port, reload=True)
