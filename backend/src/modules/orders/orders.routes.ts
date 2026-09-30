// src/modules/orders/orders.routes.ts
import { Router } from 'express';
import { OrderService } from '@/lib/services/order.service';
import { createOrderSchema, cancelOrderSchema, paginationSchema } from '@/lib/validators';
import { asyncHandler, ok } from '@/lib/api-response';
import { requireRoles } from '@/middleware/auth';
import { db } from '@/lib/db';

const router = Router();

// POST /api/v1/orders — customer places order; no payment gateway, admin marks paid later
router.post(
  '/',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const parsed = createOrderSchema.parse(req.body);
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
    const result = await OrderService.createOrder({
      customerId: req.auth!.userId,
      deliveryAddressId: parsed.deliveryAddressId,
      notes: parsed.notes,
      idempotencyKey,
    });
    return ok(res, { order: result.order }, 201);
  }),
);

// GET /api/v1/orders (customer's own orders)
router.get(
  '/',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const params = paginationSchema.parse(req.query);
    const [total, items] = await Promise.all([
      db.order.count({ where: { customerId: req.auth!.userId } }),
      db.order.findMany({
        where: { customerId: req.auth!.userId },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: {
          restaurant: { select: { id: true, name: true, logoUrl: true } },
          items: true,
          payment: { select: { status: true } },
        },
      }),
    ]);
    return ok(res, { items, total, page: params.page, pageSize: params.pageSize });
  }),
);

// GET /api/v1/orders/:id
router.get(
  '/:id',
  requireRoles('CUSTOMER', 'RESTAURANT', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const order = await db.order.findUnique({
      where: { id: req.params.id as string },
      include: {
        restaurant: true,
        items: true,
        payment: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw (await import('@/lib/errors')).AppError.notFound('Order');
    const { AppError } = await import('@/lib/errors');
    if (req.auth!.role === 'CUSTOMER' && order.customerId !== req.auth!.userId) throw AppError.forbidden('Not your order');
    if (req.auth!.role !== 'ADMIN' && req.auth!.role !== 'CUSTOMER') throw AppError.forbidden('Only admin or order owner');
    return ok(res, order);
  }),
);

// GET /api/v1/orders/:id/tracking
router.get(
  '/:id/tracking',
  requireRoles('CUSTOMER', 'RESTAURANT', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const tracking = await OrderService.getTracking(req.params.id as string, req.auth!);
    return ok(res, tracking);
  }),
);

// POST /api/v1/orders/:id/cancel
router.post(
  '/:id/cancel',
  requireRoles('CUSTOMER', 'ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = cancelOrderSchema.parse(req.body || {});
    const order = await OrderService.cancelOrder(req.params.id as string, req.auth!, parsed.reason);
    return ok(res, order);
  }),
);

export { router as orderRoutes };
