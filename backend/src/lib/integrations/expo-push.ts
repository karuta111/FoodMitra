// src/lib/integrations/expo-push.ts
// Expo Push Notification service.
// Sends native push notifications to the customer's mobile device via Expo's push API.
//
// How it works:
//   1. Mobile app (Expo) calls Notifications.getExpoPushTokenAsync() on launch
//   2. Mobile app sends the token to POST /api/v1/customers/push-token
//   3. Backend stores it in CustomerProfile.expoPushToken
//   4. When order status changes, backend calls sendPushNotification() → Expo's push API
//   5. Expo forwards to FCM (Android) / APNs (iOS) → customer's phone shows a native notification

const EXPO_ACCESS_TOKEN = process.env.EXPO_ACCESS_TOKEN || ''; // optional — for authenticated pushes

/**
 * Send a push notification to one or more Expo push tokens.
 * Silent failure — logs error, never throws (so order transitions aren't blocked).
 */
export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<void> {
  const validTokens = tokens.filter((t) => t && t.startsWith('ExponentPushToken'));
  if (validTokens.length === 0) return;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (EXPO_ACCESS_TOKEN) {
      headers.Authorization = `Bearer ${EXPO_ACCESS_TOKEN}`;
    }

    const messages = validTokens.map((to) => ({
      to,
      title,
      body,
      data: data || {},
      sound: 'default',
      channelId: 'order-updates',
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[expo-push] send failed:', res.status, text.slice(0, 200));
      return;
    }

    // Check for per-ticket errors (Expo returns an array for multiple, object for single)
    const json = await res.json();
    const results = Array.isArray(json) ? json : [json];
    for (const r of results) {
      if (r.status === 'error') {
        console.error('[expo-push] ticket error:', r.message, r.details?.error);
      }
    }
  } catch (err) {
    console.error('[expo-push] send error:', err);
  }
}

/**
 * Send an order status update notification to the customer.
 * Called from OrderService.transitionOrder() and markOrderPaid().
 */
export async function sendOrderStatusPush(
  expoPushToken: string | null,
  orderCode: string,
  restaurantName: string,
  newStatus: string,
): Promise<void> {
  if (!expoPushToken) return;

  const statusMessages: Record<string, { title: string; body: string }> = {
    APPROVED: {
      title: 'Order approved! 🎉',
      body: `Your order ${orderCode} from ${restaurantName} has been confirmed.`,
    },
    PAID: {
      title: 'Payment received ✅',
      body: `Payment for order ${orderCode} (${restaurantName}) is confirmed.`,
    },
    DELIVERED: {
      title: 'Order delivered 🎉',
      body: `Your order ${orderCode} from ${restaurantName} has been delivered. Enjoy!`,
    },
    CANCELLED: {
      title: 'Order cancelled ❌',
      body: `Your order ${orderCode} from ${restaurantName} has been cancelled.`,
    },
  };

  const msg = statusMessages[newStatus];
  if (!msg) return; // no push for PLACED (customer just placed it themselves)

  await sendPushNotification([expoPushToken], msg.title, msg.body, {
    orderId: orderCode,
    screen: 'OrderTracking',
    status: newStatus,
  });
}
