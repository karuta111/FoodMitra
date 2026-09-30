// src/modules/notifications/notifications.routes.ts
import { Router } from 'express';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { notificationQuerySchema } from '@/lib/validators';
import { asyncHandler, ok, noContent } from '@/lib/api-response';
import { requireAuth } from '@/middleware/auth';

const router = Router();

// GET /api/v1/notifications
router.get(
  '/',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const params = notificationQuerySchema.parse(req.query);
    const where = {
      recipientId: req.auth!.userId,
      ...(params.unreadOnly ? { isRead: false } : {}),
    };
    const [total, items] = await Promise.all([
      db.notification.count({ where }),
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return ok(res, { items, total, page: params.page, pageSize: params.pageSize });
  }),
);

// GET /api/v1/notifications/unread-count
router.get(
  '/unread-count',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const count = await db.notification.count({ where: { recipientId: req.auth!.userId, isRead: false } });
    return ok(res, { count });
  }),
);

// POST /api/v1/notifications/read-all
router.post(
  '/read-all',
  requireAuth(),
  asyncHandler(async (req, res) => {
    await db.notification.updateMany({ where: { recipientId: req.auth!.userId, isRead: false }, data: { isRead: true } });
    return ok(res, { message: 'All marked as read' });
  }),
);

// POST /api/v1/notifications/:id/read
router.post(
  '/:id/read',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const notif = await db.notification.findUnique({ where: { id: req.params.id as string } });
    if (!notif) throw AppError.notFound('Notification');
    if (notif.recipientId !== req.auth!.userId) throw AppError.forbidden('Not your notification');
    const updated = await db.notification.update({ where: { id: req.params.id as string }, data: { isRead: true } });
    return ok(res, updated);
  }),
);

export { router as notificationRoutes };
