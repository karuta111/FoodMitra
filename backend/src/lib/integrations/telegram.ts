// src/lib/integrations/telegram.ts
// Telegram Bot notification service.
// Sends an alert to the admin's Telegram when a new order is placed,
// with TWO copy buttons: one for restaurant details, one for rider details.
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
 * Send a message with multiple inline "copy_text" buttons.
 * Each button copies its own text to the user's clipboard when tapped.
 * Uses Telegram Bot API 7.x copy_text button type.
 */
export async function sendTelegramMessageWithCopyButtons(
  htmlMessage: string,
  buttons: Array<{ text: string; copyText: string }>,
): Promise<void> {
  if (!isTelegramConfigured()) {
    console.warn('[telegram] Not configured — set TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID');
    return;
  }
  try {
    const inlineKeyboard = buttons.map((btn) => [
      { text: btn.text, copy_text: { text: btn.copyText } },
    ]);

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text: htmlMessage,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: inlineKeyboard },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('[telegram] sendMessage with copy buttons failed:', res.status, body.slice(0, 200));
      // Fallback: send without buttons
      await sendTelegramMessage(htmlMessage);
    }
  } catch (err) {
    console.error('[telegram] sendMessage with copy buttons error:', err);
    // Fallback: send as plain message
    await sendTelegramMessage(htmlMessage);
  }
}

/**
 * Send a rich order alert to the admin's Telegram with TWO copy buttons:
 *
 * 1. "🍽️ Copy restaurant details" — order ID + menu items only (no customer/pricing/address).
 *    Used when forwarding to the restaurant so they know what to prepare.
 *
 * 2. "🛵 Copy rider details" — restaurant + customer + order ID + items + total + address.
 *    Used when forwarding to the delivery rider so they know where to pick up and deliver.
 *
 * Both buttons use Telegram's copy_text feature — one tap copies to clipboard.
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

  // --- Button 1: Restaurant details ---
  // Order ID + menu items only. No customer info, no pricing, no address.
  const restaurantCopyText = [
    `Order: ${order.shortCode}`,
    `${order.restaurantName}`,
    '',
    order.items
      .map((it) => `${it.name} x${it.quantity}`)
      .join('\n'),
  ].join('\n');

  // --- Button 2: Rider details ---
  // Full details: restaurant, customer, order ID, items, total, address.
  const riderCopyText = [
    `Order: ${order.shortCode}`,
    `Restaurant: ${order.restaurantName}`,
    `Customer: ${order.customerName || '—'} (${order.customerPhone})`,
    '',
    order.items
      .map((it) => `${it.name} x${it.quantity} - Rs.${it.subtotal}`)
      .join('\n'),
    '',
    `Total: Rs.${order.totalAmount}`,
    `Address: ${order.deliveryAddress}`,
  ].join('\n');

  // Truncate to 256 chars (Telegram copy_text limit)
  const restaurantCopy = restaurantCopyText.slice(0, 256);
  const riderCopy = riderCopyText.slice(0, 256);

  await sendTelegramMessageWithCopyButtons(msg, [
    { text: '🍽️ Copy restaurant details', copyText: restaurantCopy },
    { text: '🛵 Copy rider details', copyText: riderCopy },
  ]);
}
