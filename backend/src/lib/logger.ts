// src/lib/logger.ts
// Minimal structured JSON logger. Production should swap to pino.

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  module?: string;
  requestId?: string;
  userId?: string;
  [k: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function emit(level: LogLevel, message: string, ctx?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...ctx,
  };
  const sink = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  sink(JSON.stringify(entry));
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit('error', msg, ctx),
};

// Sensitive field names that must never be logged.
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'razorpaySignature',
  'razorpayKeySecret',
  'webhookSecret',
  'jwtSecret',
  'authorization',
]);

export function sanitizeLogContext(ctx: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}
