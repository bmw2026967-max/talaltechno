export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
export const TOKEN_KEY = 'talaltechno_token';
export const USER_KEY = 'talaltechno_user';

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function setUser(user: unknown) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser<T = Record<string, unknown>>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {})
    },
    cache: 'no-store'
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && (Array.isArray(body.message) ? body.message.join('، ') : body.message);
    throw new Error(message || `HTTP ${response.status}`);
  }
  return body as T;
}

export function apiGet<T>(path: string) {
  return request<T>(path);
}

export function apiPost<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function login(email: string, password: string) {
  const result = await request<{ data: { accessToken: string; user: unknown } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setToken(result.data.accessToken);
  setUser(result.data.user);
  return result.data;
}
