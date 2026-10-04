// src/lib/services/admin.service.ts
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import type { AuthContext } from '@/lib/auth/session';

export class AdminService {
  static async dashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalCustomers,
      totalRestaurants,
      activeRestaurants,
      pendingRestaurants,
      ordersToday,
      pendingOrders,
      deliveredOrders,
      todayPayments,
      pendingReviews,
      activeOrders,
      deliveredToday,
    ] = await Promise.all([
      db.user.count({ where: { role: 'CUSTOMER' } }),
      db.restaurant.count(),
      db.restaurant.count({ where: { status: 'ACTIVE' } }),
      db.restaurant.count({ where: { status: 'PENDING_APPROVAL' } }),
      db.order.count({ where: { createdAt: { gte: todayStart } } }),
      // Pending orders = PLACED (just placed, awaiting admin approval) + APPROVED (approved but not yet paid)
      db.order.count({ where: { orderStatus: { in: ['PLACED', 'APPROVED'] } } }),
      db.order.count({ where: { orderStatus: 'DELIVERED' } }),
      db.payment.aggregate({
        where: { status: 'CAPTURED', createdAt: { gte: todayStart } },
        _sum: { amount: true },
        _count: true,
      }),
      db.review.count({ where: { isHidden: false } }),
      // Active orders = today's orders currently in-flight (PLACED + APPROVED + PAID, not yet DELIVERED/CANCELLED).
      // Scoped to createdAt >= todayStart so it reconciles with Orders Today:
      //   Orders Today = Active + Delivered + Cancelled (all today, by createdAt)
      db.order.count({
        where: {
          createdAt: { gte: todayStart },
          orderStatus: { in: ['PLACED', 'APPROVED', 'PAID'] },
        },
      }),
      // Delivered today = orders created today that reached DELIVERED.
      // Uses createdAt (not updatedAt) so it stays in the same time window as Orders Today.
      db.order.count({
        where: {
          createdAt: { gte: todayStart },
          orderStatus: 'DELIVERED',
        },
      }),
    ]);

    return {
      customers: { total: totalCustomers },
      restaurants: {
        total: totalRestaurants,
        active: activeRestaurants,
        pending: pendingRestaurants,
      },
      orders: {
        today: ordersToday,
        pending: pendingOrders,
        delivered: deliveredOrders,
        active: activeOrders,
        deliveredToday,
      },
      revenue: {
        today: todayPayments._sum.amount ?? 0,
        todayCount: todayPayments._count,
      },
      reviews: { total: pendingReviews },
    };
  }

  static async listCustomers(params: { q?: string; page: number; pageSize: number }) {
    const where = {
      role: 'CUSTOMER' as const,
      ...(params.q ? {
        OR: [
          { email: { contains: params.q, mode: 'insensitive' as const } },
          { customerProfile: { fullName: { contains: params.q, mode: 'insensitive' as const } } },
          { phone: { contains: params.q, mode: 'insensitive' as const } },
        ],
      } : {}),
    };
    const [total, items] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { customerProfile: true },
      }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  static async listOrders(params: { status?: string; restaurantId?: string; customerId?: string; date?: string; page: number; pageSize: number }) {
    // Date filter: when `date` (YYYY-MM-DD) is provided, only orders created on that calendar day are returned.
    // Empty string = all dates.
    let dateFilter: { gte?: Date; lt?: Date } | undefined;
    if (params.date) {
      const [y, m, d] = params.date.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      dateFilter = { gte: start, lt: new Date(end.getTime() + 1) };
    }
    const where = {
      ...(params.status ? { orderStatus: params.status as never } : {}),
      ...(params.restaurantId ? { restaurantId: params.restaurantId } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(dateFilter ? { createdAt: dateFilter } : {}),
    };
    const [total, items] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          restaurant: { select: { name: true } },
          customer: { select: { phone: true, email: true, customerProfile: { select: { fullName: true } } } },
          items: true,
        },
      }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  static async listPayments(params: { status?: string; page: number; pageSize: number }) {
    const where = {
      ...(params.status ? { status: params.status as never } : {}),
    };
    const [total, items] = await Promise.all([
      db.payment.count({ where }),
      db.payment.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { createdAt: 'desc' },
        include: { order: { select: { shortCode: true, restaurant: { select: { name: true } } } } },
      }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  static async setCustomerBlocked(userId: string, isBlocked: boolean, _ctx: AuthContext) {
    return db.user.update({ where: { id: userId }, data: { isActive: !isBlocked } });
  }

  // --- Distance-based delivery fee tiers ---

  static async listDeliveryFeeTiers() {
    return db.deliveryFeeTier.findMany({
      orderBy: [{ minKm: 'asc' }, { maxKm: 'asc' }],
    });
  }

  static async createDeliveryFeeTier(input: { minKm: number; maxKm: number; fee: number; isActive?: boolean }) {
    if (input.minKm < 0) throw AppError.badRequest('minKm must be >= 0');
    if (input.maxKm <= input.minKm) throw AppError.badRequest('maxKm must be greater than minKm');
    if (input.fee < 0) throw AppError.badRequest('fee must be >= 0');
    return db.deliveryFeeTier.create({
      data: {
        minKm: input.minKm,
        maxKm: input.maxKm,
        fee: input.fee,
        isActive: input.isActive ?? true,
      },
    });
  }

  static async updateDeliveryFeeTier(
    id: string,
    patch: { minKm?: number; maxKm?: number; fee?: number; isActive?: boolean },
  ) {
    const existing = await db.deliveryFeeTier.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('DeliveryFeeTier');
    const next = {
      minKm: patch.minKm ?? existing.minKm,
      maxKm: patch.maxKm ?? existing.maxKm,
      fee: patch.fee ?? existing.fee,
    };
    if (next.minKm < 0) throw AppError.badRequest('minKm must be >= 0');
    if (next.maxKm <= next.minKm) throw AppError.badRequest('maxKm must be greater than minKm');
    if (next.fee < 0) throw AppError.badRequest('fee must be >= 0');
    return db.deliveryFeeTier.update({
      where: { id },
      data: {
        minKm: patch.minKm,
        maxKm: patch.maxKm,
        fee: patch.fee,
        isActive: patch.isActive,
      },
    });
  }

  static async deleteDeliveryFeeTier(id: string) {
    const existing = await db.deliveryFeeTier.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('DeliveryFeeTier');
    await db.deliveryFeeTier.delete({ where: { id } });
    return { deleted: true };
  }

  // --- Today's birthdays / anniversaries ---

  static async getBirthdaysOnDate(date: Date) {
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Prisma stores DateTime in SQLite as INTEGER (ms timestamp). Use strftime
    // with the 'unixepoch' modifier (and divide by 1000 since the value is in ms).
    const birthdays = await db.$queryRaw<
      Array<{ id: string; fullName: string; phone: string; dateOfBirth: Date; createdAt: Date; userId: string }>
    >`
      SELECT
        cp.id AS id,
        cp."userId" AS userId,
        cp."fullName" AS fullName,
        u.phone AS phone,
        cp."dateOfBirth" AS dateOfBirth,
        cp."createdAt" AS createdAt
      FROM "CustomerProfile" cp
      JOIN "User" u ON u.id = cp."userId"
      WHERE cp."dateOfBirth" IS NOT NULL
        AND strftime('%m-%d', cp."dateOfBirth" / 1000, 'unixepoch') = ${monthDay}
      ORDER BY cp."fullName" ASC
    `;

    const anniversaries = await db.$queryRaw<
      Array<{ id: string; fullName: string; phone: string; anniversaryDate: Date; createdAt: Date; userId: string }>
    >`
      SELECT
        cp.id AS id,
        cp."userId" AS userId,
        cp."fullName" AS fullName,
        u.phone AS phone,
        cp."anniversaryDate" AS anniversaryDate,
        cp."createdAt" AS createdAt
      FROM "CustomerProfile" cp
      JOIN "User" u ON u.id = cp."userId"
      WHERE cp."anniversaryDate" IS NOT NULL
        AND strftime('%m-%d', cp."anniversaryDate" / 1000, 'unixepoch') = ${monthDay}
      ORDER BY cp."fullName" ASC
    `;

    return {
      date: date.toISOString().slice(0, 10),
      birthdays: birthdays.map((b) => ({
        ...b,
        age: b.dateOfBirth ? date.getUTCFullYear() - b.dateOfBirth.getUTCFullYear() : null,
      })),
      anniversaries: anniversaries.map((a) => ({
        ...a,
        yearsMarried: a.anniversaryDate ? date.getUTCFullYear() - a.anniversaryDate.getUTCFullYear() : null,
      })),
    };
  }

  static async listCustomersWithMilestones(params: { page: number; pageSize: number }) {
    const [total, items] = await Promise.all([
      db.customerProfile.count(),
      db.customerProfile.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: {
          user: { select: { phone: true, email: true, isActive: true, createdAt: true } },
        },
      }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  // --- Promo banners (customer home carousel) ---

  static async listPromoBanners() {
    return db.promoBanner.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  static async createPromoBanner(input: { imageUrl: string; title?: string | null; displayOrder?: number; isActive?: boolean }) {
    return db.promoBanner.create({
      data: {
        imageUrl: input.imageUrl,
        title: input.title ?? null,
        displayOrder: input.displayOrder ?? 0,
        isActive: input.isActive ?? true,
      },
    });
  }

  static async updatePromoBanner(id: string, patch: { imageUrl?: string; title?: string | null; displayOrder?: number; isActive?: boolean }) {
    const existing = await db.promoBanner.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('PromoBanner');
    return db.promoBanner.update({
      where: { id },
      data: {
        ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.displayOrder !== undefined ? { displayOrder: patch.displayOrder } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      },
    });
  }

  static async deletePromoBanner(id: string) {
    const existing = await db.promoBanner.findUnique({ where: { id } });
    if (!existing) throw AppError.notFound('PromoBanner');
    await db.promoBanner.delete({ where: { id } });
    return { deleted: true, imageUrl: existing.imageUrl };
  }

  // --- Reports (date-range order + revenue breakdown) ---

  /**
   * Get all orders placed in the given date range, with summary stats:
   *   - totalOrders: count of orders in range
   *   - totalRevenue: sum of totalAmount for orders whose status is PAID or DELIVERED
   *     (i.e. actual completed revenue — excludes PLACED, APPROVED, CANCELLED)
   *   - statusBreakdown: counts by status (PLACED, APPROVED, PAID, DELIVERED, CANCELLED)
   *
   * Date range is inclusive on both ends (00:00:00 of `from` to 23:59:59.999 of `to`).
   */
  static async getReport(input: { from: string; to: string }) {
    // Parse YYYY-MM-DD strings as local-date-midnight UTC
    const fromMatch = input.from.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const toMatch = input.to.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!fromMatch || !toMatch) {
      throw AppError.badRequest('from and to must be in YYYY-MM-DD format');
    }
    const fromDate = new Date(`${input.from}T00:00:00.000Z`);
    // `to` is inclusive — cover end-of-day
    const toDate = new Date(`${input.to}T23:59:59.999Z`);
    if (fromDate > toDate) {
      throw AppError.badRequest('from date cannot be after to date');
    }

    const where = {
      createdAt: { gte: fromDate, lte: toDate },
    };

    const [
      totalOrders,
      orders,
      statusBreakdownAgg,
      totalRevenueAgg,
    ] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          restaurant: { select: { name: true } },
          customer: { select: { phone: true, email: true } },
          items: { select: { id: true } },
          payment: { select: { status: true, amount: true } },
        },
      }),
      db.order.groupBy({
        by: ['orderStatus'],
        where,
        _count: true,
      }),
      // Total revenue = sum of totalAmount for PAID + DELIVERED orders in range
      db.order.aggregate({
        where: { ...where, orderStatus: { in: ['PAID', 'DELIVERED'] } },
        _sum: { totalAmount: true },
      }),
    ]);

    // Build status breakdown object
    const statusBreakdown: Record<string, number> = {
      PLACED: 0,
      APPROVED: 0,
      PAID: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    for (const row of statusBreakdownAgg) {
      statusBreakdown[row.orderStatus] = row._count;
    }

    const totalRevenue = totalRevenueAgg._sum.totalAmount ?? 0;

    return {
      from: input.from,
      to: input.to,
      summary: {
        totalOrders,
        totalRevenue,
        statusBreakdown,
      },
      orders: orders.map((o) => ({
        id: o.id,
        shortCode: o.shortCode,
        restaurant: o.restaurant?.name ?? '—',
        customerPhone: o.customer?.phone ?? '—',
        itemsCount: o.items.length,
        subtotal: o.subtotal,
        deliveryFee: o.deliveryFee,
        totalAmount: o.totalAmount,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        paymentAmount: o.payment?.amount ?? null,
        createdAt: o.createdAt,
      })),
    };
  }
}
