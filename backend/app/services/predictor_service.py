import os
import json
from pathlib import Path
import numpy as np
from typing import Optional, Dict, Any


def generate_study_reason(topic_type: str, subtopic_count: int, estimated_minutes: int) -> str:
    """Generate a clean, student-friendly one-line rationale for the study time."""
    hours = estimated_minutes / 60.0
    if topic_type == "lab-heavy":
        if subtopic_count >= 6:
            return f"Extensive implementation topic with {subtopic_count} subtopics and coding exercises; allow extra time for debugging."
        return "Hands-on programming and practical implementation; requires active computer work."
    elif topic_type == "numerical":
        if hours >= 3.0:
            return f"Problem-solving heavy with {subtopic_count} quantitative subtopics; requires working through practice examples."
        return "Mathematical and algorithmic techniques; requires focused step-by-step practice."
    else:  # theory
        if subtopic_count >= 6:
            return f"Broad theoretical coverage across {subtopic_count} concept areas; plan for spaced reading and notes review."
        elif hours <= 1.5:
            return "Foundational concepts; straightforward reading and quick conceptual check."
        else:
            return "Core conceptual principles; requires focused reading and synthesis."


class PredictorService:
    """
    Effort Prediction Service.
    Loads the trained ONNX model with onnxruntime for lightweight production inference,
    with graceful fallback to TorchScript and calibration heuristics.
    """
    def __init__(self):
        self.onnx_session = None
        self.onnx_input_name = None
        self.torch_model = None
        self.scaler_params: Optional[Dict[str, Any]] = None
        self.base_dir = Path(__file__).resolve().parent.parent.parent / "ml"
        self.weights_dir = self.base_dir / "weights"
        self._load_resources()

    def _load_resources(self):
        # 1. Load scaler parameters
        scaler_file = self.weights_dir / "scaler_params.json"
        if scaler_file.exists():
            try:
                with open(scaler_file, "r", encoding="utf-8") as f:
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
                "topic_types": ["theory", "numerical", "lab-heavy"],
            }

        # 2. Prefer ONNX model via onnxruntime for lean memory & fast inference
        onnx_file = self.weights_dir / "effort_predictor.onnx"
        if onnx_file.exists():
            try:
                import onnxruntime as ort
                self.onnx_session = ort.InferenceSession(str(onnx_file))
                self.onnx_input_name = self.onnx_session.get_inputs()[0].name
                print(f"[PredictorService] Successfully loaded ONNX model from {onnx_file}")
                return
            except Exception as e:
                print(f"[PredictorService] ONNX load failed ({e}), checking TorchScript...")

        # 3. Fallback to TorchScript if ONNX is unavailable
        pt_file = self.weights_dir / "effort_predictor.pt"
        if pt_file.exists():
            try:
                import torch
                self.torch_model = torch.jit.load(str(pt_file))
                self.torch_model.eval()
                print(f"[PredictorService] Successfully loaded TorchScript model from {pt_file}")
            except Exception as e:
                print(f"[PredictorService] TorchScript load failed ({e}), will use calibrated formula.")

    def predict(
        self,
        topic_name: str,
        subtopic_count: int,
        topic_type: str,
        desc_word_count: int
    ) -> Dict[str, Any]:
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

        # 1. Try ONNX runtime
        if self.onnx_session is not None and self.onnx_input_name is not None:
            try:
                input_tensor = features.reshape(1, 5)
                outputs = self.onnx_session.run(None, {self.onnx_input_name: input_tensor})
                predicted_hours = float(outputs[0][0][0])
            except Exception as e:
                print(f"[PredictorService] ONNX inference error: {e}")

        # 2. Try TorchScript
        if predicted_hours is None and self.torch_model is not None:
            try:
                import torch
                with torch.no_grad():
                    input_tensor = torch.tensor(features.reshape(1, 5), dtype=torch.float32)
                    raw_out = self.torch_model(input_tensor).item()
                    predicted_hours = float(raw_out)
            except Exception as e:
                print(f"[PredictorService] Torch inference error: {e}")

        # 3. High-precision fallback formula if model is not loaded
        if predicted_hours is None:
            type_multiplier = 0.85 if is_theory else (1.2 if is_numerical else 1.45)
            predicted_hours = (subtopic_count * 0.55 + desc_word_count * 0.035) * type_multiplier
            predicted_hours = max(0.5, predicted_hours)

        # Enforce reasonable bounds
        predicted_hours = round(max(0.4, min(16.0, predicted_hours)), 2)

        total_minutes = int(round(predicted_hours * 60))
        if total_minutes < 60:
            formatted_time = f"{total_minutes} min"
        else:
            hours = total_minutes // 60
            mins = total_minutes % 60
            formatted_time = f"{hours}h {mins}m" if mins > 0 else f"{hours}h"

        # Student simplified difficulty: easy | medium | hard
        if total_minutes <= 120:
            difficulty = "easy"
            difficulty_tier = "Easy"
        elif total_minutes <= 240:
            difficulty = "medium"
            difficulty_tier = "Medium"
        elif total_minutes <= 360:
            difficulty = "hard"
            difficulty_tier = "High"
        else:
            difficulty = "hard"
            difficulty_tier = "Challenging"

        reason = generate_study_reason(topic_type, subtopic_count, total_minutes)

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
            "estimated_minutes": total_minutes,
            "formatted_time": formatted_time,
            "difficulty": difficulty,
            "difficulty_tier": difficulty_tier,
            "reason": reason,
            "confidence_score": confidence_score,
        }


# Global singleton service
predictor_service = PredictorService()
