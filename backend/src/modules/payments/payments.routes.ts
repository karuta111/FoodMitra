// src/modules/payments/payments.routes.ts
// Razorpay routes removed. Payments are manual — admin marks orders as paid via
// POST /api/v1/admin/orders/:id/mark-paid. Refunds via POST /api/v1/admin/payments/:id/refund.

import { Router } from 'express';

const router = Router();

export { router as paymentRoutes };
