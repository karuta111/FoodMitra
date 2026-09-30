// src/modules/menu/menu.routes.ts
import { Router } from 'express';
import { MenuService } from '@/lib/services/menu.service';
import { menuItemBodySchema, menuCategoryBodySchema } from '@/lib/validators';
import { asyncHandler, ok, noContent } from '@/lib/api-response';
import { requireRoles } from '@/middleware/auth';
import { AppError } from '@/lib/errors';

const router = Router();

// All menu mutations are admin-only now (no restaurant owner self-service)

// POST /api/v1/menu/categories — create a menu category (body: { restaurantId, name, displayOrder? })
router.post(
  '/categories',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const { restaurantId, ...rest } = req.body as { restaurantId: string; name: string; displayOrder?: number };
    if (!restaurantId) throw AppError.badRequest('restaurantId is required');
    const parsed = menuCategoryBodySchema.parse(rest);
    const cat = await MenuService.createCategory(restaurantId, req.auth!, parsed);
    return ok(res, cat, 201);
  }),
);

// PATCH /api/v1/menu/items/:id/availability
router.patch(
  '/items/:id/availability',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const availability = req.body.availability as 'AVAILABLE' | 'UNAVAILABLE';
    if (!['AVAILABLE', 'UNAVAILABLE'].includes(availability)) {
      throw AppError.badRequest('availability must be AVAILABLE or UNAVAILABLE');
    }
    const updated = await MenuService.setAvailability(req.params.id as string, req.auth!, availability);
    return ok(res, updated);
  }),
);

// POST /api/v1/menu/items — create a menu item (body: { restaurantId, categoryId, name, price, ... })
router.post(
  '/items',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const { restaurantId, ...rest } = req.body as { restaurantId: string } & Record<string, unknown>;
    if (!restaurantId) throw AppError.badRequest('restaurantId is required');
    const parsed = menuItemBodySchema.parse(rest);
    const item = await MenuService.createItem(restaurantId, req.auth!, {
      categoryId: parsed.categoryId,
      name: parsed.name,
      description: parsed.description,
      price: parsed.price,
      imageUrl: parsed.imageUrl || undefined,
      isVeg: parsed.isVeg,
      availability: parsed.availability,
      prepTimeMinutes: parsed.prepTimeMinutes,
      displayOrder: parsed.displayOrder,
    });
    return ok(res, item, 201);
  }),
);

// PATCH /api/v1/menu/items/:id
router.patch(
  '/items/:id',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = menuItemBodySchema.partial().parse(req.body);
    const updated = await MenuService.updateItem(req.params.id as string, req.auth!, parsed as Record<string, unknown>);
    return ok(res, updated);
  }),
);

// DELETE /api/v1/menu/items/:id
router.delete(
  '/items/:id',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    await MenuService.deleteItem(req.params.id as string, req.auth!);
    return noContent(res);
  }),
);

// PATCH /api/v1/menu/categories/:id
router.patch(
  '/categories/:id',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    const parsed = menuCategoryBodySchema.partial().parse(req.body);
    const updated = await MenuService.updateCategory(req.params.id as string, req.auth!, parsed);
    return ok(res, updated);
  }),
);

// DELETE /api/v1/menu/categories/:id
router.delete(
  '/categories/:id',
  requireRoles('ADMIN'),
  asyncHandler(async (req, res) => {
    await MenuService.deleteCategory(req.params.id as string, req.auth!);
    return noContent(res);
  }),
);

export { router as menuRoutes };
