import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional

# Ensure ml package path is resolved
ml_dir = Path(__file__).resolve().parent.parent.parent / "ml"
if str(ml_dir) not in sys.path:
    sys.path.insert(0, str(ml_dir))

from reoptimizer import run_reoptimization

class ReoptimizerService:
    def __init__(self):
        self._cached_result: Optional[Dict[str, Any]] = None

    def reoptimize(self, skipped_day: str = "MON", force_retrain: bool = True, epochs: int = 120) -> Dict[str, Any]:
        """
        Executes or retrieves the re-optimization routine.
        If force_retrain is True or no cached result exists, executes the PyTorch retraining pipeline.
        """
        if force_retrain or self._cached_result is None:
            # Run retraining with mini-batch GD (batch size 8), optimizer & init comparison
            result = run_reoptimization()
            self._cached_result = result
        else:
            result = self._cached_result

        return result

# Global singleton service
reoptimizer_service = ReoptimizerService()
