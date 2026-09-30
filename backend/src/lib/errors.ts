// src/lib/errors.ts
// Centralized application error class. All service-layer errors extend AppError.

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RESOURCE_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'RESTAURANT_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'MENU_ITEM_NOT_FOUND'
  | 'CART_EMPTY'
  | 'CART_RESTAURANT_MISMATCH'
  | 'CONFLICT'
  | 'INVALID_STATE_TRANSITION'
  | 'DUPLICATE_REVIEW'
  | 'PAYMENT_SIGNATURE_INVALID'
  | 'PAYMENT_VERIFICATION_FAILED'
  | 'PAYMENT_ALREADY_PROCESSED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'RESTAURANT_NOT_AVAILABLE'
  | 'MENU_ITEM_NOT_AVAILABLE'
  | 'INSUFFICIENT_CART_TOTAL'
  | 'EMAIL_ALREADY_EXISTS'
  | 'PHONE_ALREADY_EXISTS'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'
  | 'UPSTREAM_ERROR';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;
  readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    options?: { details?: Record<string, unknown>; isOperational?: boolean; cause?: unknown },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = options?.details;
    this.isOperational = options?.isOperational ?? true;
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static notFound(resource: string, identifier?: string | number) {
    return new AppError(
      'RESOURCE_NOT_FOUND',
      `${resource} not found${identifier !== undefined ? `: ${identifier}` : ''}`,
      404,
      { details: { resource, identifier } },
    );
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError('FORBIDDEN', message, 403);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError('UNAUTHORIZED', message, 401);
  }

  static badRequest(message: string, details?: Record<string, unknown>) {
    return new AppError('BAD_REQUEST', message, 400, { details });
  }

  static conflict(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    return new AppError(code, message, 409, details);
  }

  static internal(message = 'An unexpected error occurred') {
    return new AppError('INTERNAL_ERROR', message, 500, { isOperational: false });
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
