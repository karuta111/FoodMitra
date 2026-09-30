// src/modules/orders/restaurant-orders.routes.ts
// Mounted at /api/v1/restaurant/orders
//
// Order state machine is now simplified: PLACED → APPROVED → PAID → DELIVERED (+ CANCELLED).
// All transitions are admin-driven via /api/v1/admin/orders/:id/{approve,mark-paid,delivered,cancel}.
// This router now only exposes the admin list endpoint.

import { Router } from 'express';
import { db } from '@/lib/db';
import { paginationSchema } from '@/lib/validators';
import { asyncHandler, ok } from '@/lib/api-response';
import { requireRoles } from '@/middleware/auth';

const router = Router();

// GET /api/v1/restaurant/orders — admin lists all orders
router.get(
  '/',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const params = paginationSchema.parse(req.query);
    const status = req.query.status as string | undefined;
    const restaurantId = req.query.restaurantId as string | undefined;
    const where: Record<string, unknown> = {
      ...(status ? { orderStatus: status } : {}),
      ...(restaurantId ? { restaurantId } : {}),
    };
    const [total, items] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: {
          restaurant: { select: { id: true, name: true } },
          customer: { select: { id: true, phone: true } },
          items: true,
          payment: { select: { status: true, amount: true } },
        },
      }),
    ]);
    return ok(res, { items, total, page: params.page, pageSize: params.pageSize });
  }),
);

export { router as restaurantOrderRoutes };
