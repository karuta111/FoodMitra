// src/modules/reviews/reviews.routes.ts
import { Router } from 'express';
import { ReviewService } from '@/lib/services/review.service';
import { createReviewSchema, paginationSchema } from '@/lib/validators';
import { asyncHandler, ok } from '@/lib/api-response';
import { optionalAuth, requireRoles } from '@/middleware/auth';
import { AppError } from '@/lib/errors';
import { db } from '@/lib/db';

const router = Router();

// POST /api/v1/reviews (customer only)
router.post(
  '/',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const parsed = createReviewSchema.parse(req.body);
    const review = await ReviewService.create(parsed, req.auth!);
    return ok(res, review, 201);
  }),
);

// GET /api/v1/reviews?restaurantId=...
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const restaurantId = req.query.restaurantId as string | undefined;
    if (!restaurantId) throw AppError.badRequest('restaurantId is required');
    const params = paginationSchema.parse(req.query);
    const result = await ReviewService.listForRestaurant(restaurantId, params.page, params.pageSize);
    return ok(res, result);
  }),
);

// GET /api/v1/reviews/:id
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const review = await db.review.findUnique({
      where: { id: req.params.id as string },
      include: { customer: { select: { email: true } }, restaurant: { select: { name: true } } },
    });
    if (!review) throw AppError.notFound('Review');
    return ok(res, review);
  }),
);

export { router as reviewRoutes };
