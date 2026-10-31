import os
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from .auth import get_current_user, get_optional_current_user
from ..schemas.syllabus import SyllabusResponse, TopicResponse, TopicProgressUpdate
from ..schemas.plan import PlanCreateRequest, PlanResponse, MissedDayRequest, MissedDayResponse, DashboardResponse
from ..services.study_plan_service import study_plan_service

router = APIRouter(tags=["Syllabus Intake & Study Plans"])

MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp", "heic", "heif", "txt", "md"}


def _get_ext(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


@router.post("/syllabus/upload", response_model=SyllabusResponse, status_code=status.HTTP_201_CREATED)
async def upload_syllabus(
    file: UploadFile = File(..., description="Uploaded syllabus document (PDF, images, text, markdown)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Phase 1: Real syllabus intake.
    Accepts PDF, PNG, JPG, JPEG, WEBP, HEIC, TXT, MD up to 15 MB.
    Extracts real text and structured topics, estimates study time, and pre-fetches lectures.
    """
    filename = file.filename or "upload"
    ext = _get_ext(filename)

    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file format '.{ext}'. Supported formats are: PDF, PNG, JPG, JPEG, WEBP, HEIC, TXT, and Markdown (.md)."
        )

    try:
        data = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {e}"
        )

    if not data or len(data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty."
        )

    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the 15 MB limit (received {len(data) / 1024 / 1024:.2f} MB)."
        )

    content_type = file.content_type or ""

    try:
        return study_plan_service.upload_and_process_syllabus(
            data=data,
            filename=filename,
            content_type=content_type,
            user_id=current_user.id,
            db=db
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Syllabus extraction failed: {e}")


@router.post("/syllabus/sample", response_model=SyllabusResponse, status_code=status.HTTP_200_OK)
def get_sample_syllabus(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns an explicit demo syllabus clearly labelled sample=true.
    Allows students to preview StudyForge without file upload.
    """
    user_id = current_user.id if current_user else None
    return study_plan_service.create_sample_syllabus(user_id=user_id, db=db)


@router.post("/syllabus/{syllabus_id}/plan", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan_for_syllabus(
    syllabus_id: int,
    body: PlanCreateRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Phase 4: Build a weekly schedule spreading topics hardest first,
    with a light review slot on the final day.
    """
    user_id = current_user.id if current_user else None
    try:
        return study_plan_service.create_weekly_plan(
            syllabus_id=syllabus_id,
            user_id=user_id,
            start_date_str=body.start_date,
            hours_per_day=body.hours_per_day,
            study_days=body.study_days,
            exam_date_str=body.exam_date,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Plan creation failed: {e}")


@router.patch("/topics/{topic_id}/progress", response_model=TopicResponse, status_code=status.HTTP_200_OK)
def update_topic_progress(
    topic_id: int,
    body: TopicProgressUpdate,
    db: Session = Depends(get_db),
):
    """
    Phase 4: Update topic completion progress.
    """
    try:
        return study_plan_service.update_topic_progress(topic_id=topic_id, done=body.done, db=db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Progress update failed: {e}")


@router.post("/plan/{plan_id}/missed-day", response_model=MissedDayResponse, status_code=status.HTTP_200_OK)
def handle_missed_day(
    plan_id: int,
    body: MissedDayRequest,
    db: Session = Depends(get_db),
):
    """
    Phase 4: Rebalance missed day's study tasks across remaining days.
    Provides clear before/after minutes and a plain explanation.
    """
    try:
        return study_plan_service.rebalance_missed_day(plan_id=plan_id, missed_date=body.date, db=db)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Schedule rebalance failed: {e}")


@router.get("/dashboard", response_model=DashboardResponse, status_code=status.HTTP_200_OK)
def get_dashboard(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Phase 4: Returns next unfinished topic with its top lecture video,
    progress %, and today's tasks from the database.
    Returns clean empty state if no active plan exists.
    """
    user_id = current_user.id if current_user else None
    return study_plan_service.get_dashboard(user_id=user_id, db=db)
