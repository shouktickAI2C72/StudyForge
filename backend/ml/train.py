import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
from pathlib import Path
import sys

# Ensure UTF-8 output encoding on Windows to prevent UnicodeEncodeError in torch.onnx
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

base_dir = Path(__file__).resolve().parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from model import EffortPredictor

def main():
    base_dir = Path(__file__).parent
    data_path = base_dir / "data" / "syllabus_topics_dataset.csv"
    weights_dir = base_dir / "weights"
    weights_dir.mkdir(exist_ok=True)
    
    df = pd.read_csv(data_path)
    print(f"Loaded {len(df)} syllabus topics from {data_path.name}")
    
    # Feature extraction
    subtopic_count = df['subtopic_count'].values.astype(np.float32)
    desc_word_count = df['desc_word_count'].values.astype(np.float32)
    
    # One-hot encoding for topic_type: [theory, numerical, lab-heavy]
    is_theory = (df['topic_type'] == 'theory').astype(np.float32).values
    is_numerical = (df['topic_type'] == 'numerical').astype(np.float32).values
    is_lab_heavy = (df['topic_type'] == 'lab-heavy').astype(np.float32).values
    
    # Save scaling parameters for backend inference
    subtopic_mean = float(subtopic_count.mean())
    subtopic_std = float(subtopic_count.std() + 1e-6)
    desc_mean = float(desc_word_count.mean())
    desc_std = float(desc_word_count.std() + 1e-6)
    
    scaler_params = {
        "subtopic_mean": subtopic_mean,
        "subtopic_std": subtopic_std,
        "desc_mean": desc_mean,
        "desc_std": desc_std,
        "topic_types": ["theory", "numerical", "lab-heavy"],
        "input_dim": 5,
        "hidden_layers": [16, 8]
    }
    
    with open(weights_dir / "scaler_params.json", "w") as f:
        json.dump(scaler_params, f, indent=2)
    print(f"Saved scaler parameters to {weights_dir / 'scaler_params.json'}")
    
    norm_subtopic = (subtopic_count - subtopic_mean) / subtopic_std
    norm_desc = (desc_word_count - desc_mean) / desc_std
    
    X = np.stack([norm_subtopic, is_theory, is_numerical, is_lab_heavy, norm_desc], axis=1)
    y = df['effort_hours'].values.astype(np.float32).reshape(-1, 1)
    
    torch.manual_seed(42)
    np.random.seed(42)
    
    X_tensor = torch.tensor(X, dtype=torch.float32)
    y_tensor = torch.tensor(y, dtype=torch.float32)
    
    # Instantiate EffortPredictor MLP
    model = EffortPredictor(input_dim=5, hidden1=16, hidden2=8, activation="relu")
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.015, weight_decay=1e-4)
    
    epochs = 350
    print(f"Training EffortPredictor MLP for {epochs} epochs with Adam optimizer...")
    for epoch in range(1, epochs + 1):
        model.train()
        optimizer.zero_grad()
        preds = model(X_tensor)
        loss = criterion(preds, y_tensor)
        loss.backward()
        optimizer.step()
        
        if epoch % 50 == 0 or epoch == epochs:
            mae = torch.mean(torch.abs(preds - y_tensor)).item()
            print(f"Epoch {epoch:3d}/{epochs} - MSE Loss: {loss.item():.4f} - MAE: {mae:.4f} hours")
            
    # Evaluation
    model.eval()
    with torch.no_grad():
        final_preds = model(X_tensor)
        final_mse = criterion(final_preds, y_tensor).item()
        final_mae = torch.mean(torch.abs(final_preds - y_tensor)).item()
    print(f"\nFinal Model Performance: MSE = {final_mse:.4f}, MAE = {final_mae:.4f} hours")
    
    # 1. Export state dict & TorchScript
    model_scripted = torch.jit.script(model)
    pt_path = weights_dir / "effort_predictor.pt"
    model_scripted.save(str(pt_path))
    print(f"Saved TorchScript model to {pt_path}")
    
    # 2. Export ONNX for mobile / lightweight inference
    onnx_path = weights_dir / "effort_predictor.onnx"
    dummy_input = torch.randn(1, 5, dtype=torch.float32)
    torch.onnx.export(
        model,
        dummy_input,
        str(onnx_path),
        export_params=True,
        opset_version=18,
        do_constant_folding=True,
        input_names=['input_features'],
        output_names=['predicted_effort_hours'],
        dynamic_axes={'input_features': {0: 'batch_size'}, 'predicted_effort_hours': {0: 'batch_size'}},
        dynamo=False
    )
    print(f"Saved ONNX model to {onnx_path}")
    
    # Verification test
    sample_raw = np.array([4.0, 1.0, 0.0, 0.0, 45.0], dtype=np.float32)
    sample_norm = sample_raw.copy()
    sample_norm[0] = (sample_raw[0] - subtopic_mean) / subtopic_std
    sample_norm[4] = (sample_raw[4] - desc_mean) / desc_std
    test_tensor = torch.tensor(sample_norm.reshape(1, 5), dtype=torch.float32)
    
    with torch.no_grad():
        sample_pred = model(test_tensor).item()
    print(f"\nSample Prediction Verification:")
    print(f"Input: Subtopics=4, Type=theory, DescWords=45 -> Predicted Effort: {sample_pred:.2f} hours (~{int(sample_pred*60)} minutes)")

if __name__ == "__main__":
    main()
