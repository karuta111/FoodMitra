// src/lib/services/cart.service.ts
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { PricingService } from './pricing.service';

export class CartService {
  static async getCart(customerId: string, opts: { deliveryAddressId?: string } = {}) {
    const cart = await db.cart.findUnique({
      where: { customerId },
      include: {
        items: { include: { menuItem: true } },
        restaurant: true,
      },
    });
    if (!cart) return null;
    const pricing = await PricingService.computeCartPricing(cart.id, {
      deliveryAddressId: opts.deliveryAddressId,
    });

    console.log({
      id: cart.id,
      restaurant: {
        id: cart.restaurant.id,
        name: cart.restaurant.name,
      },
      items: pricing.items,
      subtotal: pricing.subtotal,
      estimatedDeliveryFee: pricing.deliveryFee,
      deliveryFeeSource: pricing.deliveryFeeSource,
      deliveryDistanceKm: pricing.deliveryDistanceKm,
      estimatedTotal: pricing.totalAmount,
      minOrderAmount: pricing.minOrderAmount,
      meetsMinimum: pricing.meetsMinimum,
    })
    return {
      id: cart.id,
      restaurant: {
        id: cart.restaurant.id,
        name: cart.restaurant.name,
      },
      items: pricing.items,
      subtotal: pricing.subtotal,
      estimatedDeliveryFee: pricing.deliveryFee,
      deliveryFeeSource: pricing.deliveryFeeSource,
      deliveryDistanceKm: pricing.deliveryDistanceKm,
      estimatedTotal: pricing.totalAmount,
      minOrderAmount: pricing.minOrderAmount,
      meetsMinimum: pricing.meetsMinimum,
    };
  }

  static async addItem(customerId: string, menuItemId: string, quantity: number, replaceRestaurant: boolean) {
    const menuItem = await db.menuItem.findUnique({
      where: { id: menuItemId },
      include: { restaurant: true },
    });
    if (!menuItem) throw AppError.notFound('Menu item');
    if (menuItem.availability !== 'AVAILABLE') {
      throw new AppError('MENU_ITEM_NOT_AVAILABLE', 'Menu item is unavailable', 409);
    }
    if (menuItem.restaurant.status !== 'ACTIVE') {
      throw new AppError('RESTAURANT_NOT_AVAILABLE', 'Restaurant is not active', 409);
    }

    // Get or create cart
    let cart = await db.cart.findUnique({ where: { customerId }, include: { items: true } });

    if (cart && cart.restaurantId !== menuItem.restaurantId) {
      if (!replaceRestaurant) {
        throw AppError.conflict(
          'CART_RESTAURANT_MISMATCH',
          'Your cart has items from another restaurant. Clear cart and add this item?',
          {
            currentRestaurantId: cart.restaurantId,
            requestedRestaurantId: menuItem.restaurantId,
          },
        );
      }
      // Replace: delete existing cart
      await db.cart.delete({ where: { id: cart.id } });
      cart = null;
    }

    if (!cart) {
      cart = await db.cart.create({
        data: { customerId, restaurantId: menuItem.restaurantId },
        include: { items: true },
      });
    }

    // Check if item already in cart
    const existing = cart.items.find((ci) => ci.menuItemId === menuItemId);
    if (existing) {
      await db.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + quantity },
      });
    } else {
      await db.cartItem.create({
        data: {
          cartId: cart.id,
          menuItemId,
          quantity,
          unitPrice: menuItem.price, // snapshot — but always re-fetched at checkout
        },
      });
    }

    return this.getCart(customerId);
  }

  static async updateItem(customerId: string, cartItemId: string, quantity: number) {
    const cart = await db.cart.findUnique({ where: { customerId }, include: { items: true } });
    if (!cart) throw AppError.notFound('Cart');
    const item = cart.items.find((ci) => ci.id === cartItemId);
    if (!item) throw AppError.notFound('Cart item');
    await db.cartItem.update({ where: { id: cartItemId }, data: { quantity } });
    return this.getCart(customerId);
  }

  static async removeItem(customerId: string, cartItemId: string) {
    const cart = await db.cart.findUnique({ where: { customerId }, include: { items: true } });
    if (!cart) throw AppError.notFound('Cart');
    const item = cart.items.find((ci) => ci.id === cartItemId);
    if (!item) throw AppError.notFound('Cart item');
    await db.cartItem.delete({ where: { id: cartItemId } });
    // If cart is empty, delete it too
    const remaining = await db.cartItem.count({ where: { cartId: cart.id } });
    if (remaining === 0) {
      await db.cart.delete({ where: { id: cart.id } });
    }
    return this.getCart(customerId);
  }

  static async clearCart(customerId: string) {
    const cart = await db.cart.findUnique({ where: { customerId } });
    if (!cart) return null;
    await db.cart.delete({ where: { id: cart.id } });
    return null;
  }

  /**
   * Atomically replace the DB cart with the items the mobile client has
   * accumulated in memory. Called once, right before order placement.
   *
   * Validates that:
   *  - The restaurant exists and is ACTIVE + OPEN
   *  - Every menuItemId belongs to that restaurant and is AVAILABLE
   *
   * Returns the final Cart shape (with server-computed pricing) so the
   * CheckoutScreen can show accurate totals before the user confirms.
   */
  static async syncCart(
    customerId: string,
    restaurantId: string,
    items: Array<{ menuItemId: string; quantity: number }>,
    deliveryAddressId?: string,
  ) {
    // Validate restaurant
    const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) throw AppError.notFound('Restaurant');
    if (restaurant.status !== 'ACTIVE') {
      throw new AppError('RESTAURANT_NOT_AVAILABLE', 'Restaurant is not active', 409);
    }

    // Validate every menu item
    const menuItems = await db.menuItem.findMany({
      where: { id: { in: items.map((i) => i.menuItemId) } },
    });

    for (const item of items) {
      const mi = menuItems.find((m) => m.id === item.menuItemId);
      if (!mi) throw AppError.notFound(`Menu item ${item.menuItemId}`);
      if (mi.restaurantId !== restaurantId) {
        throw new AppError('MENU_ITEM_RESTAURANT_MISMATCH', `Item ${mi.name} does not belong to this restaurant`, 409);
      }
      if (mi.availability !== 'AVAILABLE') {
        throw new AppError('MENU_ITEM_NOT_AVAILABLE', `${mi.name} is no longer available`, 409);
      }
    }

    // Atomically wipe the old cart (if any) and write the new one
    await db.$transaction(async (tx) => {
      const existing = await tx.cart.findUnique({ where: { customerId } });
      if (existing) {
        await tx.cartItem.deleteMany({ where: { cartId: existing.id } });
        await tx.cart.delete({ where: { id: existing.id } });
      }

      const cart = await tx.cart.create({
        data: { customerId, restaurantId },
      });

      await tx.cartItem.createMany({
        data: items.map((i) => ({
          cartId: cart.id,
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          // Price snapshot — order.service re-fetches from DB at order creation anyway
          unitPrice: menuItems.find((m) => m.id === i.menuItemId)!.price,
        })),
      });
    });

    return this.getCart(customerId, { deliveryAddressId });
  }
}
