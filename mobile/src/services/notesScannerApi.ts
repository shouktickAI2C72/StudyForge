import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface MobileExtractedTopic {
  topic_name: string;
  subtopic_count: number;
  topic_type: string;
  desc_word_count: number;
  predicted_hours: number;
  formatted_time: string;
  difficulty_tier: string;
  confidence_score: number;
}

export interface MobileScanNotesResponse {
  status: string;
  filename: string;
  extracted_raw_text: string;
  total_topics_detected: number;
  total_estimated_hours: number;
  topics: MobileExtractedTopic[];
  cnn_backbone_metadata: {
    model_architecture: string;
    kernel_details: string;
    stride_details: string;
    padding_details: string;
    pooling_details: string;
  };
}

export interface PickedImage {
  uri: string;
  fileName?: string;
  mimeType?: string;
}

// ALWAYS 127.0.0.1 per project rule. (On a physical device use the host LAN IP.)
const API_BASE_URL = 'http://127.0.0.1:8000';

// Minimal valid 1x1 PNG — used only so "Try a sample" buttons can exercise the real
// /scan-notes endpoint (the backend keys sample extraction off the filename).
const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function postImage(uri: string, filename: string, mime: string): Promise<MobileScanNotesResponse> {
  const formData = new FormData();
  // React Native FormData accepts a { uri, name, type } file descriptor.
  formData.append('file', { uri, name: filename, type: mime } as any);

  const response = await fetch(`${API_BASE_URL}/scan-notes`, {
    method: 'POST',
    body: formData,
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

/**
 * Upload a REAL image (from camera or gallery) to /scan-notes.
 * Throws on failure — the screen surfaces a visible error. No silent fake data.
 */
export async function scanPickedImage(image: PickedImage): Promise<MobileScanNotesResponse> {
  const name = image.fileName || `notes_${Date.now()}.jpg`;
  const mime = image.mimeType || 'image/jpeg';
  return postImage(image.uri, name, mime);
}

/**
 * "Try a sample": writes a tiny valid PNG to cache with the sample's filename and
 * uploads it to the REAL endpoint (backend picks topics from the filename).
 */
export async function scanSample(filename: string): Promise<MobileScanNotesResponse> {
  if (Platform.OS === 'web') {
    const source = await fetch(`data:image/png;base64,${SAMPLE_PNG_BASE64}`);
    const blob = await source.blob();
    const formData = new FormData();
    formData.append('file', blob, filename);
    const response = await fetch(`${API_BASE_URL}/scan-notes`, { method: 'POST', body: formData });
    if (!response.ok) {
      let detail = `Server returned ${response.status}`;
      try { const data = await response.json(); if (data?.detail) detail = data.detail; } catch { /* surface fallback */ }
      throw new Error(detail);
    }
    return response.json();
  }
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, SAMPLE_PNG_BASE64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return postImage(path, filename, 'image/png');
}
