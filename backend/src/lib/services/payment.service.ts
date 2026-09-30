// src/lib/services/payment.service.ts
// Razorpay integration removed. Payments are manual — admin marks orders as paid
// (via /api/v1/admin/orders/:id/mark-paid). Refunds are also manual: admin clicks
// "Mark refunded" → we mark refundStatus='processed' in DB; actual money return
// is handled offline by the platform operator.

import { db } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { AuthContext } from '@/lib/auth/session';

export class PaymentService {
  /**
   * Mark a payment as refunded (manual refund — no gateway API call).
   */
  static async initiateRefund(orderId: string, ctx: AuthContext) {
    const payment = await db.payment.findUnique({ where: { orderId }, include: { order: true } });
    if (!payment) throw AppError.notFound('Payment');
    if (payment.status !== 'CAPTURED') {
      throw new AppError('PAYMENT_VERIFICATION_FAILED', `Cannot refund payment with status ${payment.status}`, 409);
    }

    const mockRefundId = `rfd_manual_${payment.order.shortCode}_${Date.now().toString(36)}`;
    await db.payment.update({
      where: { id: payment.id },
      data: {
        refundId: mockRefundId,
        refundStatus: 'processed',
        refundAmount: payment.amount,
        status: 'REFUNDED',
      },
    });
    logger.info('payment.manual_refund_marked', {
      paymentId: payment.id,
      refundId: mockRefundId,
      initiatedBy: ctx.role,
    });
    return { refundId: mockRefundId, status: 'processed' };
  }
}
