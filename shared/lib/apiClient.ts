// The backend is now a separately-deployed API server (see /backend).
// Both the frontend and admin apps use this to build absolute API URLs
// with automatic fallback to the live production API in cloud environments.
export function getApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    // If running in browser and hostname is not localhost, ignore any baked-in localhost URL
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return 'https://backend-seven-azure-96.vercel.app';
      }
    }
    return envUrl.replace(/\/+$/, '');
  }
  // Production fallback for Vercel / cloud deployments
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://backend-seven-azure-96.vercel.app';
  }
  return 'http://localhost:3000';
}

export const API_BASE_URL: string = getApiBaseUrl();

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), options);
}

const ACCESS_KEY = 'bizora_token';
const REFRESH_KEY = 'bizora_refresh_token';

export function getAccessToken(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(ACCESS_KEY) : null;
}

export function getRefreshToken(): string | null {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
}

/** Persist access + optional refresh. `token` alone still works (legacy). */
export function setAuthTokens(tokens: {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
}) {
  if (typeof localStorage === 'undefined') return;
  const access = tokens.accessToken || tokens.token;
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (tokens.refreshToken) localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearAuthTokens() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function hasAuthToken(): boolean {
  return !!getAccessToken();
}

let refreshInFlight: Promise<boolean> | null = null;

/** Try to rotate tokens using the stored refresh token. Returns true if a new access token was stored. */
export async function tryRefreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearAuthTokens();
        return false;
      }
      const body = await res.json();
      setAuthTokens(body);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// Same as apiFetch but attaches the Shop Owner JWT when present.
// On 401, attempts one refresh + retry (refresh-token rotation).
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const buildHeaders = () => {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  let res = await fetch(apiUrl(path), { ...options, headers: buildHeaders() });

  if (res.status === 401) {
    if (getRefreshToken()) {
      const ok = await tryRefreshAccessToken();
      if (ok) {
        res = await fetch(apiUrl(path), { ...options, headers: buildHeaders() });
      }
    } else {
      clearAuthTokens();
    }
  }

  return res;
}
