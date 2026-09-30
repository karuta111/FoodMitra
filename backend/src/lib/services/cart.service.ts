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
}
