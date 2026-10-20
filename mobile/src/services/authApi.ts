import AsyncStorage from '@react-native-async-storage/async-storage';

// ALWAYS 127.0.0.1 per project rule. (On a physical device use the host LAN IP.)
export const API_BASE_URL = 'http://127.0.0.1:8000';
const TOKEN_KEY = 'studyforge_token';

export interface AuthUser {
  id: number;
  email: string;
  created_at: string;
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  } catch {
    /* ignore */
  }
  return fallback;
}

export async function signup(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE_URL}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Sign up failed. Please try again.'));
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

export async function login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Login failed. Please try again.'));
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

export async function getGoogleConfig(): Promise<{ google_enabled: boolean; google_client_id: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/config`);
  if (!res.ok) throw new Error(await parseError(res, 'Could not load Google sign-in.'));
  return res.json();
}

export async function googleLogin(credential: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) throw new Error(await parseError(res, 'Google sign-in failed. Please try again.'));
  const data = await res.json();
  return { token: data.access_token, user: data.user };
}

export async function fetchMe(): Promise<AuthUser | null> {
  const token = await getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await parseError(res, `Server returned ${res.status}`));
  return await res.json();
}
