// src/modules/cart/cart.routes.ts
import { Router } from 'express';
import { CartService } from '@/lib/services/cart.service';
import { addCartItemSchema, updateCartItemSchema } from '@/lib/validators';
import { asyncHandler, ok, noContent } from '@/lib/api-response';
import { requireRoles } from '@/middleware/auth';

const router = Router();

// GET /api/v1/cart?deliveryAddressId=<addr-id>
// When deliveryAddressId is provided, the delivery fee is computed from the
// admin-configured distance-based tier that matches the haversine distance
// between the address and the restaurant.
router.get(
  '/',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const deliveryAddressId = (req.query.deliveryAddressId as string | undefined) || undefined;
    const cart = await CartService.getCart(req.auth!.userId, { deliveryAddressId });
    return ok(res, cart);
  }),
);

// DELETE /api/v1/cart (clear cart)
router.delete(
  '/',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    await CartService.clearCart(req.auth!.userId);
    return noContent(res);
  }),
);

// POST /api/v1/cart/items
router.post(
  '/items',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const parsed = addCartItemSchema.parse(req.body);
    const cart = await CartService.addItem(req.auth!.userId, parsed.menuItemId, parsed.quantity, parsed.replaceRestaurant);
    return ok(res, cart, 201);
  }),
);

// PATCH /api/v1/cart/items/:id
router.patch(
  '/items/:id',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    const parsed = updateCartItemSchema.parse(req.body);
    const cart = await CartService.updateItem(req.auth!.userId, req.params.id as string, parsed.quantity);
    return ok(res, cart);
  }),
);

// DELETE /api/v1/cart/items/:id
router.delete(
  '/items/:id',
  requireRoles('CUSTOMER'),
  asyncHandler(async (req, res) => {
    await CartService.removeItem(req.auth!.userId, req.params.id as string);
    return noContent(res);
  }),
);

export { router as cartRoutes };
