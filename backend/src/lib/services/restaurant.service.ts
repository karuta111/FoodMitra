// src/lib/services/restaurant.service.ts
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { haversineKm } from './pricing.service';
import type { AuthContext } from '@/lib/auth/session';

export class RestaurantService {
  static async listPublic(params: {
    q?: string;
    cuisine?: string;
    veg?: boolean;
    open?: boolean;
    lat?: number;
    lng?: number;
    radiusKm?: number;
    page: number;
    pageSize: number;
  }) {
    const where = {
      status: 'ACTIVE' as const,
      ...(params.open !== undefined ? { availability: 'OPEN' as const } : {}),
      ...(params.q
        ? { name: { contains: params.q } }
        : {}),
      ...(params.cuisine ? { cuisine: params.cuisine } : {}),
    };
    const [total, restaurants] = await Promise.all([
      db.restaurant.count({ where }),
      db.restaurant.findMany({
        where,
        orderBy: params.lat !== undefined && params.lng !== undefined
          ? undefined
          : { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { address: true },
      }),
    ]);

    let items = restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      logoUrl: r.logoUrl,
      cuisine: r.cuisine,
      avgRating: r.avgRating,
      ratingCount: r.ratingCount,
      deliveryFee: r.deliveryFee,
      prepTimeMinutes: 25, // MVP default
      availability: r.availability,
      latitude: r.latitude,
      longitude: r.longitude,
      address: r.address
        ? `${r.address.line1}, ${r.address.city}`
        : '',
      distanceKm: params.lat !== undefined && params.lng !== undefined
        ? round2(haversineKm(params.lat, params.lng, r.latitude, r.longitude))
        : null,
    }));

    // Sort by distance if lat/lng provided
    if (params.lat !== undefined && params.lng !== undefined) {
      items = items.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      // Filter by radius if provided
      if (params.radiusKm) {
        items = items.filter((r) => r.distanceKm === null || r.distanceKm <= params.radiusKm!);
      }
    }

    return {
      items,
      total,
      page: params.page,
      pageSize: params.pageSize,
      hasMore: params.page * params.pageSize < total,
    };
  }

  static async getPublic(restaurantId: string) {
    const r = await db.restaurant.findUnique({
      where: { id: restaurantId },
      include: { address: true, menuCategories: { include: { items: { orderBy: { displayOrder: 'asc' } } }, orderBy: { displayOrder: 'asc' } } },
    });
    if (!r || r.status !== 'ACTIVE') throw AppError.notFound('Restaurant');
    return r;
  }

  // Admin actions
  static async approve(restaurantId: string, ctx: AuthContext) {
    if (ctx.role !== 'ADMIN') throw AppError.forbidden();
    const r = await db.restaurant.findUnique({ where: { id: restaurantId } });
    if (!r) throw AppError.notFound('Restaurant');
    if (r.status !== 'PENDING_APPROVAL') {
      throw AppError.conflict('INVALID_STATE_TRANSITION', `Cannot approve from ${r.status}`);
    }
    return db.restaurant.update({
      where: { id: restaurantId },
      data: { status: 'ACTIVE', availability: 'OPEN', rejectionReason: null },
    });
  }

  static async reject(restaurantId: string, reason: string, ctx: AuthContext) {
    if (ctx.role !== 'ADMIN') throw AppError.forbidden();
    return db.restaurant.update({
      where: { id: restaurantId },
      data: { status: 'REJECTED', rejectionReason: reason },
    });
  }

  static async suspend(restaurantId: string, ctx: AuthContext) {
    if (ctx.role !== 'ADMIN') throw AppError.forbidden();
    return db.restaurant.update({
      where: { id: restaurantId },
      data: { status: 'SUSPENDED', availability: 'CLOSED' },
    });
  }

  static async activate(restaurantId: string, ctx: AuthContext) {
    if (ctx.role !== 'ADMIN') throw AppError.forbidden();
    return db.restaurant.update({
      where: { id: restaurantId },
      data: { status: 'ACTIVE', availability: 'OPEN' },
    });
  }

  static async adminList(params: { q?: string; status?: string; page: number; pageSize: number }) {
    const where = {
      ...(params.q ? { name: { contains: params.q } } : {}),
      ...(params.status ? { status: params.status as never } : {}),
    };
    const [total, items] = await Promise.all([
      db.restaurant.count({ where }),
      db.restaurant.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { address: true },
      }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
