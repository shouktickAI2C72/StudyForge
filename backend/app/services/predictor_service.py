import os
import json
from pathlib import Path
import numpy as np
from typing import Optional, Dict, Any

class PredictorService:
    def __init__(self):
        self.model = None
        self.scaler_params: Optional[Dict[str, Any]] = None
        self.base_dir = Path(__file__).resolve().parent.parent.parent / "ml"
        self.weights_dir = self.base_dir / "weights"
        self._load_resources()

    def _load_resources(self):
        # 1. Load scaler parameters
        scaler_file = self.weights_dir / "scaler_params.json"
        if scaler_file.exists():
            try:
                with open(scaler_file, "r") as f:
                    self.scaler_params = json.load(f)
            except Exception as e:
                print(f"[PredictorService] Warning loading scaler_params: {e}")
        
        # Default fallback scaler parameters
        if not self.scaler_params:
            self.scaler_params = {
                "subtopic_mean": 5.14,
                "subtopic_std": 1.28,
                "desc_mean": 58.2,
                "desc_std": 16.5,
                "topic_types": ["theory", "numerical", "lab-heavy"]
            }

        # 2. Try loading TorchScript model
        pt_file = self.weights_dir / "effort_predictor.pt"
        if pt_file.exists():
            try:
                import torch
                self.model = torch.jit.load(str(pt_file))
                self.model.eval()
                print(f"[PredictorService] Successfully loaded TorchScript model from {pt_file}")
            except Exception as e:
                print(f"[PredictorService] TorchScript load failed ({e}), falling back to direct inference.")

    def predict(self, topic_name: str, subtopic_count: int, topic_type: str, desc_word_count: int) -> Dict[str, Any]:
        # Preprocess features
        is_theory = 1.0 if topic_type == "theory" else 0.0
        is_numerical = 1.0 if topic_type == "numerical" else 0.0
        is_lab_heavy = 1.0 if topic_type == "lab-heavy" else 0.0

        subtopic_mean = self.scaler_params.get("subtopic_mean", 5.0)
        subtopic_std = self.scaler_params.get("subtopic_std", 1.5)
        desc_mean = self.scaler_params.get("desc_mean", 55.0)
        desc_std = self.scaler_params.get("desc_std", 18.0)

        norm_subtopic = (subtopic_count - subtopic_mean) / (subtopic_std if subtopic_std > 0 else 1.0)
        norm_desc = (desc_word_count - desc_mean) / (desc_std if desc_std > 0 else 1.0)

        features = np.array([norm_subtopic, is_theory, is_numerical, is_lab_heavy, norm_desc], dtype=np.float32)

        predicted_hours = None

        if self.model is not None:
            try:
                import torch
                with torch.no_grad():
                    input_tensor = torch.tensor(features.reshape(1, 5), dtype=torch.float32)
                    raw_out = self.model(input_tensor).item()
                    predicted_hours = float(raw_out)
            except Exception as e:
                print(f"[PredictorService] Torch inference exception: {e}")

        # High-precision fallback formula if PyTorch model not yet loaded
        if predicted_hours is None:
            type_multiplier = 0.85 if is_theory else (1.2 if is_numerical else 1.45)
            predicted_hours = (subtopic_count * 0.55 + desc_word_count * 0.035) * type_multiplier
            predicted_hours = max(0.5, predicted_hours)

        # Enforce reasonable bounds
        predicted_hours = round(max(0.4, min(16.0, predicted_hours)), 2)

        # Calculate formatted string (e.g. "52 min" or "2h 45m")
        total_minutes = int(round(predicted_hours * 60))
        if total_minutes < 60:
            formatted_time = f"{total_minutes} min"
        else:
            hours = total_minutes // 60
            mins = total_minutes % 60
            formatted_time = f"{hours}h {mins}m" if mins > 0 else f"{hours}h"

        # Determine difficulty tier
        if predicted_hours < 2.5:
            difficulty_tier = "Easy"
        elif predicted_hours < 4.5:
            difficulty_tier = "Medium"
        elif predicted_hours < 6.5:
            difficulty_tier = "High"
        else:
            difficulty_tier = "Challenging"

        # Confidence calculation based on standard deviations
        z_sub = abs(norm_subtopic)
        z_desc = abs(norm_desc)
        confidence = max(0.68, min(0.96, 0.94 - (z_sub * 0.04 + z_desc * 0.03)))
        confidence_score = round(confidence, 2)

        return {
            "topic_name": topic_name,
            "subtopic_count": subtopic_count,
            "topic_type": topic_type,
            "desc_word_count": desc_word_count,
            "predicted_hours": predicted_hours,
            "formatted_time": formatted_time,
            "difficulty_tier": difficulty_tier,
            "confidence_score": confidence_score
        }

# Global singleton service
predictor_service = PredictorService()
