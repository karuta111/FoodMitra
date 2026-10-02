// src/lib/services/auth.service.ts
// Phone-based customer auth + email-based admin auth.
// OTP is verified entirely on the frontend (MSG91 widget or demo display).
// The backend trusts the frontend and does NOT store or re-check OTP codes.

import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { Msg91Client, isMsg91Enabled } from '@/lib/integrations/msg91';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/lib/auth/jwt';
import { createHash } from 'crypto';

export type Role = 'ADMIN' | 'CUSTOMER' | 'RESTAURANT' | 'RIDER';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email?: string | null;
    phone: string;
    role: 'ADMIN' | 'CUSTOMER' | 'RESTAURANT' | 'RIDER';
    fullName?: string;
    redirectTo?: string;
  };
}

function redirectFor(role: AuthTokens['user']['role']): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'CUSTOMER':
    default:
      return '/';
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  // ============================
  // MSG91 widget token verification
  // ============================

  /**
   * Verify the MSG91 OTP widget's access token server-side.
   * Used when OTP_USE_MSG91_WIDGET=true — the browser widget returns a JWT
   * access token after the user enters the OTP. The frontend POSTs that token
   * here and we confirm it with MSG91.
   */
  static async verifyWidgetToken(input: {
    accessToken: string;
    phone: string;
    purpose: 'SIGNUP' | 'FORGOT_PASSWORD';
  }): Promise<{ verified: boolean; verifiedPhone: string; message: string }> {
    if (!isMsg91Enabled()) {
      throw AppError.badRequest('MSG91 widget is not configured. Set OTP_USE_MSG91_WIDGET=true and MSG91_AUTH_KEY in .env');
    }

    if (input.purpose === 'SIGNUP') {
      const existing = await db.user.findUnique({ where: { phone: input.phone } });
      if (existing) {
        throw AppError.conflict('PHONE_ALREADY_EXISTS', 'This mobile number is already registered. Try logging in instead.', { phone: input.phone });
      }
    } else if (input.purpose === 'FORGOT_PASSWORD') {
      const existing = await db.user.findUnique({ where: { phone: input.phone } });
      if (!existing) {
        return {
          verified: true,
          verifiedPhone: input.phone,
          message: 'If that mobile number is registered, an OTP has been sent.',
        };
      }
    }

    let result;
    try {
      result = await Msg91Client.verifyWidgetAccessToken(input.accessToken);
    } catch (e) {
      logger.error('auth.widget_verify_failed', {
        phone: input.phone,
        error: e instanceof Error ? e.message : String(e),
      });
      throw AppError.badRequest('OTP verification failed. Please try again.');
    }

    if (!result.verified) {
      throw AppError.badRequest(result.message || 'OTP verification failed');
    }

    if (result.phone && result.phone !== input.phone) {
      logger.warn('auth.widget_phone_mismatch', {
        claimedPhone: input.phone,
        msg91Phone: result.phone,
      });
      throw AppError.badRequest(
        'Phone number mismatch — the OTP was verified for a different number. Please use the same number you started with.',
      );
    }

    logger.info('auth.widget_verified', { phone: input.phone, purpose: input.purpose, provider: 'msg91-widget' });

    return {
      verified: true,
      verifiedPhone: input.phone,
      message: 'Phone verified successfully. You can now complete your signup.',
    };
  }

  // ============================
  // Register / Login
  // ============================

  /**
   * Customer registration.
   * OTP verification is handled entirely on the frontend — no backend OTP check.
   */
  static async register(input: {
    fullName: string;
    phone: string;
    password: string;
    dateOfBirth?: Date;
    anniversaryDate?: Date;
  }): Promise<AuthTokens> {
    const existing = await db.user.findUnique({ where: { phone: input.phone } });
    if (existing) {
      throw AppError.conflict('PHONE_ALREADY_EXISTS', 'This mobile number is already registered', { phone: input.phone });
    }

    const passwordHash = await hashPassword(input.password);

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone: input.phone,
          passwordHash,
          role: 'CUSTOMER',
        },
      });

      await tx.customerProfile.create({
        data: {
          userId: created.id,
          fullName: input.fullName, phone: input.phone,
          ...(input.dateOfBirth ? { dateOfBirth: input.dateOfBirth } : {}),
          ...(input.anniversaryDate ? { anniversaryDate: input.anniversaryDate } : {}),
        },
      });

      return created;
    });

    const [accessToken, refresh] = await Promise.all([
      signAccessToken({ sub: user.id, role: user.role as AuthTokens['user']['role'] }),
      signRefreshToken({ sub: user.id }),
    ]);
    await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refresh.token),
        expiresAt: refresh.expiresAt,
      },
    });

    logger.info('auth.register', { userId: user.id, phone: user.phone });

    return {
      accessToken,
      refreshToken: refresh.token,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role as AuthTokens['user']['role'],
        fullName: input.fullName,
        redirectTo: redirectFor(user.role as AuthTokens['user']['role']),
      },
    };
  }

  /**
   * Customer login — phone + password.
   */
  static async login(phone: string, password: string): Promise<AuthTokens> {
    const user = await db.user.findUnique({
      where: { phone },
      include: { customerProfile: true },
    });
    if (!user) throw AppError.unauthorized('Invalid mobile number or password');
    if (!user.isActive) throw AppError.forbidden('Account is blocked');
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw AppError.unauthorized('Invalid mobile number or password');

    const [accessToken, refresh] = await Promise.all([
      signAccessToken({ sub: user.id, role: user.role as AuthTokens['user']['role'] }),
      signRefreshToken({ sub: user.id }),
    ]);
    await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refresh.token),
        expiresAt: refresh.expiresAt,
      },
    });

    logger.info('auth.login', { userId: user.id, phone: user.phone, role: user.role });

    return {
      accessToken,
      refreshToken: refresh.token,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        role: user.role as AuthTokens['user']['role'],
        fullName: user.customerProfile?.fullName,
        redirectTo: redirectFor(user.role as AuthTokens['user']['role']),
      },
    };
  }

  /**
   * Admin login — email + password.
   */
  static async adminLogin(email: string, password: string): Promise<AuthTokens> {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) throw AppError.unauthorized('Invalid email or password');
    if (user.role !== 'ADMIN') throw AppError.forbidden('Only admins can use this endpoint');
    if (!user.isActive) throw AppError.forbidden('Account is blocked');
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw AppError.unauthorized('Invalid email or password');

    const [accessToken, refresh] = await Promise.all([
      signAccessToken({ sub: user.id, role: 'ADMIN' }),
      signRefreshToken({ sub: user.id }),
    ]);
    await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refresh.token),
        expiresAt: refresh.expiresAt,
      },
    });

    logger.info('auth.admin_login', { userId: user.id, email: user.email });

    return {
      accessToken,
      refreshToken: refresh.token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: 'ADMIN',
        fullName: 'Admin',
        redirectTo: '/admin/dashboard',
      },
    };
  }

  static async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized('Invalid refresh token');
    }
    const tokenHash = hashToken(refreshToken);
    const stored = await db.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!stored) throw AppError.unauthorized('Refresh token revoked or expired');

    await db.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

    const user = await db.user.findUnique({
      where: { id: payload.sub },
      include: { customerProfile: true },
    });
    if (!user) throw AppError.unauthorized('User not found');
    if (!user.isActive) throw AppError.forbidden('Account is blocked');

    const [accessToken, refresh2] = await Promise.all([
      signAccessToken({ sub: user.id, role: user.role as AuthTokens['user']['role'] }),
      signRefreshToken({ sub: user.id }),
    ]);
    await db.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refresh2.token),
        expiresAt: refresh2.expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refresh2.token,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role as AuthTokens['user']['role'],
        fullName: user.customerProfile?.fullName || (user.role === 'ADMIN' ? 'Admin' : undefined),
        redirectTo: redirectFor(user.role as AuthTokens['user']['role']),
      },
    };
  }

  static async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);
    await db.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.info('auth.logout');
  }

  static async me(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: { include: { defaultAddress: true } },
      },
    });
    if (!user) throw AppError.notFound('User');
    return user;
  }

  // ============================
  // Forgot / Reset password
  // ============================

  /**
   * Reset password — no server-side OTP check; OTP is verified on the frontend.
   */
  static async resetPassword(phone: string, password: string) {
    const user = await db.user.findUnique({ where: { phone } });
    if (!user) throw AppError.notFound('User');

    const passwordHash = await hashPassword(password);

    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      // Revoke all refresh tokens (force re-login)
      db.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    logger.info('auth.reset_password', { userId: user.id });
    return { message: 'Password reset successful. You can now log in with your new password.' };
  }
}
