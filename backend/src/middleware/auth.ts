// src/middleware/auth.ts
// Express middleware that attaches `req.auth` (AuthContext) or returns 401/403.

import type { Request, Response, NextFunction } from 'express';
import { getAuthContext, type Role } from '@/lib/auth/session';
import { handleApiError } from '@/lib/api-response';
import { AppError } from '@/lib/errors';

/** Requires a valid Bearer token. */
export const requireAuth = () => (req: Request, _res: Response, next: NextFunction) => {
  getAuthContext(req)
    .then((ctx) => {
      req.auth = ctx;
      next();
    })
    .catch((err) => handleApiError(err, _res));
};

/** Requires one of the listed roles. */
export const requireRoles = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  getAuthContext(req)
    .then((ctx) => {
      if (!roles.includes(ctx.role)) {
        return handleApiError(AppError.forbidden(`Requires one of: ${roles.join(', ')}`), res);
      }
      req.auth = ctx;
      next();
    })
    .catch((err) => handleApiError(err, res));
};

/** Optional auth — sets req.auth if token present, but doesn't fail if missing. */
export const optionalAuth = () => (req: Request, _res: Response, next: NextFunction) => {
  getAuthContext(req)
    .then((ctx) => {
      req.auth = ctx;
      next();
    })
    .catch(() => next());  // ignore errors, just continue without auth
};
