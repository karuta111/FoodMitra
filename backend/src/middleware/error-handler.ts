// src/middleware/error-handler.ts
// Central Express error handler — catches errors from async routes and middleware.

import type { ErrorRequestHandler } from 'express';
import { handleApiError } from '@/lib/api-response';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  handleApiError(err, res);
};
