// src/lib/toast-errors.ts
// Centralized helper for surfacing Zod validation errors + ApiError messages in toasts.
// Instead of showing generic "Request validation failed", this walks the Zod issues
// array and shows a per-field message.

import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';

interface ZodIssue { path: string; message: string }
interface ZodDetails { issues?: ZodIssue[] }

const FIELD_LABELS: Record<string, string> = {
 email: 'Email',
 password: 'Password',
 phone: 'Phone',
 fullName: 'Full name',
 role: 'Role',
 restaurantName: 'Restaurant name',
 cuisine: 'Cuisine',
 description: 'Description',
 addressLine1: 'Address line 1',
 addressLine2: 'Address line 2',
 city: 'City',
 state: 'State',
 postalCode: 'Pincode',
 latitude: 'Latitude',
 longitude: 'Longitude',
 openingTime: 'Opening time',
 closingTime: 'Closing time',
 minOrderAmount: 'Minimum order amount',
 deliveryFee: 'Delivery fee',
 deliveryRadiusKm: 'Delivery radius',
 availability: 'Availability',
 name: 'Name',
 price: 'Price',
 quantity: 'Quantity',
 menuItemId: 'Menu item',
 categoryId: 'Category',
 isVeg: 'Vegetarian',
 prepTimeMinutes: 'Prep time',
 rating: 'Rating',
 comment: 'Comment',
 orderId: 'Order',
 deliveryAddressId: 'Delivery address',
 notes: 'Notes',
 label: 'Label',
 line1: 'Address line 1',
 logoUrl: 'Logo URL',
 imageUrl: 'Image URL',
};

function humanize(path: string): string {
 if (!path) return 'This field';
 if (FIELD_LABELS[path]) return FIELD_LABELS[path];
 // Snake/camel → Title Case
 return path
 .replace(/[_-]/g, ' ')
 .replace(/([A-Z])/g, ' $1')
 .replace(/^\w/, (c) => c.toUpperCase())
 .trim();
}

/**
 * Show a toast (or toasts) for an unknown error from the API.
 * - If it's a Zod VALIDATION_ERROR, walks the issues array and shows per-field messages.
 * - If it's any other ApiError, shows the error.message.
 * - If it's a generic Error, shows a generic "Something went wrong" toast.
 *
 * `fallback` is shown only when the error has no actionable message at all.
 */
export function toastApiError(err: unknown, fallback = 'Something went wrong') {
 if (err instanceof ApiError) {
 if (err.code === 'VALIDATION_ERROR') {
 const details = err.details as ZodDetails | undefined;
 const issues = details?.issues ?? [];
 if (issues.length > 0) {
 // Show the first 3 issues as separate toasts so they're readable
 for (const issue of issues.slice(0, 3)) {
 const field = humanize(issue.path);
 toast.error(`${field}: ${issue.message}`);
 }
 if (issues.length > 3) {
 toast.error(`…and ${issues.length - 3} more validation issue(s)`);
 }
 return;
 }
 }
 // Non-validation ApiError — show its message
 toast.error(err.message || fallback);
 return;
 }
 // Generic error
 if (err instanceof Error && err.message) {
 toast.error(err.message);
 return;
 }
 toast.error(fallback);
}
