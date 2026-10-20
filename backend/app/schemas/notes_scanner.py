from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class ExtractedTopicItem(BaseModel):
    topic_name: str
    subtopic_count: int
    topic_type: str
    desc_word_count: int
    predicted_hours: float
    formatted_time: str
    difficulty_tier: str
    confidence_score: float

    model_config = ConfigDict(from_attributes=True)

class CNNBackboneMetadata(BaseModel):
    model_architecture: str = Field(..., description="Name of the CNN-RNN transfer-learning architecture")
    kernel_details: str = Field(..., description="Function of 3x3 convolution kernels in feature extraction")
    stride_details: str = Field(..., description="Function of Stride=1 in feature preservation")
    padding_details: str = Field(..., description="Function of Padding=1 in boundary preservation")
    pooling_details: str = Field(..., description="Function of asymmetric MaxPool2d in height-collapsing & sequence conversion")

class ScanNotesResponse(BaseModel):
    status: str
    filename: str
    extraction_method: str = "text"
    extracted_raw_text: str
    total_topics_detected: int
    total_estimated_hours: float
    topics: List[ExtractedTopicItem]
    cnn_backbone_metadata: CNNBackboneMetadata

    model_config = ConfigDict(from_attributes=True)
