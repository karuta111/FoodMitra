// src/lib/integrations/telegram.ts
// Telegram Bot notification service.
// Sends a WhatsApp-style alert to the admin's Telegram when a new order is placed.
//
// Setup:
//   1. Create a bot via @BotFather → get the bot token
//   2. Send any message to your bot from your Telegram account
//   3. Visit https://api.telegram.org/bot<TOKEN>/getUpdates → find your chat id
//   4. Set TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID in backend/.env

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

export function isTelegramConfigured(): boolean {
  return !!(BOT_TOKEN && ADMIN_CHAT_ID);
}

/**
 * Send a text message to the admin's Telegram chat.
 * Silent failure — logs a warning if it fails, never throws (so order creation isn't blocked).
 */
export async function sendTelegramMessage(text: string): Promise<void> {
  if (!isTelegramConfigured()) {
    console.warn('[telegram] Not configured — set TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID');
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[telegram] sendMessage failed:', res.status, body.slice(0, 200));
    }
  } catch (err) {
    console.error('[telegram] sendMessage error:', err);
  }
}

/**
 * Send a rich order alert to the admin's Telegram.
 * Called from OrderService.createOrder() after the order is committed.
 */
export async function sendOrderAlert(order: {
  shortCode: string;
  totalAmount: number;
  deliveryFee: number;
  subtotal: number;
  restaurantName: string;
  customerPhone: string;
  customerName?: string | null;
  items: Array<{ name: string; quantity: number; subtotal: number }>;
  deliveryAddress: string;
  paymentStatus: string;
}): Promise<void> {
  const itemsText = order.items
    .map((it) => `  • ${it.name} ×${it.quantity} — ₹${it.subtotal}`)
    .join('\n');

  const msg = [
    '🔔 <b>New Order Placed</b>',
    '',
    `Order: <b>${order.shortCode}</b>`,
    `Restaurant: ${order.restaurantName}`,
    `Customer: ${order.customerName || '—'} (${order.customerPhone})`,
    '',
    '📋 <b>Items:</b>',
    itemsText,
    '',
    `Subtotal: ₹${order.subtotal}`,
    `Delivery fee: ₹${order.deliveryFee}`,
    `<b>Total: ₹${order.totalAmount}</b>`,
    '',
    `📍 Address: ${order.deliveryAddress}`,
    `💳 Payment: ${order.paymentStatus}`,
  ].join('\n');

  await sendTelegramMessage(msg);
}
