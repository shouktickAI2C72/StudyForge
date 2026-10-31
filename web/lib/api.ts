const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// Resolve the backend base URL. NEXT_PUBLIC_API_URL is baked in at build time
// on Vercel; locally the 127.0.0.1 fallback above is used.
export function getApiBase(): string {
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

export interface AuthProviders {
  google: boolean;
  google_client_id: string | null;
  email_password: boolean;
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

export function getAuthProviders() {
  return request<AuthProviders>('/auth/providers');
}

export function getMe(token: string) {
  return request<User>('/me', { token });
}

/* ─── YouTube Video ─── */
export interface TopicVideo {
  video_id: string;
  title: string;
  channel?: string;
  channel_name: string;
  thumbnail?: string;
  thumbnail_url: string;
  duration_seconds?: number;
  duration: string;
  url?: string;
  watch_url?: string;
  embed_url: string;
}

export interface TopicVideosResponse {
  topic: string;
  course?: string;
  videos: TopicVideo[];
  status?: string;
  cached: boolean;
  cache_age_days?: number;
  cache_label?: string;
  fallback_search_url?: string;
  message?: string;
}

export function getTopicVideos(topic: string): Promise<TopicVideosResponse> {
  return request<TopicVideosResponse>(`/topic-videos?topic=${encodeURIComponent(topic)}`);
}

export function getTopicVideosById(topicId: number): Promise<TopicVideosResponse> {
  return request<TopicVideosResponse>(`/topics/${topicId}/videos`);
}

/* ─── Syllabus Intake & Topics ─── */
export interface TopicResponse {
  id: number;
  title: string;
  subtopics: string[];
  subtopic_count: number;
  word_count: number;
  kind: 'theory' | 'numerical' | 'lab-heavy';
  estimated_minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  reason: string;
  videos_status: string;
  top_video?: TopicVideo | null;
  order_index: number;
  done: boolean;
}

export interface SyllabusResponse {
  syllabus_id: number;
  course_name: string;
  filename: string;
  is_sample: boolean;
  warning?: string | null;
  total_topics: number;
  total_estimated_minutes: number;
  topics: TopicResponse[];
}

export async function uploadSyllabus(file: File, token?: string | null): Promise<SyllabusResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${getApiBase()}/syllabus/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Upload failed: ${res.status}`);
  }

  return res.json();
}

export function getSampleSyllabus(token?: string | null): Promise<SyllabusResponse> {
  return request<SyllabusResponse>('/syllabus/sample', { method: 'POST', token });
}

export function updateTopicProgress(topicId: number, done: boolean): Promise<TopicResponse> {
  return request<TopicResponse>(`/topics/${topicId}/progress`, {
    method: 'PATCH',
    body: { done },
  });
}

/* ─── Weekly Plan & Missed Day ─── */
export interface PlanCreateRequest {
  start_date?: string;
  hours_per_day?: number;
  study_days?: string[];
  exam_date?: string;
}

export interface PlanItemResponse {
  id: number;
  plan_id: number;
  topic_id?: number | null;
  topic_title?: string | null;
  date: string;
  day_of_week: string;
  minutes: number;
  done: boolean;
  is_review: boolean;
  notes: string;
  top_video?: TopicVideo | null;
}

export interface PlanResponse {
  id: number;
  syllabus_id?: number | null;
  course_name?: string | null;
  start_date: string;
  hours_per_day: number;
  study_days: string[];
  exam_date?: string | null;
  total_minutes: number;
  completed_minutes: number;
  progress_percent: number;
  items: PlanItemResponse[];
}

export interface MissedDayResponse {
  plan_id: number;
  missed_date: string;
  missed_minutes: number;
  explanation: string;
  before_daily_minutes: Record<string, number>;
  after_daily_minutes: Record<string, number>;
  items: PlanItemResponse[];
}

export function createPlan(syllabusId: number, data: PlanCreateRequest, token?: string | null): Promise<PlanResponse> {
  return request<PlanResponse>(`/syllabus/${syllabusId}/plan`, {
    method: 'POST',
    body: data,
    token,
  });
}

export function rebalanceMissedDay(planId: number, date: string): Promise<MissedDayResponse> {
  return request<MissedDayResponse>(`/plan/${planId}/missed-day`, {
    method: 'POST',
    body: { date },
  });
}

/* ─── Dashboard ─── */
export interface DashboardResponse {
  has_plan: boolean;
  course_name?: string | null;
  next_topic?: {
    id: number;
    title: string;
    difficulty: string;
    estimated_minutes: number;
    formatted_time: string;
    reason: string;
    date: string;
    top_video?: TopicVideo | null;
  } | null;
  today_tasks: PlanItemResponse[];
  progress_percent: number;
  total_topics: number;
  completed_topics: number;
  total_minutes: number;
  completed_minutes: number;
}

export function getDashboard(token?: string | null): Promise<DashboardResponse> {
  return request<DashboardResponse>('/dashboard', { token });
}

/* ─── Effort Predictor (Backward Compatibility) ─── */
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

/* ─── Re-Optimizer (Backward Compatibility) ─── */
export interface ReoptimizeRequest {
  skipped_day?: string;
  force_retrain?: boolean;
  epochs?: number;
}

export interface TopicAdjustment {
  name: string;
  day: string;
  topic_type: string;
  subtopics: number;
  original_hours: number;
  optimized_hours: number;
  original_minutes: number;
  optimized_minutes: number;
  delta_minutes: number;
}

export interface ReoptimizeResponse {
  id: number;
  status: string;
  model_version: string;
  total_original_hours: number;
  total_optimized_hours: number;
  reopt_banner_text: string;
  redistribution: {
    monday_skipped: boolean;
    monday_workload_minutes: number;
    redistributed: Record<string, number>;
  };
  topic_adjustments: TopicAdjustment[];
}

export function reoptimizeSchedule(data?: ReoptimizeRequest) {
  return request<ReoptimizeResponse>('/reoptimize-schedule', { method: 'POST', body: data || {} });
}


/* ─── Health ─── */
export function getHealth() {
  return request<{ status: string }>('/health');
}
