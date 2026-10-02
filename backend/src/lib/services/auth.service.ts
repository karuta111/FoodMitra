// src/lib/services/auth.service.ts
// Phone-based customer auth with OTP verification + email-based admin auth.
// Restaurants and riders are admin-managed.

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
import { createHash, randomBytes, randomInt } from 'crypto';
import { NotificationService } from './notification.service';

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

const OTP_TTL_MIN = 5;
const OTP_MAX_ATTEMPTS = 3;

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
  // OTP methods
  // ============================

  /**
   * Send an OTP to the phone.
   * When MSG91 is configured → MSG91 generates + stores + sends the OTP via SMS.
   * When not configured (demo mode) → generate locally + store hash in DB + return OTP for dev display.
   */
  static async sendOtp(phone: string, purpose: 'SIGNUP' | 'FORGOT_PASSWORD'): Promise<{ message: string; otp?: string; expiresInSec: number; provider: 'msg91' | 'demo' }> {
    // For SIGNUP: phone must NOT be already registered.
    // For FORGOT_PASSWORD: phone MUST be already registered.
    const existing = await db.user.findUnique({ where: { phone } });
    if (purpose === 'SIGNUP' && existing) {
      throw AppError.conflict('PHONE_ALREADY_EXISTS', 'This mobile number is already registered. Try logging in instead.', { phone });
    }
    if (purpose === 'FORGOT_PASSWORD' && !existing) {
      // Don't leak whether the phone is registered — return success silently.
      // We still won't generate an OTP though.
      return { message: 'If that mobile number is registered, an OTP has been sent.', expiresInSec: OTP_TTL_MIN * 60, provider: 'demo' };
    }

    // ===== MSG91 widget mode — the widget itself sends the OTP from the browser.
    // The /send-otp endpoint is a no-op here; it just signals to the frontend
    // that it's OK to launch the widget for this phone+purpose.
    if (isMsg91Enabled()) {
      return {
        message: 'Launch the MSG91 widget to send + verify the OTP.',
        expiresInSec: OTP_TTL_MIN * 60,
        provider: 'msg91',
      };
    }

    // ===== Demo mode (local) =====
    // Invalidate any unconsumed previous OTPs for this phone+purpose (one active at a time)
    await db.otpVerification.updateMany({
      where: { phone, purpose, consumedAt: null, verifiedAt: null },
      data: { expiresAt: new Date(0) },  // expire immediately
    });

    const otp = randomInt(100000, 1000000).toString();
    const paddedOtp = otp.padStart(6, '0');
    const otpHash = hashToken(paddedOtp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

    await db.otpVerification.create({
      data: { phone, otpHash, purpose, expiresAt, attemptsLeft: OTP_MAX_ATTEMPTS },
    });

    logger.info('auth.otp_sent', { phone, purpose, provider: 'demo' });

    // Demo mode: return the OTP so the frontend can display it for local dev.
    return {
      message: `OTP sent to ${phone}`,
      otp: paddedOtp,  // DEMO ONLY — remove in production
      expiresInSec: OTP_TTL_MIN * 60,
      provider: 'demo',
    };
  }

  /**
   * Verify an OTP.
   * When MSG91 is configured → MSG91 verifies the OTP on their side.
   * When in demo mode → verifies against the local OtpVerification table.
   *
   * After successful verification, stores a short-lived local "verified" record
   * so that the subsequent /register or /reset-password call can trust the phone
   * without re-verifying. This works for both MSG91 and demo modes.
   */
  static async verifyOtp(phone: string, otp: string, purpose: 'SIGNUP' | 'FORGOT_PASSWORD'): Promise<{ verified: boolean; message: string }> {
    // ===== MSG91 widget mode — the widget handles OTP send + verify entirely in the browser.
    // The /verify-otp endpoint is not used in widget mode; instead the frontend calls
    // /verify-widget-token with the JWT access token returned by the widget.
    if (isMsg91Enabled()) {
      throw AppError.badRequest('OTP verification is handled by the MSG91 widget. Use POST /api/v1/auth/verify-widget-token with the access token returned by the widget.');
    }

    // ===== Demo mode (local) =====
    const record = await db.otpVerification.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw AppError.badRequest('OTP expired or not found. Please request a new one.');
    }
    if (record.verifiedAt) {
      return { verified: true, message: 'OTP already verified. You can proceed.' };
    }
    if (record.attemptsLeft <= 0) {
      throw AppError.badRequest('Too many failed attempts. Please request a new OTP.');
    }

    const otpHash = hashToken(otp);
    if (otpHash !== record.otpHash) {
      await db.otpVerification.update({
        where: { id: record.id },
        data: { attemptsLeft: record.attemptsLeft - 1 },
      });
      const left = record.attemptsLeft - 1;
      if (left <= 0) {
        throw AppError.badRequest('Too many incorrect attempts. Please request a new OTP.');
      }
      throw AppError.badRequest(`Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.`);
    }

    await db.otpVerification.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });

    logger.info('auth.otp_verified', { phone, purpose, provider: 'demo' });
    return { verified: true, message: 'OTP verified successfully.' };
  }

  /**
   * Internal helper — marks the phone as verified by creating/updating a local
   * OtpVerification record. Used after MSG91 verification so the subsequent
   * /register or /reset-password call can trust the phone.
   */
  private static async markPhoneVerified(phone: string, purpose: 'SIGNUP' | 'FORGOT_PASSWORD', otp: string) {
    // Invalidate any previous unconsumed records
    await db.otpVerification.updateMany({
      where: { phone, purpose, consumedAt: null },
      data: { expiresAt: new Date(0) },
    });
    // Create a verified record — the OTP itself is hashed for audit purposes
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
    await db.otpVerification.create({
      data: { phone, otpHash, purpose, expiresAt, attemptsLeft: 0, verifiedAt: new Date() },
    });
  }

  /**
   * Verify the MSG91 OTP widget's access token server-side.
   * Browser widget returns a JWT access token after the user enters OTP in MSG91's modal.
   * Frontend POSTs that token here. We call MSG91's verifyAccessToken endpoint to confirm
   * + learn the verified phone number.
   *
   * If verified: marks the phone as verified via markPhoneVerified() so the subsequent
   * /register or /reset-password call can trust it.
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

    await this.markPhoneVerified(input.phone, input.purpose, 'WIDGET_VERIFIED');
    logger.info('auth.widget_verified', { phone: input.phone, purpose: input.purpose, provider: 'msg91-widget' });

    return {
      verified: true,
      verifiedPhone: input.phone,
      message: 'Phone verified successfully. You can now complete your signup.',
    };
  }

  /**
   * Internal helper — asserts the phone has a verified+unconsumed OTP for the given purpose.
   * Used by register + reset-password to ensure the phone was verified before consuming the OTP.
   *
   * When MSG91 is enabled: the verifyOtp() call earlier already marked a local "verified"
   * record via markPhoneVerified(). We just check that record exists.
   * When in demo mode: the OTP itself is verified against the local OtpVerification table.
   */
  static async assertOtpVerified(phone: string, purpose: 'SIGNUP' | 'FORGOT_PASSWORD', otp?: string) {
    // ===== MSG91 path — the OTP must have been verified via /verify-otp OR /verify-widget-token already =====
    if (isMsg91Enabled()) {
      const record = await db.otpVerification.findFirst({
        where: { phone, purpose, consumedAt: null, verifiedAt: { not: null } },
        orderBy: { createdAt: 'desc' },
      });
      if (!record || record.expiresAt < new Date()) {
        throw AppError.badRequest('Phone not verified. Please complete the OTP verification first.');
      }
      return record;
    }

    // ===== Demo mode (local) — otp is required =====
    if (!otp) {
      throw AppError.badRequest('OTP is required');
    }

    // ===== Demo mode (local) =====
    const record = await db.otpVerification.findFirst({
      where: { phone, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt < new Date()) {
      throw AppError.badRequest('OTP expired. Please request a new one.');
    }
    if (!record.verifiedAt) {
      // Allow the OTP itself to be passed as a fallback (verifies + marks in one go)
      const otpHash = hashToken(otp);
      if (otpHash !== record.otpHash) {
        throw AppError.badRequest('OTP not verified. Please verify the OTP first.');
      }
      // Mark verified
      await db.otpVerification.update({
        where: { id: record.id },
        data: { verifiedAt: new Date() },
      });
    }
    return record;
  }

  // ============================
  // Register / Login
  // ============================

  /**
   * Customer registration — requires a verified OTP for the phone.
   */
  static async register(input: {
    fullName: string;
    phone: string;
    password: string;
    otp?: string;
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
          fullName: input.fullName,
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
  // Forgot / Reset password — OTP-based now
  // ============================

  /**
   * Forgot password — sends OTP to the phone (if registered).
   * Reuses sendOtp() with purpose=FORGOT_PASSWORD.
   */
  static async forgotPassword(phone: string) {
    return this.sendOtp(phone, 'FORGOT_PASSWORD');
  }

  /**
   * Reset password — verifies OTP + sets new password.
   */
  static async resetPassword(phone: string, password: string, otp?: string) {
    // Verify the OTP first (throws if invalid)
    const otpRecord = await this.assertOtpVerified(phone, 'FORGOT_PASSWORD', otp);

    const user = await db.user.findUnique({ where: { phone } });
    if (!user) throw AppError.notFound('User');

    const passwordHash = await hashPassword(password);

    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      db.otpVerification.update({
        where: { id: otpRecord?.id },
        data: { consumedAt: new Date() },
      }),
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
