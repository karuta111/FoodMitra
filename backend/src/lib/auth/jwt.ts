// src/lib/auth/jwt.ts
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { randomUUID } from 'crypto';

const enc = (s: string) => new TextEncoder().encode(s);

const ACCESS_SECRET = enc(process.env.JWT_SECRET || 'dev-jwt-secret-change-me');
const REFRESH_SECRET = enc(process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me');

const ACCESS_TTL_SECONDS = parseTtl(process.env.JWT_ACCESS_TTL, 15 * 60); // 15m default
const REFRESH_TTL_SECONDS = parseTtl(process.env.JWT_REFRESH_TTL, 7 * 24 * 60 * 60); // 7d

function parseTtl(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const m = /^(\d+)([smhd])?$/.exec(input);
  if (!m) return fallback;
  const n = parseInt(m[1], 10);
  const unit = m[2] ?? 's';
  const mult = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
  return n * mult;
}

export interface AccessTokenPayload extends JWTPayload {
  sub: string;       // userId
  role: 'ADMIN' | 'RESTAURANT' | 'CUSTOMER' | 'RIDER';
  type: 'access';
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string;
  jti: string;       // refresh token id (randomUUID)
  type: 'refresh';
}

export async function signAccessToken(payload: { sub: string; role: AccessTokenPayload['role'] }) {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
    .setIssuer('foodmitra')
    .setSubject(payload.sub)
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(payload: { sub: string; jti?: string }) {
  const jti = payload.jti ?? randomUUID();
  return {
    token: await new SignJWT({ sub: payload.sub, jti, type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${REFRESH_TTL_SECONDS}s`)
      .setIssuer('foodmitra')
      .setSubject(payload.sub)
      .sign(REFRESH_SECRET),
    jti,
    expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
  };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, ACCESS_SECRET, { issuer: 'foodmitra' });
  if (payload.type !== 'access') throw new Error('Invalid token type');
  return payload as AccessTokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET, { issuer: 'foodmitra' });
  if (payload.type !== 'refresh') throw new Error('Invalid token type');
  return payload as RefreshTokenPayload;
}
