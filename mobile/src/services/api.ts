export interface MobilePredictRequest {
  topic_name: string;
  subtopic_count: number;
  topic_type: 'theory' | 'numerical' | 'lab-heavy';
  desc_word_count: number;
}

export interface MobilePredictResponse {
  id?: number;
  topic_name: string;
  subtopic_count: number;
  topic_type: string;
  desc_word_count: number;
  predicted_hours: number;
  formatted_time: string;
  difficulty_tier: string;
  confidence_score: number;
}

export interface PredictionHistory {
  total: number;
  predictions: MobilePredictResponse[];
}

// ALWAYS 127.0.0.1 per project rule. (On a physical device use the host LAN IP.)
const API_BASE_URL = 'http://127.0.0.1:8000';

export async function predictTopicEffort(payload: MobilePredictRequest): Promise<MobilePredictResponse> {
  // No silent fake data — throws on failure so the screen shows a visible error.
  const response = await fetch(`${API_BASE_URL}/predict-effort`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `Server returned ${response.status}`;
    try {
      const data = await response.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return response.json();
}

export async function fetchPredictionHistory(): Promise<PredictionHistory> {
  const response = await fetch(`${API_BASE_URL}/predictions`);
  if (!response.ok) {
    let detail = `Server returned ${response.status}`;
    try { const data = await response.json(); if (data?.detail) detail = data.detail; } catch { /* surface fallback */ }
    throw new Error(detail);
  }
  return response.json();
}
