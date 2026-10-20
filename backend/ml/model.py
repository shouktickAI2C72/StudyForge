import torch
import torch.nn as nn
from typing import Literal

ActivationType = Literal["relu", "tanh", "leaky_relu"]

class EffortPredictor(nn.Module):
    """
    Multilayer Perceptron (MLP) for predicting study effort (estimated hours).
    
    Inputs (5 dimensions):
      0: subtopic_count (normalized)
      1: is_theory (one-hot, 0.0 or 1.0)
      2: is_numerical (one-hot, 0.0 or 1.0)
      3: is_lab_heavy (one-hot, 0.0 or 1.0)
      4: desc_word_count (normalized)
      
    Hidden Architecture:
      Linear(5 -> 16) -> Activation -> Linear(16 -> 8) -> Activation -> Linear(8 -> 1)
    """
    def __init__(self, input_dim: int = 5, hidden1: int = 16, hidden2: int = 8, activation: ActivationType = "relu"):
        super(EffortPredictor, self).__init__()
        
        self.fc1 = nn.Linear(input_dim, hidden1)
        self.fc2 = nn.Linear(hidden1, hidden2)
        self.fc3 = nn.Linear(hidden2, 1)
        
        if activation == "relu":
            self.act1 = nn.ReLU()
            self.act2 = nn.ReLU()
        elif activation == "tanh":
            self.act1 = nn.Tanh()
            self.act2 = nn.Tanh()
        elif activation == "leaky_relu":
            self.act1 = nn.LeakyReLU(negative_slope=0.1)
            self.act2 = nn.LeakyReLU(negative_slope=0.1)
        else:
            raise ValueError(f"Unsupported activation: {activation}. Choose 'relu', 'tanh', or 'leaky_relu'.")
            
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h1 = self.act1(self.fc1(x))
        h2 = self.act2(self.fc2(h1))
        out = self.fc3(h2)
        return out
