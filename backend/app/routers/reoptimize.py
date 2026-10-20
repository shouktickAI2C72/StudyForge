import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models.schedule_reoptimization import ScheduleReoptimization
from ..schemas.reoptimization import (
    ReoptimizeRequest,
    ReoptimizeResponse,
    ReoptimizeHistoryResponse,
    ReoptimizeHistoryItem,
    OptimizerComparison,
    InitComparison,
    RedistributionInfo,
    TopicAdjustment
)
from ..services.reoptimizer_service import reoptimizer_service

router = APIRouter(tags=["Schedule Re-Optimizer"])

@router.post("/reoptimize-schedule", response_model=ReoptimizeResponse, status_code=status.HTTP_200_OK)
def reoptimize_schedule(request: Optional[ReoptimizeRequest] = None, db: Session = Depends(get_db)):
    """
    Module 2 Endpoint: Triggers ML model retraining with simulated feedback,
    compares Adam vs RMSprop and Xavier vs He init, generates re-optimized
    topic effort predictions, and rebalances the weekly schedule.
    Saves run history to the SQLite database.
    """
    req_body = request or ReoptimizeRequest()
    try:
        # Trigger re-optimization ML pipeline
        result = reoptimizer_service.reoptimize(
            skipped_day=req_body.skipped_day or "MON",
            force_retrain=req_body.force_retrain if req_body.force_retrain is not None else True,
            epochs=req_body.epochs or 120
        )

        # Store in SQLite schedule_reoptimizations table
        db_record = ScheduleReoptimization(
            trigger_reason=f"{req_body.skipped_day or 'MON'}_skipped",
            optimizer_winner=result["optimizer_comparison"]["winner"],
            adam_loss=result["optimizer_comparison"]["adam_loss"],
            rmsprop_loss=result["optimizer_comparison"]["rmsprop_loss"],
            init_winner=result["init_comparison"]["winner"],
            xavier_variance=result["init_comparison"]["xavier_loss_variance"],
            he_variance=result["init_comparison"]["he_loss_variance"],
            total_original_hours=result["total_original_hours"],
            total_optimized_hours=result["total_optimized_hours"],
            banner_text=result["reopt_banner_text"],
            details_json=json.dumps({
                "redistribution": result["redistribution"],
                "topic_adjustments": result["topic_adjustments"],
                "optimizer_summary": result["optimizer_comparison"]["summary"],
                "init_summary": result["init_comparison"]["summary"]
            })
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)

        # Build response schema
        return ReoptimizeResponse(
            id=db_record.id,
            status="reoptimized",
            model_version=result["model_version"],
            batch_size=result["batch_size"],
            dataset_size=result["dataset_size"],
            feedback_rows_count=result["feedback_rows_count"],
            dropout_rate=result["dropout_rate"],
            optimizer_comparison=OptimizerComparison(**result["optimizer_comparison"]),
            init_comparison=InitComparison(**result["init_comparison"]),
            total_original_hours=result["total_original_hours"],
            total_optimized_hours=result["total_optimized_hours"],
            total_original_minutes=result["total_original_minutes"],
            total_optimized_minutes=result["total_optimized_minutes"],
            reopt_banner_text=result["reopt_banner_text"],
            redistribution=RedistributionInfo(**result["redistribution"]),
            topic_adjustments=[TopicAdjustment(**t) for t in result["topic_adjustments"]],
            created_at=db_record.created_at
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Re-optimization pipeline failed: {str(e)}"
        )


@router.get("/reoptimizations", response_model=ReoptimizeHistoryResponse)
def get_reoptimization_history(limit: int = 10, db: Session = Depends(get_db)):
    """
    Retrieves logged history of study plan re-optimizations from SQLite.
    """
    records = (
        db.query(ScheduleReoptimization)
        .order_by(ScheduleReoptimization.id.desc())
        .limit(limit)
        .all()
    )

    items = [
        ReoptimizeHistoryItem(
            id=r.id,
            trigger_reason=r.trigger_reason,
            optimizer_winner=r.optimizer_winner,
            adam_loss=r.adam_loss,
            rmsprop_loss=r.rmsprop_loss,
            init_winner=r.init_winner,
            xavier_variance=r.xavier_variance,
            he_variance=r.he_variance,
            total_original_hours=r.total_original_hours,
            total_optimized_hours=r.total_optimized_hours,
            banner_text=r.banner_text,
            created_at=r.created_at
        )
        for r in records
    ]

    return ReoptimizeHistoryResponse(total=len(items), records=items)
