// src/lib/auth/session.ts
// Express-compatible auth context extraction.
// Replaces the Next.js version that used NextRequest.

import type { Request } from 'express';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { verifyAccessToken, type AccessTokenPayload } from './jwt';

export type Role = 'ADMIN' | 'RESTAURANT' | 'CUSTOMER' | 'RIDER';

export interface AuthContext {
  userId: string;
  role: Role;
  email?: string;
  raw: AccessTokenPayload;
}

export function getBearerToken(req: Request): string | null {
  const auth = req.headers.authorization || (req.headers.Authorization as string | undefined);
  if (!auth) return null;
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m?.[1] ?? null;
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
  const token = getBearerToken(req);
  if (!token) throw AppError.unauthorized('Missing Bearer token');
  try {
    const payload = await verifyAccessToken(token);
    // Verify user still exists + isActive
    const user = await db.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, isActive: true, email: true },
    });
    if (!user) throw AppError.unauthorized('User not found');
    if (!user.isActive) throw AppError.forbidden('Account is blocked');
    return {
      userId: user.id,
      role: user.role as Role,
      email: user.email ?? undefined,
      raw: payload,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Invalid or expired token');
  }
}

export async function getOptionalAuthContext(req: Request): Promise<AuthContext | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    return await getAuthContext(req);
  } catch {
    return null;
  }
}

export function requireAuth(req: Request): Promise<AuthContext> {
  return getAuthContext(req);
}

export function requireRoles(req: Request, roles: Role[]): Promise<AuthContext> {
  return (async () => {
    const ctx = await getAuthContext(req);
    if (!roles.includes(ctx.role)) {
      throw AppError.forbidden(`Requires one of: ${roles.join(', ')}`);
    }
    return ctx;
  })();
}
