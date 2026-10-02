// src/lib/validators/auth.ts
import { z } from 'zod';

// Indian mobile format: +91 followed by 10 digits starting with 6-9, OR 10 digits without country code.
export const phoneSchema = z
  .string()
  .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
  .transform((s) => {
    const digits = s.replace(/\D/g, '').slice(-10);
    return `+91${digits}`;
  });

export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);

// Signup — OTP is verified on the frontend; the backend does not check it.
// dateOfBirth + anniversaryDate are optional — used by admin "today's birthdays/anniversaries" view.
export const registerSchema = z.object({
  fullName: z.string().min(1, 'Enter your full name').max(120),
  phone: phoneSchema,
  password: passwordSchema,
  dateOfBirth: z.string()
    .optional()
    .refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s), 'Enter a valid date (YYYY-MM-DD)')
    .transform((s) => (s && s.trim().length > 0) ? new Date(`${s}T00:00:00.000Z`) : undefined),
  anniversaryDate: z.string()
    .optional()
    .refine((s) => !s || /^\d{4}-\d{2}-\d{2}$/.test(s), 'Enter a valid date (YYYY-MM-DD)')
    .transform((s) => (s && s.trim().length > 0) ? new Date(`${s}T00:00:00.000Z`) : undefined),
});

// Login = mobile + password (no email)
export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Enter your password'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// Verify MSG91 widget access token — frontend POSTs the JWT access token returned
// by the MSG91 OTP widget. We re-verify it server-side with MSG91.
export const verifyWidgetTokenSchema = z.object({
  accessToken: z.string().min(20, 'Access token is required'),
  phone: phoneSchema,
  purpose: z.enum(['SIGNUP', 'FORGOT_PASSWORD']),
});

// Reset password — OTP is verified on the frontend; the backend just resets the password.
export const resetPasswordSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
});

// Admin login — uses email + password (admin only, no customer self-service)
export const adminLoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
