// src/lib/api-client.ts
// Browser-side API client. Auto-attaches Bearer token, handles refresh, returns parsed JSON.

'use client';

const TOKEN_KEY = 'fd_access_token';
const REFRESH_KEY = 'fd_refresh_token';

export function getAccessToken(): string | null {
 if (typeof window === 'undefined') return null;
 return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
 if (typeof window === 'undefined') return null;
 return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
 if (typeof window === 'undefined') return;
 localStorage.setItem(TOKEN_KEY, access);
 localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
 if (typeof window === 'undefined') return;
 localStorage.removeItem(TOKEN_KEY);
 localStorage.removeItem(REFRESH_KEY);
}

interface ApiSuccess<T> { success: true; data: T }
interface ApiFailure { success: false; error: { code: string; message: string; details?: unknown } }
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
 if (isRefreshing && refreshPromise) return refreshPromise;
 const refreshToken = getRefreshToken();
 if (!refreshToken) return null;
 isRefreshing = true;
 refreshPromise = (async () => {
 try {
 const res = await fetch('/api/v1/auth/refresh', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ refreshToken }),
 });
 if (!res.ok) {
 clearTokens();
 return null;
 }
 const json = await res.json();
 if (!json.success) {
 clearTokens();
 return null;
 }
 setTokens(json.data.accessToken, json.data.refreshToken);
 return json.data.accessToken;
 } catch {
 clearTokens();
 return null;
 } finally {
 isRefreshing = false;
 refreshPromise = null;
 }
 })();
 return refreshPromise;
}

export class ApiError extends Error {
 code: string;
 status: number;
 details?: unknown;
 constructor(code: string, message: string, status: number, details?: unknown) {
 super(message);
 this.code = code;
 this.status = status;
 this.details = details;
 }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const doFetch = () => fetch(path, { ...options, headers });

  let res: Response;
  try {
    res = await doFetch();
  } catch (err) {
    throw new ApiError(
      'NETWORK_ERROR',
      'Cannot reach the server. The backend may be down — please try again in a moment.',
      0,
      { originalError: String(err) },
    );
  }

  if (res.status === 401 && !path.endsWith('/auth/login') && !path.endsWith('/auth/refresh')) {
    const newToken = await tryRefresh();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      try {
        res = await doFetch();
      } catch (err) {
        throw new ApiError(
          'NETWORK_ERROR',
          'Cannot reach the server. The backend may be down — please try again in a moment.',
          0,
          { originalError: String(err) },
        );
      }
    } else {
      clearTokens();
      throw new ApiError('UNAUTHORIZED', 'Session expired', 401);
    }
  }

  // HTTP 204 No Content — successful DELETE/PATCH with no response body.
  // Return null instead of trying to parse JSON.
  if (res.status === 204) {
    return null as T;
  }

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const bodyText = await res.text();

  if (!isJson || !bodyText) {
    if (res.status === 500) {
      throw new ApiError('INTERNAL_SERVER_ERROR', 'The server returned an internal error. Please try again.', res.status, { body: bodyText.slice(0, 500) });
    }
    if (res.status === 404) {
      throw new ApiError('NOT_FOUND', 'The requested endpoint does not exist (404).', res.status, { body: bodyText.slice(0, 500) });
    }
    throw new ApiError('BAD_RESPONSE', `Unexpected non-JSON response (HTTP ${res.status}). The backend may be restarting.`, res.status, { contentType, bodyPreview: bodyText.slice(0, 500) });
  }

  let json: ApiResponse<T>;
  try {
    json = JSON.parse(bodyText);
  } catch (err) {
    throw new ApiError('BAD_RESPONSE', 'The server returned malformed JSON. Please try again.', res.status, { bodyPreview: bodyText.slice(0, 500), parseError: String(err) });
  }

  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message, res.status, json.error.details);
  }
  return json.data;
}

// Convenience methods
export const api = {
 get: <T>(path: string) => apiFetch<T>(path),
 post: <T>(path: string, body?: unknown) =>
 apiFetch<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
 patch: <T>(path: string, body: unknown) =>
 apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
 delete: <T>(path: string) =>
 apiFetch<T>(path, { method: 'DELETE' }),
};
