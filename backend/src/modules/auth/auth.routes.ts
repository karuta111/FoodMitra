// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthService } from '@/lib/services/auth.service';
import {
  registerSchema,
  loginSchema,
  adminLoginSchema,
  refreshSchema,
  verifyWidgetTokenSchema,
  resetPasswordSchema,
} from '@/lib/validators/auth';
import { asyncHandler, ok, noContent } from '@/lib/api-response';
import { requireAuth } from '@/middleware/auth';

const router = Router();

// POST /api/v1/auth/verify-widget-token — body: { accessToken, phone, purpose }
// Used only when MSG91 widget is enabled (OTP_USE_MSG91_WIDGET=true).
router.post(
  '/verify-widget-token',
  asyncHandler(async (req, res) => {
    const parsed = verifyWidgetTokenSchema.parse(req.body);
    const result = await AuthService.verifyWidgetToken(parsed);
    return ok(res, result);
  }),
);

// POST /api/v1/auth/register — body: { fullName, phone, password, dateOfBirth?, anniversaryDate? }
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.parse(req.body);
    const result = await AuthService.register(parsed);
    return ok(res, result, 201);
  }),
);

// POST /api/v1/auth/login — customer (phone + password)
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.parse(req.body);
    const result = await AuthService.login(parsed.phone, parsed.password);
    return ok(res, result);
  }),
);

// POST /api/v1/auth/admin-login — admin (email + password)
router.post(
  '/admin-login',
  asyncHandler(async (req, res) => {
    const parsed = adminLoginSchema.parse(req.body);
    const result = await AuthService.adminLogin(parsed.email, parsed.password);
    return ok(res, result);
  }),
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const parsed = refreshSchema.parse(req.body);
    const result = await AuthService.refresh(parsed.refreshToken);
    return ok(res, result);
  }),
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    let refreshToken: string | undefined;
    try {
      refreshToken = refreshSchema.parse(req.body).refreshToken;
    } catch {
      // allow empty body
    }
    await AuthService.logout(refreshToken);
    return noContent(res);
  }),
);

// POST /api/v1/auth/reset-password — body: { phone, password }
// OTP is verified on the frontend; the backend just resets the password.
router.post(
  '/reset-password',
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.parse(req.body);
    const result = await AuthService.resetPassword(parsed.phone, parsed.password);
    return ok(res, result);
  }),
);

// GET /api/v1/auth/me
router.get(
  '/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = await AuthService.me(req.auth!.userId);
    return ok(res, user);
  }),
);

export { router as authRoutes };
