// src/lib/services/review.service.ts
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { AuthContext } from '@/lib/auth/session';

export class ReviewService {
  static async create(input: { orderId: string; rating: number; comment?: string }, ctx: AuthContext) {
    if (ctx.role !== 'CUSTOMER') throw AppError.forbidden('Only customers can review');
    const order = await db.order.findUnique({ where: { id: input.orderId } });
    if (!order) throw AppError.notFound('Order');
    if (order.customerId !== ctx.userId) throw AppError.forbidden('Not your order');
    if (order.orderStatus !== 'DELIVERED') {
      throw new AppError('CONFLICT', 'Only delivered orders can be reviewed', 409);
    }

    const existing = await db.review.findUnique({ where: { orderId: input.orderId } });
    if (existing) throw AppError.conflict('DUPLICATE_REVIEW', 'You have already reviewed this order');

    const review = await db.review.create({
      data: {
        orderId: input.orderId,
        customerId: ctx.userId,
        restaurantId: order.restaurantId,
        rating: input.rating,
        comment: input.comment || null,
      },
    });

    // Update restaurant avg rating
    const agg = await db.review.aggregate({
      where: { restaurantId: order.restaurantId, isHidden: false },
      _avg: { rating: true },
      _count: true,
    });
    await db.restaurant.update({
      where: { id: order.restaurantId },
      data: {
        avgRating: Math.round((agg._avg.rating ?? 0) * 100) / 100,
        ratingCount: agg._count,
      },
    });

    return review;
  }

  static async listForRestaurant(restaurantId: string, page: number, pageSize: number) {
    const [total, items] = await Promise.all([
      db.review.count({ where: { restaurantId, isHidden: false } }),
      db.review.findMany({
        where: { restaurantId, isHidden: false },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { customer: { select: { email: true } } },
      }),
    ]);
    return { items, total, page, pageSize };
  }

  static async moderate(reviewId: string, isHidden: boolean, ctx: AuthContext) {
    if (ctx.role !== 'ADMIN') throw AppError.forbidden();
    const review = await db.review.findUnique({ where: { id: reviewId } });
    if (!review) throw AppError.notFound('Review');
    const updated = await db.review.update({ where: { id: reviewId }, data: { isHidden } });
    // Recompute restaurant rating
    const agg = await db.review.aggregate({
      where: { restaurantId: review.restaurantId, isHidden: false },
      _avg: { rating: true },
      _count: true,
    });
    await db.restaurant.update({
      where: { id: review.restaurantId },
      data: {
        avgRating: Math.round((agg._avg.rating ?? 0) * 100) / 100,
        ratingCount: agg._count,
      },
    });
    return updated;
  }

  static async adminList(page: number, pageSize: number) {
    const [total, items] = await Promise.all([
      db.review.count(),
      db.review.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { restaurant: { select: { name: true } }, customer: { select: { email: true } } },
      }),
    ]);
    return { items, total, page, pageSize };
  }
}
