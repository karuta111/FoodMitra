// src/hooks/use-auth.tsx
// Customer login is phone-based. Admin login is email-based (separate endpoint).

'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setTokens, clearTokens, getAccessToken, ApiError } from '@/lib/api-client';

type Role = 'ADMIN' | 'RESTAURANT' | 'CUSTOMER' | 'RIDER';

interface User {
 id: string;
 email?: string | null;
 phone?: string | null;
 role: Role;
 fullName?: string;
}

interface AuthState {
 user: User | null;
 loading: boolean;
 login: (phone: string, password: string) => Promise<User>;
 register: (input: RegisterInput) => Promise<User>;
 logout: () => Promise<void>;
 refresh: () => Promise<void>;
}

interface RegisterInput {
 fullName: string;
 phone: string; // mobile number — primary identifier
 password: string;
 dateOfBirth?: string; // ISO YYYY-MM-DD — used by admin "today's birthdays" view
 anniversaryDate?: string; // ISO YYYY-MM-DD — used by admin "today's anniversaries" view
}

const AuthContext = createContext<AuthState | null>(null);

interface MeResponse {
 id: string;
 email?: string | null;
 phone?: string | null;
 role: Role;
 customerProfile?: { fullName: string } | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<User | null>(null);
 const [loading, setLoading] = useState(true);

 // On mount, if we have a token, fetch /auth/me
 useEffect(() => {
 const token = getAccessToken();
 if (!token) {
 setLoading(false);
 return;
 }
 api
 .get<MeResponse>('/api/v1/auth/me')
 .then((me) => {
 setUser({
 id: me.id,
 email: me.email,
 phone: me.phone,
 role: me.role,
 fullName: me.customerProfile?.fullName || (me.role === 'ADMIN' ? 'Admin' : undefined),
 });
 })
 .catch(() => {
 clearTokens();
 setUser(null);
 })
 .finally(() => setLoading(false));
 }, []);

 const login = async (phone: string, password: string) => {
 const result = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
 '/api/v1/auth/login',
 { phone, password },
 );
 setTokens(result.accessToken, result.refreshToken);
 setUser(result.user);
 return result.user;
 };

 const register = async (input: RegisterInput) => {
 const result = await api.post<{ accessToken: string; refreshToken: string; user: User }>(
 '/api/v1/auth/register',
 input,
 );
 setTokens(result.accessToken, result.refreshToken);
 setUser(result.user);
 return result.user;
 };

 const logout = async () => {
 try { await api.post('/api/v1/auth/logout', {}); } catch { /* ignore */ }
 clearTokens();
 setUser(null);
 };

 const refresh = async () => {
 if (!getAccessToken()) return;
 try {
 const me = await api.get<MeResponse>('/api/v1/auth/me');
 setUser({
 id: me.id,
 email: me.email,
 phone: me.phone,
 role: me.role,
 fullName: me.customerProfile?.fullName || (me.role === 'ADMIN' ? 'Admin' : undefined),
 });
 } catch {
 clearTokens();
 setUser(null);
 }
 };

 return (
 <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
 {children}
 </AuthContext.Provider>
 );
}

export function useAuth(): AuthState {
 const ctx = useContext(AuthContext);
 if (!ctx) throw new Error('useAuth must be used within AuthProvider');
 return ctx;
}

export { ApiError };
