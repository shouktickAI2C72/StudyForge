const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Resolve the backend base URL. NEXT_PUBLIC_API_URL is baked in at build time
// on Vercel; locally the 127.0.0.1 fallback above is used.
function getApiBase(): string {
  if (typeof window === 'undefined') return API_BASE;
  const override = window.localStorage.getItem('studyforge_api_url');
  return override || API_BASE;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, headers: extraHeaders = {} } = opts;

  const headers: Record<string, string> = {
    ...extraHeaders,
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${getApiBase()}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

/* ─── Auth ─── */
export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthConfig {
  google_enabled: boolean;
  google_client_id: string | null;
}

export function signup(email: string, password: string) {
  return request<AuthResponse>('/signup', { method: 'POST', body: { email, password } });
}

export function login(email: string, password: string) {
  return request<AuthResponse>('/login', { method: 'POST', body: { email, password } });
}

export function googleLogin(credential: string) {
  return request<AuthResponse>('/auth/google', { method: 'POST', body: { credential } });
}

export function getAuthConfig() {
  return request<AuthConfig>('/auth/config');
}

export function getMe(token: string) {
  return request<User>('/me', { token });
}

/* ─── Effort Predictor ─── */
export interface PredictRequest {
  topic_name: string;
  subtopic_count: number;
  topic_type: string;
  desc_word_count: number;
}

export interface PredictResponse {
  id: number;
  topic_name: string;
  subtopic_count: number;
  topic_type: string;
  desc_word_count: number;
  predicted_hours: number;
  formatted_time: string;
  difficulty_tier: string;
  confidence_score: number;
  created_at: string;
}

export interface HistoryResponse {
  total: number;
  predictions: PredictResponse[];
}

export function predictEffort(data: PredictRequest) {
  return request<PredictResponse>('/predict-effort', { method: 'POST', body: data });
}

export function getPredictions(limit = 20) {
  return request<HistoryResponse>(`/predictions?limit=${limit}`);
}

/* ─── Re-Optimizer ─── */
export interface ReoptimizeRequest {
  skipped_day?: string;
  force_retrain?: boolean;
  epochs?: number;
}

export interface TopicAdjustment {
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

export interface ReoptimizeResponse {
  id: number;
  status: string;
  model_version: string;
  batch_size: number;
  dataset_size: number;
  feedback_rows_count: number;
  dropout_rate: number;
  optimizer_comparison: {
    adam_loss: number;
    rmsprop_loss: number;
    winner: string;
    summary: string;
  };
  init_comparison: {
    xavier_loss_variance: number;
    he_loss_variance: number;
    winner: string;
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
    redistributed: Record<string, number>;
  };
  topic_adjustments: TopicAdjustment[];
  created_at: string;
}

export function reoptimizeSchedule(data?: ReoptimizeRequest) {
  return request<ReoptimizeResponse>('/reoptimize-schedule', { method: 'POST', body: data || {} });
}

/* ─── Notes Scanner ─── */
export interface ScanTopic {
  topic_name: string;
  subtopic_count: number;
  topic_type: string;
  desc_word_count: number;
  predicted_hours: number;
  formatted_time: string;
  difficulty_tier: string;
  confidence_score: number;
}

export interface ScanResponse {
  status: string;
  filename: string;
  extraction_method: string;
  extracted_raw_text: string;
  total_topics_detected: number;
  total_estimated_hours: number;
  topics: ScanTopic[];
  cnn_backbone_metadata: {
    model_architecture: string;
    kernel_details: string;
    stride_details: string;
    padding_details: string;
    pooling_details: string;
  };
}

/* ─── YouTube Lecture Finder ─── */
export interface TopicVideo {
  video_id: string;
  title: string;
  channel_name: string;
  thumbnail_url: string;
  duration: string;
}

export interface TopicVideosResponse {
  topic: string;
  videos: TopicVideo[];
  cached: boolean;
}

export async function getTopicVideos(topic: string): Promise<TopicVideosResponse> {
  return request<TopicVideosResponse>(`/topic-videos?topic=${encodeURIComponent(topic)}`);
}

export async function scanNotes(file: File): Promise<ScanResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${getApiBase()}/scan-notes`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Upload failed: ${res.status}`);
  }

  return res.json();
}

/* ─── Health ─── */
export function getHealth() {
  return request<{ status: string }>('/health');
}
