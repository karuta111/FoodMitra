// src/types/express.d.ts
// Augment Express Request with the auth context (set by auth middleware).

import type { AuthContext } from '@/lib/auth/session';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
    rawBody?: string;  // for webhook signature verification
  }
}
