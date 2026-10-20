export interface MobileTopicAdjustment {
  name: string;
  day: string;
  color: string;
  topic_type: string;
  subtopics: number;
  desc_words: number;
  original_hours: number;
  original_minutes: number;
  optimized_hours: number;
  optimized_minutes: number;
  delta_minutes: number;
}

export interface MobileReoptimizeResponse {
  id?: number;
  status: string;
  model_version: string;
  batch_size: number;
  dataset_size: number;
  feedback_rows_count: number;
  dropout_rate: number;
  optimizer_comparison: {
    winner: string;
    adam_loss: number;
    rmsprop_loss: number;
    summary: string;
  };
  init_comparison: {
    winner: string;
    xavier_loss_variance: number;
    he_loss_variance: number;
    summary: string;
  };
  total_original_hours: number;
  total_optimized_hours: number;
  total_original_minutes: number;
  total_optimized_minutes: number;
  reopt_banner_text: string;
  redistribution: {
    monday_skipped: boolean;
    monday_workload_minutes: number;
    redistributed: {
      TUE: number;
      WED: number;
      THU: number;
      FRI: number;
    };
  };
  topic_adjustments: MobileTopicAdjustment[];
}

// Use the mandated loopback address for every backend request.
const API_BASE_URL = 'http://127.0.0.1:8000';

export async function fetchReoptimizeSchedule(skippedDay: string = 'MON'): Promise<MobileReoptimizeResponse> {
  // No silent fake data — throws on failure so the screen shows a visible error.
  const response = await fetch(`${API_BASE_URL}/reoptimize-schedule`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      skipped_day: skippedDay,
      force_retrain: false,
      epochs: 80,
    }),
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
