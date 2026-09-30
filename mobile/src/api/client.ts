import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000') + '/api/v1';
console.log('[API] Base URL:', API_BASE);
const TOKEN_KEY = 'fd_access_token';
const REFRESH_KEY = 'fd_refresh_token';

export async function getAccessToken() { return await AsyncStorage.getItem(TOKEN_KEY); }
export async function setTokens(a: string, r: string) { await AsyncStorage.setItem(TOKEN_KEY, a); await AsyncStorage.setItem(REFRESH_KEY, r); }
export async function clearTokens() { await AsyncStorage.removeItem(TOKEN_KEY); await AsyncStorage.removeItem(REFRESH_KEY); }

export class ApiError extends Error {
  code: string; status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try { res = await fetch(`${API_BASE}${path}`, { ...options, headers }); }
  catch { throw new ApiError('NETWORK_ERROR', 'Unable to reach server', 0); }
  if (res.status === 204) return { success: true } as any;
  let json;
  try { json = await res.json(); }
  catch { throw new ApiError('INTERNAL_ERROR', `Server error (${res.status})`, res.status); }
  if (!json.success) throw new ApiError(json.error?.code || 'ERROR', json.error?.message || 'Error', res.status);
  return json.data;
}

export const api = {
  get: <T>(p: string) => apiFetch<T>(p),
  post: <T>(p: string, b?: any) => apiFetch<T>(p, { method: 'POST', body: b !== undefined ? JSON.stringify(b) : undefined }),
  patch: <T>(p: string, b: any) => apiFetch<T>(p, { method: 'PATCH', body: JSON.stringify(b) }),
  delete: <T>(p: string) => apiFetch<T>(p, { method: 'DELETE' }),
};
