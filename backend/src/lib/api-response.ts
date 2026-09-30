// src/lib/api-response.ts
// Express-compatible response helpers.
// Spec response shape:
//   Success: { success: true, data: {...} }
//   Error:   { success: false, error: { code, message, details? } }

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, isAppError } from './errors';
import { logger } from './logger';

export function ok<T>(res: Response, data: T, status: 200 | 201 = 200): Response {
  return res.status(status).json({ success: true, data });
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function fail(res: Response, error: AppError): Response {
  return res.status(error.statusCode).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
}

export function handleApiError(err: unknown, res: Response): Response {
  if (isAppError(err)) {
    if (!err.isOperational) {
      logger.error('Internal error', { code: err.code, message: err.message, stack: err.stack });
    } else {
      logger.warn('App error', { code: err.code, message: err.message });
    }
    return fail(res, err);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
    });
  }

  // Prisma known errors
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const prismaErr = err as { code: string; meta?: Record<string, unknown>; message: string };
    if (prismaErr.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
          details: { target: prismaErr.meta?.target },
        },
      });
    }
    if (prismaErr.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Record not found' },
      });
    }
  }

  logger.error('Unhandled error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

// Wraps an async route handler to centralize error handling.
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => handleApiError(err, res));
  };
};
