// src/app.ts
// Express app setup — CORS, helmet, JSON body parsing, route mounting, error handler.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { logger } from '@/lib/logger';

import { authRoutes } from '@/modules/auth/auth.routes';
import { restaurantRoutes } from '@/modules/restaurants/restaurants.routes';
import { menuRoutes } from '@/modules/menu/menu.routes';
import { cartRoutes } from '@/modules/cart/cart.routes';
import { orderRoutes } from '@/modules/orders/orders.routes';
import { paymentRoutes } from '@/modules/payments/payments.routes';
import { restaurantOrderRoutes } from '@/modules/orders/restaurant-orders.routes';
import { reviewRoutes } from '@/modules/reviews/reviews.routes';
import { notificationRoutes } from '@/modules/notifications/notifications.routes';
import { customerRoutes } from '@/modules/customers/customers.routes';
import { adminRoutes } from '@/modules/admin/admin.routes';
import { promoBannerRoutes } from '@/modules/promo-banners/promo-banners.routes';
import { errorHandler } from '@/middleware/error-handler';

const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS — allow the Next.js frontend origin(s)
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow same-origin / no-origin (curl, server-to-server)
        if (!origin) return cb(null, true);
        // Allow any matching CORS_ORIGINS (supports wildcards via substring match)
        const allowed = CORS_ORIGINS.some((o) => {
          if (o === origin) return true;
          if (o.includes('*')) {
            // Simple wildcard match: https://preview-*.space-z.ai
            const re = new RegExp('^' + o.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return re.test(origin);
          }
          return false;
        });
        if (allowed) return cb(null, true);
        return cb(null, false);  // don't throw — just don't send CORS headers
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    }),
  );

  // JSON body parsing for everything else
  app.use(express.json({ limit: '5mb' }));

  // HTTP request logging
  app.use(
    morgan('tiny', {
      stream: { write: (msg) => logger.info('http.request', { msg: msg.trim() }) },
    }),
  );

  // Static file serving for uploaded images (promo banners, restaurant logos, etc.)
  app.use('/uploads', express.static(path.resolve('/home/z/my-project/upload'), {
    maxAge: '7d',
    immutable: true,
  }));

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'foodmitra-backend' }));

  // Mount routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/restaurants', restaurantRoutes);
  app.use('/api/v1/menu', menuRoutes);
  app.use('/api/v1/cart', cartRoutes);
  app.use('/api/v1/orders', orderRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/restaurant', restaurantOrderRoutes);
  app.use('/api/v1/reviews', reviewRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/customers', customerRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/promo-banners', promoBannerRoutes);

  // Central error handler — must be last
  app.use(errorHandler);

  return app;
}
