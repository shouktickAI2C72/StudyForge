from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, ConfigDict

class TopicAdjustment(BaseModel):
    name: str
    day: str
    color: str
    topic_type: str
    subtopics: int
    desc_words: int
    original_hours: float
    original_minutes: int
    optimized_hours: float
    optimized_minutes: int
    delta_minutes: int

class OptimizerComparison(BaseModel):
    adam_loss: float
    rmsprop_loss: float
    winner: str
    summary: str

class InitComparison(BaseModel):
    xavier_loss_variance: float
    he_loss_variance: float
    winner: str
    summary: str

class RedistributionInfo(BaseModel):
    monday_skipped: bool
    monday_workload_minutes: int
    redistributed: Dict[str, int]

class ReoptimizeRequest(BaseModel):
    skipped_day: Optional[str] = Field(default="MON", description="Day skipped by student (e.g. MON)")
    force_retrain: Optional[bool] = Field(default=True, description="Whether to trigger full retraining or load v2 model")
    epochs: Optional[int] = Field(default=120, ge=20, le=500, description="Retraining epochs for mini-batch GD")

class ReoptimizeResponse(BaseModel):
    id: Optional[int] = None
    status: str
    model_version: str
    batch_size: int = 8
    dataset_size: int = 50
    feedback_rows_count: int = 15
    dropout_rate: float = 0.2
    optimizer_comparison: OptimizerComparison
    init_comparison: InitComparison
    total_original_hours: float
    total_optimized_hours: float
    total_original_minutes: int
    total_optimized_minutes: int
    reopt_banner_text: str
    redistribution: RedistributionInfo
    topic_adjustments: List[TopicAdjustment]
    created_at: Optional[datetime] = None

class ReoptimizeHistoryItem(BaseModel):
    id: int
    trigger_reason: str
    optimizer_winner: str
    adam_loss: float
    rmsprop_loss: float
    init_winner: str
    xavier_variance: float
    he_variance: float
    total_original_hours: float
    total_optimized_hours: float
    banner_text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ReoptimizeHistoryResponse(BaseModel):
    total: int
    records: List[ReoptimizeHistoryItem]
