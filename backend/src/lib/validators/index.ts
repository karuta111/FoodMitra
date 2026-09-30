// src/lib/validators/index.ts
import { z } from 'zod';

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// Generic UUID-ish ID
export const cuidSchema = z.string().min(1).max(60);

// Address body (used by customers + restaurants)
export const addressBodySchema = z.object({
  label: z.enum(['HOME', 'WORK', 'OTHER']).optional(),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional(),
  postalCode: z.string().max(20).optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

// Menu item body
export const menuItemBodySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(0).max(100000),
  imageUrl: z.string().url().optional().or(z.literal('')),
  isVeg: z.boolean().default(true),
  availability: z.enum(['AVAILABLE', 'UNAVAILABLE']).default('AVAILABLE'),
  prepTimeMinutes: z.coerce.number().int().min(1).max(180).default(15),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const menuCategoryBodySchema = z.object({
  name: z.string().min(1).max(60),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

// Cart
export const addCartItemSchema = z.object({
  menuItemId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50).default(1),
  replaceRestaurant: z.boolean().default(false),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(50),
});

// Orders
export const createOrderSchema = z.object({
  deliveryAddressId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

// Payments — Razorpay-specific schemas removed; payments are now manual.

// Reviews
export const createReviewSchema = z.object({
  orderId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// Admin
export const restaurantActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const assignRiderSchema = z.object({
  riderName: z.string().min(1).max(120),
  riderPhone: z.string().regex(/^\+?[1-9]\d{7,14}$/),
});

// Notifications
export const notificationQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

// Restaurant filters (for public listing)
export const restaurantQuerySchema = paginationSchema.extend({
  q: z.string().max(120).optional(),
  cuisine: z.string().max(60).optional(),
  veg: z.coerce.boolean().optional(),
  open: z.coerce.boolean().default(true),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(50).default(5),
});

// Restaurant update
export const restaurantUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  cuisine: z.string().max(60).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  coverImageUrl: z.string().url().optional().or(z.literal('')),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  minOrderAmount: z.coerce.number().min(0).max(10000).optional(),
  deliveryFee: z.coerce.number().min(0).max(500).optional(),
  deliveryRadiusKm: z.coerce.number().min(1).max(50).optional(),
  availability: z.enum(['OPEN', 'CLOSED', 'TEMPORARILY_UNAVAILABLE']).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  // Nested address object — goes to RestaurantAddress table
  address: z.object({
    line1: z.string().min(1).max(200).optional(),
    line2: z.string().max(200).optional().or(z.literal('')),
    city: z.string().min(1).max(80).optional(),
    state: z.string().max(80).optional().or(z.literal('')),
    postalCode: z.string().max(20).optional().or(z.literal('')),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  }).optional(),
});

// Category
export const categoryBodySchema = z.object({
  name: z.string().min(1).max(60),
  slug: z.string().min(1).max(80).optional(),
});

// Distance-based delivery fee tier
export const deliveryFeeTierCreateSchema = z.object({
  minKm: z.coerce.number().min(0),
  maxKm: z.coerce.number().min(0),
  fee: z.coerce.number().min(0),
  isActive: z.boolean().optional(),
});

export const deliveryFeeTierUpdateSchema = z.object({
  minKm: z.coerce.number().min(0).optional(),
  maxKm: z.coerce.number().min(0).optional(),
  fee: z.coerce.number().min(0).optional(),
  isActive: z.boolean().optional(),
});
