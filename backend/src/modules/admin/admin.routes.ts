// src/modules/admin/admin.routes.ts
import { Router } from 'express';
import { AdminService } from '@/lib/services/admin.service';
import { RestaurantService } from '@/lib/services/restaurant.service';
import { OrderService } from '@/lib/services/order.service';
import { ReviewService } from '@/lib/services/review.service';
import { PaymentService } from '@/lib/services/payment.service';
import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { paginationSchema, restaurantActionSchema, assignRiderSchema, categoryBodySchema, deliveryFeeTierCreateSchema, deliveryFeeTierUpdateSchema } from '@/lib/validators';
import { asyncHandler, ok, noContent } from '@/lib/api-response';
import { requireRoles } from '@/middleware/auth';
import { z } from 'zod';
import path from "path";
import cloudinary from '../../lib/integrations/cloudinary';


const router = Router();

// All admin routes require ADMIN role — mount-level guard
router.use(requireRoles('ADMIN'));

// GET /api/v1/admin/dashboard
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const stats = await AdminService.dashboardStats();
    return ok(res, stats);
  }),
);

// GET /api/v1/admin/restaurants
router.get(
  '/restaurants',
  asyncHandler(async (req, res) => {
    const params = paginationSchema.parse(req.query);
    const result = await RestaurantService.adminList({
      q: req.query.q as string | undefined,
      status: req.query.status as string | undefined,
      page: params.page,
      pageSize: params.pageSize,
    });
    return ok(res, result);
  }),
);

// GET /api/v1/admin/restaurants/:id
router.get(
  '/restaurants/:id',
  asyncHandler(async (req, res) => {
    const restaurant = await db.restaurant.findUnique({
      where: { id: req.params.id as string },
      include: { address: true },
    });
    if (!restaurant) throw AppError.notFound('Restaurant');
    return ok(res, restaurant);
  }),
);

// POST /api/v1/admin/restaurants — admin creates a restaurant manually (no restaurant owner login)
router.post('/restaurants', asyncHandler(async (req, res) => {
  const { name, cuisine, phone, email, openingTime, closingTime, minOrderAmount, deliveryFee, deliveryRadiusKm, description, address } = req.body as {
    name: string;
    cuisine?: string;
    phone?: string;
    email?: string;
    openingTime?: string;
    closingTime?: string;
    minOrderAmount?: number;
    deliveryFee?: number;
    deliveryRadiusKm?: number;
    description?: string;
    address?: { line1: string; line2?: string; city: string; state?: string; postalCode?: string; latitude: number; longitude: number };
  };
  if (!name) throw AppError.badRequest('Restaurant name is required');

  const restaurant = await db.restaurant.create({
    data: {
      name,
      cuisine: cuisine || 'General',
      phone: phone || '',
      email: email || undefined,
      description: description || null,
      openingTime: openingTime || '09:00',
      closingTime: closingTime || '23:00',
      minOrderAmount: minOrderAmount ?? 99,
      deliveryFee: deliveryFee ?? 30,
      deliveryRadiusKm: deliveryRadiusKm ?? 10,
      status: 'ACTIVE',
      availability: 'OPEN',
      latitude: address?.latitude ?? 18.52,
      longitude: address?.longitude ?? 73.85,
      ...(address ? {
        address: {
          create: {
            line1: address.line1,
            line2: address.line2 || null,
            city: address.city,
            state: address.state || null,
            postalCode: address.postalCode || null,
            latitude: address.latitude,
            longitude: address.longitude,
          },
        },
      } : {}),
    },
    include: { address: true },
  });
  return ok(res, restaurant, 201);
}));

// PATCH /api/v1/admin/restaurants/:id — admin edits restaurant details
router.patch('/restaurants/:id', asyncHandler(async (req, res) => {
  const patch = req.body as Record<string, unknown>;
  const allowed = ['name', 'cuisine', 'phone', 'email', 'description', 'openingTime', 'closingTime', 'minOrderAmount', 'deliveryFee', 'deliveryRadiusKm', 'availability', 'latitude', 'longitude'];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (patch[key] !== undefined) data[key] = patch[key];
  }
  const updated = await db.restaurant.update({
    where: { id: req.params.id as string },
    data,
  });
  return ok(res, updated);
}));

// POST /api/v1/admin/restaurants/:id/approve
router.post('/restaurants/:id/approve', asyncHandler(async (req, res) => {
  const updated = await RestaurantService.approve(req.params.id as string, req.auth!);
  return ok(res, updated);
}));

// POST /api/v1/admin/restaurants/:id/reject
router.post('/restaurants/:id/reject', asyncHandler(async (req, res) => {
  const parsed = restaurantActionSchema.parse(req.body || {});
  const updated = await RestaurantService.reject(req.params.id as string, parsed.reason || 'Rejected by admin', req.auth!);
  return ok(res, updated);
}));

// POST /api/v1/admin/restaurants/:id/suspend
router.post('/restaurants/:id/suspend', asyncHandler(async (req, res) => {
  const updated = await RestaurantService.suspend(req.params.id as string, req.auth!);
  return ok(res, updated);
}));

// POST /api/v1/admin/restaurants/:id/activate
router.post('/restaurants/:id/activate', asyncHandler(async (req, res) => {
  const updated = await RestaurantService.activate(req.params.id as string, req.auth!);
  return ok(res, updated);
}));

// GET /api/v1/admin/customers
router.get('/customers', asyncHandler(async (req, res) => {
  const params = paginationSchema.parse(req.query);
  const result = await AdminService.listCustomers({ q: req.query.q as string | undefined, page: params.page, pageSize: params.pageSize });
  return ok(res, result);
}));

// POST /api/v1/admin/customers/:id/block
router.post('/customers/:id/block', asyncHandler(async (req, res) => {
  const updated = await AdminService.setCustomerBlocked(req.params.id as string, true, req.auth!);
  return ok(res, updated);
}));

// POST /api/v1/admin/customers/:id/unblock
router.post('/customers/:id/unblock', asyncHandler(async (req, res) => {
  const updated = await AdminService.setCustomerBlocked(req.params.id as string, false, req.auth!);
  return ok(res, updated);
}));

// GET /api/v1/admin/orders
router.get('/orders', asyncHandler(async (req, res) => {
  const params = paginationSchema.parse(req.query);
  const result = await AdminService.listOrders({
    status: req.query.status as string | undefined,
    restaurantId: req.query.restaurantId as string | undefined,
    customerId: req.query.customerId as string | undefined,
    page: params.page,
    pageSize: params.pageSize,
  });
  return ok(res, result);
}));

// POST /api/v1/admin/orders/:id/assign-rider
router.post('/orders/:id/assign-rider', asyncHandler(async (req, res) => {
  const parsed = assignRiderSchema.parse(req.body);
  const order = await OrderService.assignRider(req.params.id as string, parsed, req.auth!);
  return ok(res, order);
}));

// POST /api/v1/admin/orders/:id/approve — admin approves a freshly-placed order (PLACED → APPROVED)
router.post('/orders/:id/approve', asyncHandler(async (req, res) => {
  const order = await OrderService.approveOrder(req.params.id as string, req.auth!);
  return ok(res, order);
}));

// POST /api/v1/admin/orders/:id/mark-paid — admin marks order as paid (APPROVED → PAID)
router.post('/orders/:id/mark-paid', asyncHandler(async (req, res) => {
  const order = await OrderService.markOrderPaid(req.params.id as string, req.auth!);
  return ok(res, order);
}));

// POST /api/v1/admin/orders/:id/delivered — admin marks as delivered (PAID → DELIVERED)
router.post('/orders/:id/delivered', asyncHandler(async (req, res) => {
  const order = await OrderService.transitionOrder(req.params.id as string, 'DELIVERED', req.auth!, 'Marked delivered');
  return ok(res, order);
}));

// GET /api/v1/admin/payments
router.get('/payments', asyncHandler(async (req, res) => {
  const params = paginationSchema.parse(req.query);
  const result = await AdminService.listPayments({
    status: req.query.status as string | undefined,
    page: params.page,
    pageSize: params.pageSize,
  });
  return ok(res, result);
}));

// POST /api/v1/admin/payments/:id/refund?byOrderId=true
router.post('/payments/:id/refund', asyncHandler(async (req, res) => {
  const byOrderId = req.query.byOrderId === 'true';
  let orderId = req.params.id as string;
  if (byOrderId) {
    const payment = await db.payment.findUnique({ where: { orderId: req.params.id as string } });
    if (!payment) throw AppError.notFound('Payment');
    orderId = payment.orderId;
  } else {
    // Find by payment ID
    const payment = await db.payment.findUnique({ where: { id: req.params.id as string } });
    if (!payment) throw AppError.notFound('Payment');
    orderId = payment.orderId;
  }
  const result = await PaymentService.initiateRefund(orderId, req.auth!);
  return ok(res, result);
}));

// GET /api/v1/admin/reviews
router.get('/reviews', asyncHandler(async (req, res) => {
  const params = paginationSchema.parse(req.query);
  const result = await ReviewService.adminList(params.page, params.pageSize);
  return ok(res, result);
}));

// PATCH /api/v1/admin/reviews/:id
const patchReviewSchema = z.object({ isHidden: z.boolean() });
router.patch('/reviews/:id', asyncHandler(async (req, res) => {
  const parsed = patchReviewSchema.parse(req.body);
  const updated = await ReviewService.moderate(req.params.id as string, parsed.isHidden, req.auth!);
  return ok(res, updated);
}));

// GET /api/v1/admin/categories
router.get('/categories', asyncHandler(async (req, res) => {
  const items = await db.category.findMany({ orderBy: { name: 'asc' } });
  return ok(res, items);
}));

// POST /api/v1/admin/categories
router.post('/categories', asyncHandler(async (req, res) => {
  const parsed = categoryBodySchema.parse(req.body);
  const slug = parsed.slug || parsed.name.toLowerCase().replace(/\s+/g, '-');
  const cat = await db.category.create({ data: { name: parsed.name, slug } });
  return ok(res, cat, 201);
}));

// PATCH /api/v1/admin/categories/:id
router.patch('/categories/:id', asyncHandler(async (req, res) => {
  const parsed = categoryBodySchema.partial().parse(req.body);
  const updated = await db.category.update({ where: { id: req.params.id as string }, data: parsed as Record<string, unknown> });
  return ok(res, updated);
}));

// DELETE /api/v1/admin/categories/:id
router.delete('/categories/:id', asyncHandler(async (req, res) => {
  const cat = await db.category.findUnique({ where: { id: req.params.id as string } });
  if (!cat) throw AppError.notFound('Category');
  await db.category.delete({ where: { id: req.params.id as string } });
  return noContent(res);
}));

// ============================================================================
// Distance-based delivery fee tiers
// ============================================================================

router.get('/delivery-fee-tiers', asyncHandler(async (_req, res) => {
  const tiers = await AdminService.listDeliveryFeeTiers();
  return ok(res, tiers);
}));

router.post('/delivery-fee-tiers', asyncHandler(async (req, res) => {
  const parsed = deliveryFeeTierCreateSchema.parse(req.body);
  const tier = await AdminService.createDeliveryFeeTier(parsed);
  return ok(res, tier, 201);
}));

router.patch('/delivery-fee-tiers/:id', asyncHandler(async (req, res) => {
  const parsed = deliveryFeeTierUpdateSchema.parse(req.body);
  const tier = await AdminService.updateDeliveryFeeTier(req.params.id as string, parsed);
  return ok(res, tier);
}));

router.delete('/delivery-fee-tiers/:id', asyncHandler(async (req, res) => {
  await AdminService.deleteDeliveryFeeTier(req.params.id as string);
  return noContent(res);
}));

// ============================================================================
// Today's birthdays / anniversaries
// ============================================================================

router.get('/birthdays', asyncHandler(async (req, res) => {
  const dateStr = req.query.date as string | undefined;
  let date: Date;
  if (dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw AppError.badRequest('date must be in YYYY-MM-DD format');
    }
    date = new Date(`${dateStr}T00:00:00.000Z`);
  } else {
    const now = new Date();
    date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const result = await AdminService.getBirthdaysOnDate(date);
  return ok(res, result);
}));

router.get('/customers/milestones', asyncHandler(async (req, res) => {
  const params = paginationSchema.parse(req.query);
  const result = await AdminService.listCustomersWithMilestones({
    page: params.page,
    pageSize: params.pageSize,
  });
  return ok(res, result);
}));

// ============================================================================
// Promo banners (customer home carousel)
// ============================================================================

async function saveBase64Image(dataUrl: string): Promise<string> {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);

  if (!m) {
    throw AppError.badRequest(
      "Invalid image data URL — expected data:image/...;base64,..."
    );
  }

  try {
    const result = await cloudinary.uploader.upload(dataUrl, {
      folder: "promo-banners",
      resource_type: "image",
    });

    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary upload failed:", error);

    throw (
      "Failed to upload promo banner"
    );
  }
}

router.get('/promo-banners', asyncHandler(async (_req, res) => {
  const banners = await AdminService.listPromoBanners();
  return ok(res, banners);
}));

router.post('/promo-banners', asyncHandler(async (req, res) => {
  const { imageDataUrl, title, displayOrder, isActive } = req.body as {
    imageDataUrl?: string;
    title?: string | null;
    displayOrder?: number;
    isActive?: boolean;
  };
  if (!imageDataUrl) throw AppError.badRequest('imageDataUrl is required (data:image/...;base64,...)');
  const imageUrl = await saveBase64Image(imageDataUrl);
  const banner = await AdminService.createPromoBanner({ imageUrl, title, displayOrder, isActive });
  return ok(res, banner, 201);
}));

router.patch('/promo-banners/:id', asyncHandler(async (req, res) => {
  const { title, displayOrder, isActive, imageDataUrl } = req.body as {
    title?: string | null;
    displayOrder?: number;
    isActive?: boolean;
    imageDataUrl?: string;
  };
  let imageUrl: string | undefined;
  if (imageDataUrl) {
    imageUrl = await saveBase64Image(imageDataUrl);
  }
  const banner = await AdminService.updatePromoBanner(req.params.id as string, {
    imageUrl, title, displayOrder, isActive,
  });
  return ok(res, banner);
}));

router.delete('/promo-banners/:id', asyncHandler(async (req, res) => {
  const result = await AdminService.deletePromoBanner(req.params.id as string);
  try {
    if (result.imageUrl.startsWith('/uploads/')) {
      const fs = await import('node:fs/promises');
      const filePath = `/home/z/my-project/upload/${result.imageUrl.replace('/uploads/', '')}`;
      await fs.unlink(filePath).catch(() => {});
    }
  } catch {}
  return noContent(res);
}));

// ============================================================================
// Reports (date-range order list + revenue breakdown + CSV export)
// ============================================================================

// GET /api/v1/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv
// Default (no format): returns JSON with summary + orders array
// format=csv: returns CSV file download
router.get('/reports', asyncHandler(async (req, res) => {
  const from = req.query.from as string;
  const to = req.query.to as string;
  if (!from || !to) {
    throw AppError.badRequest('from and to query params are required (YYYY-MM-DD)');
  }
  const report = await AdminService.getReport({ from, to });

  if (req.query.format === 'csv') {
    const header = 'Order Code,Restaurant,Customer Phone,Items,Subtotal,Delivery Fee,Total,Order Status,Payment Status,Payment Amount,Created At\n';
    const rows = report.orders.map((o) => {
      const escape = (s: string | number) => {
        const str = String(s);
        return /[,\"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      };
      return [
        escape(o.shortCode),
        escape(o.restaurant),
        escape(o.customerPhone),
        o.itemsCount,
        o.subtotal,
        o.deliveryFee,
        o.totalAmount,
        escape(o.orderStatus),
        escape(o.paymentStatus),
        o.paymentAmount ?? '',
        new Date(o.createdAt).toISOString(),
      ].join(',');
    }).join('\n');
    const csv = header + rows;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="foodmitra-report-${from}-to-${to}.csv"`);
    return res.send(csv);
  }

  return ok(res, report);
}));

export { router as adminRoutes };
