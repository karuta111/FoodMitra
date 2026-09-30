// src/server.ts
// Boot the Express server on the configured port.

import { createApp } from './app';
import { logger } from '@/lib/logger';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = '0.0.0.0';

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  logger.info('server.started', {
    port: PORT,
    host: HOST,
    env: process.env.NODE_ENV || 'development',
    url: `http://localhost:${PORT}`,
  });
  console.log(`\n🚀 FoodMitra backend running at http://localhost:${PORT}\n   API base: http://localhost:${PORT}/api/v1\n   Health:  http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info('server.shutdown', { signal });
  server.close(() => {
    logger.info('server.closed', { signal });
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
