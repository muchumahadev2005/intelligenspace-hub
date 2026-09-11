/**
 * HTTP Client connecting the frontend to the Intelligenspace Hub backend.
 * Handles automatic JWT management, base URL resolution, and error handling.
 */

const API_BASE = (import.meta.env['VITE_API_URL'] as string) || 'http://localhost:3001/api/v1';
const TOKEN_STORAGE_KEY = 'intelligenspace_token';
const USER_STORAGE_KEY = 'intelligenspace_user';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredAuth(token: string, user: any) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the stored auth token, or empty string if none exists.
 */
export async function ensureToken(): Promise<string> {
  return getStoredToken() || '';
}

/**
 * Explicit one-click sign-in using demo administrator credentials.
 */
export async function loginWithDemoCredentials(): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@intelligenspace.io', password: 'demo1234' }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Failed to sign in with demo credentials' }));
    throw new Error(errData.error || 'Demo login failed');
  }
  const data = await res.json();
  setStoredAuth(data.token, data.user);
  return data;
}

/**
 * Generic API request wrapper with auth header injection.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await ensureToken();
  const headers = new Headers(options.headers || {});
  
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearStoredAuth();
  }

  if (!response.ok) {
    let errorMsg = `API Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    setStoredAuth(data.token, data.user);
    return data;
  },

  async register(name: string, email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    setStoredAuth(data.token, data.user);
    return data;
  },

  async me() {
    return apiRequest<{ id: string; name: string; email: string }>('/auth/me');
  },
};
