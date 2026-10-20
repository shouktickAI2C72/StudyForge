import os
import json
import torch
import torch.nn as nn
import torch.optim as optim
import pandas as pd
import numpy as np
from pathlib import Path
import sys

base_dir = Path(__file__).resolve().parent
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

from model import EffortPredictor

def load_and_preprocess_data(csv_path: str):
    df = pd.read_csv(csv_path)
    
    # Feature extraction
    subtopic_count = df['subtopic_count'].values.astype(np.float32)
    desc_word_count = df['desc_word_count'].values.astype(np.float32)
    
    # One-hot encoding for topic_type: [theory, numerical, lab-heavy]
    is_theory = (df['topic_type'] == 'theory').astype(np.float32).values
    is_numerical = (df['topic_type'] == 'numerical').astype(np.float32).values
    is_lab_heavy = (df['topic_type'] == 'lab-heavy').astype(np.float32).values
    
    # Standardization parameters for numerical features
    subtopic_mean, subtopic_std = subtopic_count.mean(), subtopic_count.std() + 1e-6
    desc_mean, desc_std = desc_word_count.mean(), desc_word_count.std() + 1e-6
    
    norm_subtopic = (subtopic_count - subtopic_mean) / subtopic_std
    norm_desc = (desc_word_count - desc_mean) / desc_std
    
    X = np.stack([norm_subtopic, is_theory, is_numerical, is_lab_heavy, norm_desc], axis=1)
    y = df['effort_hours'].values.astype(np.float32).reshape(-1, 1)
    
    return X, y

def train_and_evaluate(activation: str, X_train, y_train, X_val, y_val, epochs=250, lr=0.01):
    torch.manual_seed(42)
    np.random.seed(42)
    
    model = EffortPredictor(input_dim=5, hidden1=16, hidden2=8, activation=activation)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    
    history = {'train_loss': [], 'val_loss': [], 'val_mae': []}
    
    X_train_t = torch.tensor(X_train, dtype=torch.float32)
    y_train_t = torch.tensor(y_train, dtype=torch.float32)
    X_val_t = torch.tensor(X_val, dtype=torch.float32)
    y_val_t = torch.tensor(y_val, dtype=torch.float32)
    
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        preds = model(X_train_t)
        loss = criterion(preds, y_train_t)
        loss.backward()
        optimizer.step()
        
        model.eval()
        with torch.no_grad():
            val_preds = model(X_val_t)
            val_loss = criterion(val_preds, y_val_t).item()
            val_mae = torch.mean(torch.abs(val_preds - y_val_t)).item()
            
        history['train_loss'].append(loss.item())
        history['val_loss'].append(val_loss)
        history['val_mae'].append(val_mae)
        
    return {
        'activation': activation,
        'final_train_loss': history['train_loss'][-1],
        'final_val_loss': history['val_loss'][-1],
        'final_val_mae': history['val_mae'][-1],
        'min_val_loss': min(history['val_loss']),
        'best_epoch': np.argmin(history['val_loss']) + 1
    }

def main():
    base_dir = Path(__file__).parent
    csv_path = base_dir / "data" / "syllabus_topics_dataset.csv"
    
    X, y = load_and_preprocess_data(str(csv_path))
    
    # Deterministic train/val split (80/20)
    np.random.seed(42)
    indices = np.random.permutation(len(X))
    split_idx = int(0.8 * len(X))
    train_idx, val_idx = indices[:split_idx], indices[split_idx:]
    
    X_train, y_train = X[train_idx], y[train_idx]
    X_val, y_val = X[val_idx], y[val_idx]
    
    print(f"Loaded dataset: {len(X)} samples. Train: {len(X_train)}, Val: {len(X_val)}")
    print("=" * 75)
    print("Comparing Activation Functions: ReLU vs Tanh vs LeakyReLU")
    print("=" * 75)
    
    activations = ["relu", "tanh", "leaky_relu"]
    results = []
    
    for act in activations:
        res = train_and_evaluate(act, X_train, y_train, X_val, y_val, epochs=300, lr=0.015)
        results.append(res)
        
    print(f"{'Activation':<14} | {'Train MSE':<12} | {'Val MSE':<12} | {'Val MAE (hrs)':<14} | {'Min Val MSE':<12} | {'Best Epoch'}")
    print("-" * 75)
    for r in results:
        print(f"{r['activation']:<14} | {r['final_train_loss']:<12.4f} | {r['final_val_loss']:<12.4f} | {r['final_val_mae']:<14.4f} | {r['min_val_loss']:<12.4f} | {r['best_epoch']}")
    print("=" * 75)
    
    best_act = min(results, key=lambda x: x['final_val_loss'])
    print(f"\nRecommended activation based on validation performance: {best_act['activation'].upper()} (Val MSE: {best_act['final_val_loss']:.4f}, Val MAE: {best_act['final_val_mae']:.4f} hrs)")

if __name__ == "__main__":
    main()
