// src/modules/restaurants/restaurants.routes.ts
import { Router } from 'express';
import { RestaurantService } from '@/lib/services/restaurant.service';
import { MenuService } from '@/lib/services/menu.service';
import { restaurantQuerySchema, restaurantUpdateSchema, menuItemBodySchema, menuCategoryBodySchema } from '@/lib/validators';
import { asyncHandler, ok } from '@/lib/api-response';
import { requireRoles } from '@/middleware/auth';
import { AppError } from '@/lib/errors';
import { db } from '@/lib/db';

const router = Router();

// GET /api/v1/restaurants (public, with filters)
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const params = restaurantQuerySchema.parse(req.query);
    const result = await RestaurantService.listPublic(params);
    return ok(res, result);
  }),
);

// GET /api/v1/restaurants/nearby (public)
router.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const params = restaurantQuerySchema.parse(req.query);
    const result = await RestaurantService.listPublic(params);
    return ok(res, result);
  }),
);

// GET /api/v1/restaurants/:id (public)
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const restaurant = await RestaurantService.getPublic(req.params.id as string);
    return ok(res, restaurant);
  }),
);

// PATCH /api/v1/restaurants/:id — admin only (no more restaurant self-service)
router.patch(
  '/:id',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const id = req.params.id as string;
    const parsed = restaurantUpdateSchema.parse(req.body);

    const { address: addressPatch, ...restaurantPatch } = parsed as Record<string, unknown> & {
      address?: Record<string, unknown>;
    };

    const updated = await db.restaurant.update({ where: { id }, data: restaurantPatch as Record<string, unknown> });
    if (addressPatch) {
      const existing = await db.restaurantAddress.findUnique({ where: { restaurantId: id } });
      if (existing) {
        await db.restaurantAddress.update({ where: { restaurantId: id }, data: addressPatch as Record<string, unknown> });
      } else {
        await db.restaurantAddress.create({
          data: {
            restaurantId: id,
            line1: (addressPatch as any).line1 ?? 'Unknown',
            line2: (addressPatch as any).line2 ?? null,
            city: (addressPatch as any).city ?? 'Unknown',
            state: (addressPatch as any).state ?? null,
            postalCode: (addressPatch as any).postalCode ?? null,
            latitude: (addressPatch as any).latitude ?? 0,
            longitude: (addressPatch as any).longitude ?? 0,
          },
        });
      }
    }
    const refreshed = await db.restaurant.findUnique({ where: { id }, include: { address: true } });
    return ok(res, refreshed);
  }),
);

// POST /api/v1/restaurants — admin creates restaurant (no owner)
router.post(
  '/',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const body = req.body as any;
    const { address: addressPatch, ...restaurantData } = body;
    const created = await db.restaurant.create({
      data: {
        name: restaurantData.name,
        cuisine: restaurantData.cuisine,
        phone: restaurantData.phone,
        email: restaurantData.email ?? null,
        description: restaurantData.description ?? null,
        openingTime: restaurantData.openingTime ?? "09:00",
        closingTime: restaurantData.closingTime ?? "23:00",
        availability: (restaurantData.availability as any) ?? "CLOSED",
        latitude: restaurantData.latitude,
        longitude: restaurantData.longitude,
        logoUrl: restaurantData.logoUrl ?? null,
        status: "ACTIVE",
      },
    });
    if (addressPatch) {
      await db.restaurantAddress.create({
        data: {
          restaurantId: created.id,
          line1: addressPatch.line1,
          line2: addressPatch.line2 ?? null,
          city: addressPatch.city,
          state: addressPatch.state ?? null,
          postalCode: addressPatch.postalCode ?? null,
          latitude: addressPatch.latitude,
          longitude: addressPatch.longitude,
        },
      });
    }
    const refreshed = await db.restaurant.findUnique({ where: { id: created.id }, include: { address: true } });
    return ok(res, refreshed, 201);
  }),
);

// GET /api/v1/restaurants/:id/menu (public)
router.get(
  '/:id/menu',
  asyncHandler(async (req, res) => {
    const menu = await MenuService.getMenu(req.params.id as string);
    return ok(res, menu);
  }),
);

// POST /api/v1/restaurants/:id/menu/categories — admin only
router.post(
  '/:id/menu/categories',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = menuCategoryBodySchema.parse(req.body);
    const category = await MenuService.createCategory(req.params.id as string, req.auth!, parsed);
    return ok(res, category, 201);
  }),
);

// POST /api/v1/restaurants/:id/menu/items — admin only
router.post(
  '/:id/menu/items',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = menuItemBodySchema.parse(req.body);
    const item = await MenuService.createItem(req.params.id as string, req.auth!, parsed);
    return ok(res, item, 201);
  }),
);

export { router as restaurantRoutes };
