// src/lib/services/menu.service.ts
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { AuthContext } from '@/lib/auth/session';

export class MenuService {
  static async getMenu(restaurantId: string) {
    const restaurant = await db.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        address: true,
        menuCategories: {
          include: {
            items: { orderBy: { displayOrder: 'asc' } },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
    if (!restaurant) throw AppError.notFound('Restaurant');
    // Only ACTIVE restaurants are publicly visible
    return restaurant;
  }

  static async createCategory(restaurantId: string, ctx: AuthContext, data: { name: string; displayOrder?: number }) {
    await this.assertOwnership(restaurantId, ctx);
    return db.menuCategory.create({
      data: { restaurantId, name: data.name, displayOrder: data.displayOrder ?? 0 },
    });
  }

  static async updateCategory(categoryId: string, ctx: AuthContext, patch: { name?: string; displayOrder?: number }) {
    const cat = await db.menuCategory.findUnique({ where: { id: categoryId }, include: { restaurant: true } });
    if (!cat) throw AppError.notFound('Category');
    await this.assertOwnership(cat.restaurantId, ctx);
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.displayOrder !== undefined) data.displayOrder = patch.displayOrder;
    return db.menuCategory.update({ where: { id: categoryId }, data });
  }

  static async deleteCategory(categoryId: string, ctx: AuthContext) {
    const cat = await db.menuCategory.findUnique({ where: { id: categoryId } });
    if (!cat) throw AppError.notFound('Category');
    await this.assertOwnership(cat.restaurantId, ctx);
    return db.menuCategory.delete({ where: { id: categoryId } });
  }

  static async createItem(restaurantId: string, ctx: AuthContext, data: {
    categoryId: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isVeg?: boolean;
    availability?: 'AVAILABLE' | 'UNAVAILABLE';
    prepTimeMinutes?: number;
    displayOrder?: number;
  }) {
    await this.assertOwnership(restaurantId, ctx);
    // Verify category belongs to restaurant
    const cat = await db.menuCategory.findUnique({ where: { id: data.categoryId } });
    if (!cat || cat.restaurantId !== restaurantId) {
      throw AppError.badRequest('Category does not belong to your restaurant');
    }
    return db.menuItem.create({
      data: {
        categoryId: data.categoryId,
        restaurantId,
        name: data.name,
        description: data.description || null,
        price: data.price,
        imageUrl: data.imageUrl || null,
        isVeg: data.isVeg ?? true,
        availability: data.availability ?? 'AVAILABLE',
        prepTimeMinutes: data.prepTimeMinutes ?? 15,
        displayOrder: data.displayOrder ?? 0,
      },
    });
  }

  static async updateItem(itemId: string, ctx: AuthContext, patch: Record<string, unknown>) {
    const item = await db.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw AppError.notFound('Menu item');
    await this.assertOwnership(item.restaurantId, ctx);
    const allowed: Record<string, unknown> = {};
    const permittedFields = [
      'name', 'description', 'price', 'imageUrl', 'isVeg', 'availability',
      'prepTimeMinutes', 'displayOrder', 'categoryId',
    ];
    for (const f of permittedFields) {
      if (patch[f] !== undefined) allowed[f] = patch[f];
    }
    return db.menuItem.update({ where: { id: itemId }, data: allowed });
  }

  static async deleteItem(itemId: string, ctx: AuthContext) {
    const item = await db.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw AppError.notFound('Menu item');
    await this.assertOwnership(item.restaurantId, ctx);

    // If any past OrderItem references this menu item, we can't hard-delete without
    // breaking order history (OrderItem_menuItemId_fkey). Instead, soft-remove:
    // mark UNAVAILABLE so it stops showing on the menu but order snapshots stay intact.
    const orderItemCount = await db.orderItem.count({ where: { menuItemId: itemId } });
    if (orderItemCount > 0) {
      const updated = await db.menuItem.update({
        where: { id: itemId },
        data: { availability: 'UNAVAILABLE' },
      });
      return {
        action: 'unavailable' as const,
        message: `This item appears in ${orderItemCount} past order${orderItemCount === 1 ? '' : 's'} — marked as Unavailable instead of deleted to preserve order history.`,
        item: updated,
      };
    }

    await db.menuItem.delete({ where: { id: itemId } });
    return {
      action: 'deleted' as const,
      message: 'Item deleted.',
      item: null,
    };
  }

  static async setAvailability(itemId: string, ctx: AuthContext, availability: 'AVAILABLE' | 'UNAVAILABLE') {
    const item = await db.menuItem.findUnique({ where: { id: itemId } });
    if (!item) throw AppError.notFound('Menu item');
    await this.assertOwnership(item.restaurantId, ctx);
    return db.menuItem.update({ where: { id: itemId }, data: { availability } });
  }

  static async assertOwnership(_restaurantId: string, ctx: AuthContext) {
    // Admin manages all restaurants now — no restaurant self-service.
    if (ctx.role !== 'ADMIN') throw AppError.forbidden('Admin only');
  }
}
