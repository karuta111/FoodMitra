import { create } from 'zustand';
import { api, setTokens, clearTokens, getAccessToken } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null; loading: boolean;
  login: (phone: string, password: string) => Promise<User>;
  register: (input: { fullName: string; phone: string; password: string; otp?: string; dateOfBirth?: string; anniversaryDate?: string }) => Promise<User>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null, loading: true,
  initAuth: async () => {
    const token = await getAccessToken();
    if (!token) { set({ loading: false }); return; }
    try { const me = await api.get<any>('/auth/me'); set({ user: { id: me.id, phone: me.phone, email: me.email, role: me.role, fullName: me.customerProfile?.fullName }, loading: false }); }
    catch { await clearTokens(); set({ user: null, loading: false }); }
  },
  login: async (phone, password) => {
    const norm = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '').slice(-10)}`;
    const r = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', { phone: norm, password });
    await setTokens(r.accessToken, r.refreshToken); set({ user: r.user }); return r.user;
  },
  register: async (input) => {
    const norm = `+91${input.phone.replace(/\D/g, '').slice(-10)}`;
    const r = await api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', { ...input, phone: norm });
    await setTokens(r.accessToken, r.refreshToken); set({ user: r.user }); return r.user;
  },
  logout: async () => { try { await api.post('/auth/logout', {}); } catch {} await clearTokens(); set({ user: null }); },
}));
