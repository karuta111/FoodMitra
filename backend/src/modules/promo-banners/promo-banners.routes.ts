// src/modules/promo-banners/promo-banners.routes.ts
// Public endpoint for fetching active promo banners shown in the customer home carousel.
// Admin CRUD + image upload endpoints live under /api/v1/admin/promo-banners.

import { Router } from 'express';
import { db } from '@/lib/db';
import { asyncHandler, ok } from '@/lib/api-response';

const router = Router();

// GET /api/v1/promo-banners — public, returns active banners sorted by displayOrder asc
router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const banners = await db.promoBanner.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return ok(res, banners);
  }),
);

export { router as promoBannerRoutes };
