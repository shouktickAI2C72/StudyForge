export interface MobileTopicVideo {
  video_id: string;
  title: string;
  channel_name: string;
  thumbnail_url: string;
  duration: string;
}

export interface MobileTopicVideosResponse {
  topic: string;
  videos: MobileTopicVideo[];
  cached: boolean;
}

// ALWAYS 127.0.0.1 per project rule.
const API_BASE_URL = 'http://127.0.0.1:8000';

export async function fetchTopicVideos(topic: string): Promise<MobileTopicVideosResponse> {
  const response = await fetch(`${API_BASE_URL}/topic-videos?topic=${encodeURIComponent(topic)}`);
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
