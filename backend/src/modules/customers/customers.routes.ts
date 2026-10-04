// src/modules/customers/customers.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { addressBodySchema } from '@/lib/validators';
import { asyncHandler, ok, noContent } from '@/lib/api-response';
import { requireRoles } from '@/middleware/auth';

const router = Router();

const patchProfileSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().max(20).optional(),
  defaultAddressId: z.string().optional(),
});

// GET /api/v1/customers/profile
router.get(
  '/profile',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const user = await db.user.findUnique({
      where: { id: req.auth!.userId },
      include: { customerProfile: { include: { defaultAddress: true } } },
    });
    return ok(res, user?.customerProfile);
  }),
);

// PATCH /api/v1/customers/profile
router.patch(
  '/profile',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const parsed = patchProfileSchema.parse(req.body);
    const existing = await db.customerProfile.findUnique({ where: { userId: req.auth!.userId } });
    if (!existing) throw AppError.notFound('Customer profile');
    const updated = await db.customerProfile.update({ where: { userId: req.auth!.userId }, data: parsed });
    return ok(res, updated);
  }),
);

// GET /api/v1/customers/addresses
router.get(
  '/addresses',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const addresses = await db.deliveryAddress.findMany({
      where: { customerId: req.auth!.userId },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, addresses);
  }),
);

// POST /api/v1/customers/addresses
router.post(
  '/addresses',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const parsed = addressBodySchema.parse(req.body);
    const addr = await db.deliveryAddress.create({
      data: {
        customerId: req.auth!.userId,
        label: parsed.label || 'HOME',
        line1: parsed.line1,
        line2: parsed.line2 || null,
        city: parsed.city,
        state: parsed.state || null,
        postalCode: parsed.postalCode || null,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      },
    });
    return ok(res, addr, 201);
  }),
);

// PATCH /api/v1/customers/addresses/:id
router.patch(
  '/addresses/:id',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const parsed = addressBodySchema.partial().parse(req.body);
    const addr = await db.deliveryAddress.findUnique({ where: { id: req.params.id as string } });
    if (!addr || addr.customerId !== req.auth!.userId) throw AppError.notFound('Address');
    const updated = await db.deliveryAddress.update({ where: { id: req.params.id as string }, data: parsed as Record<string, unknown> });
    return ok(res, updated);
  }),
);

// DELETE /api/v1/customers/addresses/:id
router.delete(
  '/addresses/:id',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const addr = await db.deliveryAddress.findUnique({ where: { id: req.params.id as string } });
    if (!addr || addr.customerId !== req.auth!.userId) throw AppError.notFound('Address');
    await db.deliveryAddress.delete({ where: { id: req.params.id as string } });
    return noContent(res);
  }),
);

// POST /api/v1/customers/push-token
// Mobile app registers its Expo push token so the backend can send order status notifications.
router.post(
  '/push-token',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const { token } = z.object({ token: z.string().min(10) }).parse(req.body);
    const profile = await db.customerProfile.findUnique({ where: { userId: req.auth!.userId } });
    if (!profile) throw AppError.notFound('Customer profile');
    await db.customerProfile.update({
      where: { userId: req.auth!.userId },
      data: { expoPushToken: token },
    });
    return ok(res, { registered: true });
  }),
);

export { router as customerRoutes };
