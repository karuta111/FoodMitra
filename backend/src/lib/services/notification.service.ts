// src/lib/services/notification.service.ts
// Backend emits notifications on business events. Abstraction point —
// swap implementation to FCM/Web Push later without changing call sites.

import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { AuthContext } from '@/lib/auth/session';
import type { OrderStatus } from './order.service';

type NotificationType =
  | 'ORDER_PLACED'
  | 'PAYMENT_SUCCESSFUL'
  | 'RESTAURANT_ACCEPTED'
  | 'RESTAURANT_REJECTED'
  | 'PREPARING'
  | 'READY'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'NEW_ORDER'
  | 'CUSTOMER_CANCELLATION'
  | 'NEW_RESTAURANT_REGISTRATION'
  | 'PAYMENT_ISSUE'
  | 'REFUND_EVENT';

interface NotifyInput {
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export class NotificationService {
  static async send(input: NotifyInput) {
    try {
      await db.notification.create({
        data: {
          recipientId: input.recipientId,
          type: input.type,
          title: input.title,
          body: input.body,
          data: input.data ? JSON.stringify(input.data) : null,
        },
      });
      logger.info('notification.sent', {
        recipientId: input.recipientId,
        type: input.type,
      });
    } catch (e) {
      logger.error('notification.create_failed', {
        recipientId: input.recipientId,
        type: input.type,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  static async sendToAllAdmins(input: Omit<NotifyInput, 'recipientId'>) {
    const admins = await db.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });
    await Promise.all(admins.map((a) => this.send({ ...input, recipientId: a.id })));
  }

  // Since admin manages all restaurants now, restaurant notifications go to admins.
  static async sendToRestaurantOwners(_restaurantId: string, input: Omit<NotifyInput, 'recipientId'>) {
    await this.sendToAllAdmins(input);
  }

  static async notifyOrderPlaced(orderId: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true, items: true },
    });
    if (!order) return;

    // Notify customer
    await this.send({
      recipientId: order.customerId,
      type: 'ORDER_PLACED',
      title: 'Order placed',
      body: `Your order ${order.shortCode} has been placed. Awaiting payment.`,
      data: { orderId, shortCode: order.shortCode },
    });

    // Notify admins
    await this.sendToAllAdmins({
      type: 'ORDER_PLACED',
      title: 'New order placed',
      body: `Order ${order.shortCode} for ₹${order.totalAmount}`,
      data: { orderId },
    });
  }

  static async notifyOrderTransition(
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    ctx: AuthContext,
  ) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { restaurant: true },
    });
    if (!order) return;

    const map: Partial<Record<OrderStatus, { type: NotificationType; title: string; body: string }>> = {
      APPROVED: {
        type: 'RESTAURANT_ACCEPTED',
        title: 'Order approved',
        body: `Your order ${order.shortCode} has been approved by the restaurant.`,
      },
      PAID: {
        type: 'PAYMENT_SUCCESSFUL',
        title: 'Payment successful',
        body: `Payment for order ${order.shortCode} has been confirmed.`,
      },
      DELIVERED: {
        type: 'DELIVERED',
        title: 'Order delivered',
        body: `Your order ${order.shortCode} has been delivered. Enjoy!`,
      },
      CANCELLED: {
        type: 'CANCELLED',
        title: 'Order cancelled',
        body: `Order ${order.shortCode} has been cancelled.`,
      },
    };

    const n = map[to];
    if (!n) return;

    // Notify customer for all transitions
    await this.send({
      recipientId: order.customerId,
      type: n.type,
      title: n.title,
      body: n.body,
      data: { orderId, from, to },
    });

    // Notify restaurant on NEW_ORDER when payment captured
    if (to === 'PAID') {
      await this.sendToRestaurantOwners(order.restaurantId, {
        type: 'NEW_ORDER',
        title: 'New order received',
        body: `Order ${order.shortCode} • ₹${order.totalAmount}`,
        data: { orderId },
      });
    }

    // Notify restaurant on customer cancellation (if was already PAID)
    if (to === 'CANCELLED' && from === 'PAID') {
      await this.sendToRestaurantOwners(order.restaurantId, {
        type: 'CUSTOMER_CANCELLATION',
        title: 'Order cancelled by customer',
        body: `Order ${order.shortCode} was cancelled. Refund will be processed.`,
        data: { orderId },
      });
      await this.sendToAllAdmins({
        type: 'REFUND_EVENT',
        title: 'Refund required',
        body: `Order ${order.shortCode} cancelled after payment. Process refund.`,
        data: { orderId },
      });
    }
  }

  static async notifyRiderAssigned(orderId: string, rider: { riderName: string; riderPhone: string }) {
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    await this.send({
      recipientId: order.customerId,
      type: 'RIDER_ASSIGNED',
      title: 'Rider assigned',
      body: `${rider.riderName} will deliver your order ${order.shortCode}. Phone: ${rider.riderPhone}`,
      data: { orderId, riderName: rider.riderName, riderPhone: rider.riderPhone },
    });
  }

  static async notifyRestaurantRegistration(restaurantName: string, restaurantId: string) {
    await this.sendToAllAdmins({
      type: 'NEW_RESTAURANT_REGISTRATION',
      title: 'New restaurant registration',
      body: `${restaurantName} is awaiting approval.`,
      data: { restaurantId },
    });
  }
}
