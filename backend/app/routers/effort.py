from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.effort_prediction import EffortPrediction
from ..schemas.effort import PredictRequest, PredictResponse, HistoryResponse
from ..services.predictor_service import predictor_service

router = APIRouter(tags=["Effort Predictor"])

@router.post("/predict-effort", response_model=PredictResponse, status_code=status.HTTP_201_CREATED)
def predict_effort(request: PredictRequest, db: Session = Depends(get_db)):
    """
    Predict study effort hours for a syllabus topic using PyTorch MLP.
    Saves the prediction record into the SQLite database.
    """
    try:
        result = predictor_service.predict(
            topic_name=request.topic_name,
            subtopic_count=request.subtopic_count,
            topic_type=request.topic_type,
            desc_word_count=request.desc_word_count
        )

        db_record = EffortPrediction(
            topic_name=result["topic_name"],
            subtopic_count=result["subtopic_count"],
            topic_type=result["topic_type"],
            desc_word_count=result["desc_word_count"],
            predicted_hours=result["predicted_hours"],
            difficulty_tier=result["difficulty_tier"],
            confidence_score=result["confidence_score"]
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)

        return PredictResponse(
            id=db_record.id,
            topic_name=db_record.topic_name,
            subtopic_count=db_record.subtopic_count,
            topic_type=db_record.topic_type,
            desc_word_count=db_record.desc_word_count,
            predicted_hours=db_record.predicted_hours,
            formatted_time=result["formatted_time"],
            difficulty_tier=db_record.difficulty_tier,
            confidence_score=db_record.confidence_score,
            created_at=db_record.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process effort prediction: {str(e)}"
        )

@router.get("/predictions", response_model=HistoryResponse)
def get_predictions(limit: int = 20, db: Session = Depends(get_db)):
    """
    Retrieve recent topic effort predictions from the SQLite database.
    """
    records = db.query(EffortPrediction).order_by(EffortPrediction.id.desc()).limit(limit).all()
    
    formatted_list = []
    for r in records:
        mins = int(round(r.predicted_hours * 60))
        if mins < 60:
            f_time = f"{mins} min"
        else:
            h = mins // 60
            m = mins % 60
            f_time = f"{h}h {m}m" if m > 0 else f"{h}h"
            
        formatted_list.append(PredictResponse(
            id=r.id,
            topic_name=r.topic_name,
            subtopic_count=r.subtopic_count,
            topic_type=r.topic_type,
            desc_word_count=r.desc_word_count,
            predicted_hours=r.predicted_hours,
            formatted_time=f_time,
            difficulty_tier=r.difficulty_tier,
            confidence_score=r.confidence_score,
            created_at=r.created_at
        ))
        
    return HistoryResponse(total=len(formatted_list), predictions=formatted_list)

@router.get("/health")
def health_check():
    """
    Health check endpoint for API and system status.
    """
    return {
        "status": "online",
        "service": "StudyForge AI Backend",
        "module": "Module 1 - Topic Effort Predictor",
        "version": "1.0.0"
    }
