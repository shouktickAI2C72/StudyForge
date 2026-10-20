# StudyForge AI — Module 1: Topic Effort Predictor

StudyForge is a full-stack platform (Web + Mobile + FastAPI Backend + PyTorch ML) that turns syllabus content into personalized, adaptive study plans.

This repository implements **Module 1: Topic Effort Predictor**, which estimates the required study effort (in hours and formatted minutes) for syllabus topics based on subtopic depth, topic type (theory, numerical, lab-heavy), and description length using a PyTorch Multilayer Perceptron (MLP).

---

## Architecture Overview

```
StudyForge/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint with CORS
│   │   ├── database.py              # SQLite connection (SQLAlchemy) & SessionLocal
│   │   ├── models/                  # SQLAlchemy models (effort_predictions)
│   │   ├── schemas/                 # Pydantic v2 schemas (PredictRequest, PredictResponse)
│   │   ├── services/                # Predictor service with PyTorch & scaler inference
│   │   └── routers/                 # API routers (/predict-effort, /predictions, /health)
│   ├── ml/
│   │   ├── data/
│   │   │   └── syllabus_topics_dataset.csv  # 35 academic syllabus topics
│   │   ├── model.py                 # PyTorch EffortPredictor MLP (5 -> 16 -> 8 -> 1)
│   │   ├── compare_activations.py   # Validation loss comparison: ReLU vs Tanh vs LeakyReLU
│   │   ├── train.py                 # Training script exporting TorchScript & ONNX
│   │   └── weights/
│   │       ├── effort_predictor.pt   # TorchScript model for production inference
│   │       ├── effort_predictor.onnx # ONNX model for mobile / lightweight runtime
│   │       └── scaler_params.json   # Feature normalization statistics
│   ├── tests/
│   │   └── test_api.py              # Pytest suite for FastAPI endpoints & SQLite persistence
│   └── requirements.txt
├── web/                             # Next.js 14 Web Application
│   ├── app/
│   │   ├── layout.tsx               # Root layout with fonts & metadata
│   │   ├── globals.css              # Design tokens & glassmorphic styling
│   │   └── page.tsx                 # Landing + Interactive Next Best Action Focus Dashboard
│   ├── components/                  # Modular components from studyforge-index-v4-premium.html
│   │   ├── Navigation.tsx
│   │   ├── HeroSection.tsx          # 3D perspective dashboard tilt
│   │   ├── SyllabusTransform.tsx
│   │   ├── NextBestActionCard.tsx   # Live ML effort predictor integration & presets
│   │   ├── WeekStats.tsx
│   │   ├── AdaptiveSchedule.tsx     # Animated Monday Skipped schedule toggle
│   │   ├── WhyStudyForge.tsx
│   │   ├── FinalCta.tsx
│   │   ├── Footer.tsx
│   │   ├── DataFieldBackground.tsx  # Ambient floating nodes
│   │   └── ScrollProgress.tsx       # Top scroll gradient bar
│   └── hooks/
│       └── usePredictEffort.ts      # Live API synchronization hook
├── mobile/                          # React Native / Expo Application
│   ├── App.tsx                      # Mobile entry point
│   ├── src/
│   │   ├── screens/EffortPredictorScreen.tsx # Screen with dark glass UI & effort estimation
│   │   ├── components/              # GlassCard & GradientButton
│   │   ├── services/api.ts          # Mobile client for /predict-effort
│   │   └── theme/colors.ts          # Shared color palette
│   └── package.json
└── studyforge-index-v4-premium.html # Preserved original reference HTML
```

---

## 1. Machine Learning Model (`EffortPredictor`)

### Architecture
- **Input Dimension (5)**:
  1. `subtopic_count` (standardized)
  2. `is_theory` (one-hot flag)
  3. `is_numerical` (one-hot flag)
  4. `is_lab_heavy` (one-hot flag)
  5. `desc_word_count` (standardized)
- **Hidden Layers**:
  - `Linear(5, 16)` $\rightarrow$ `Activation` $\rightarrow$ `Linear(16, 8)` $\rightarrow$ `Activation` $\rightarrow$ `Linear(8, 1)`
- **Loss Function & Optimizer**: MSE Loss, Adam optimizer with weight decay ($10^{-4}$).

### Activation Function Comparison Experiment
Run the comparison script:
```bash
python backend/ml/compare_activations.py
```
**Results on Validation Set**:
| Activation | Train MSE | Val MSE | Val MAE (hours) | Min Val MSE | Best Epoch |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ReLU** (Recommended) | **0.0417** | **0.0644** | **0.2229 hrs (~13m)** | **0.0535** | 90 |
| **LeakyReLU** | 0.0245 | 0.0650 | 0.2339 hrs (~14m) | 0.0615 | 69 |
| **Tanh** | 0.0277 | 0.1569 | 0.3239 hrs (~19m) | 0.1569 | 300 |

### Model Training & Export
Run:
```bash
python backend/ml/train.py
```
Exports:
- `backend/ml/weights/effort_predictor.pt` (TorchScript)
- `backend/ml/weights/effort_predictor.onnx` (ONNX format)
- `backend/ml/weights/scaler_params.json` (Feature normalization means & standard deviations)

---

## 2. FastAPI Backend & Database

### Running the Backend
```bash
# From repository root
python -m uvicorn backend.app.main:app --reload --port 8000
```
Interactive Swagger Documentation: `http://localhost:8000/docs`

### API Endpoints
- `POST /predict-effort`: Accepts topic metadata JSON, computes PyTorch MLP inference, stores prediction in SQLite (`studyforge.db`), and returns estimated hours, difficulty tier, and confidence score.
- `GET /predictions`: Returns recent topic prediction history.
- `GET /health`: Health status.

### Running Backend Tests
```bash
python -m pytest backend/tests/test_api.py -v
```

---

## 3. Next.js 14 Web Frontend

### Running the Web App
```bash
cd web
npm install
npm run dev
```
Open `http://localhost:3000` to interact with the StudyForge landing page and live **Next Best Action** ML effort predictor card.

---

## 4. React Native Mobile App

### Running Mobile App
```bash
cd mobile
npm install
npx expo start
```
