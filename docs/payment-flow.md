# Food Delivery Platform — Payment Flow (Razorpay)

> Status: Phase 1 design document.
> Last updated: 2026-09-12

---

## 1. Overview

Razorpay is the only supported payment method in the MVP. The flow is:

1. Customer checks out cart.
2. Backend creates an internal `Order` (status=`PENDING_PAYMENT`) and a `Payment` record (status=`PENDING`).
3. Backend calls `razorpay.orders.create({ amount, currency: 'INR' })` to get a Razorpay Order ID.
4. Razorpay Order ID returned to client.
5. Client opens Razorpay Checkout (Razorpay web SDK for the web app; Razorpay React Native SDK for the mobile app).
6. Customer completes payment.
7. Razorpay returns `razorpay_payment_id` + `razorpay_order_id` + `razorpay_signature` to the client.
8. Client sends those three values to `POST /api/v1/payments/verify`.
9. **Backend verifies the HMAC signature** using `RAZORPAY_KEY_SECRET`.
10. **Backend re-fetches the payment from Razorpay API** to confirm `status=captured` and `amount` matches.
11. Backend updates `Payment.status=CAPTURED` and transitions `Order` from `PENDING_PAYMENT` → `PAID`.
12. Razorpay also sends a webhook to `/api/v1/payments/webhook` (idempotent — same outcome as step 11).

---

## 2. Sequence Diagram

```text
 Customer         Web/Mobile App         Backend                Razorpay
     │                  │                    │                       │
     │  Click "Pay"     │                    │                       │
     │─────────────────>│                    │                       │
     │                  │  POST /orders      │                       │
     │                  │───────────────────>│                       │
     │                  │                    │  POST /v1/orders      │
     │                  │                    │──────────────────────>│
     │                  │                    │<──────────────────────│  razorpay_order_id
     │                  │                    │  save Payment         │
     │                  │                    │   status=PENDING      │
     │                  │<───────────────────│  {order, payment}    │
     │                  │                    │                       │
     │  Open Checkout   │                    │                       │
     │<─────────────────│                    │                       │
     │                  │  Open checkout.js with razorpay_order_id    │
     │  Pay with card/UPI/etc              │                       │
     │──────────────────────────────────────────────────────────────>│
     │                  │<────────────────── payment_id, signature ──│
     │                  │                    │                       │
     │                  │  POST /payments/verify                    │
     │                  │───────────────────>│                       │
     │                  │                    │  verify HMAC          │
     │                  │                    │  GET /v1/payments/:id │
     │                  │                    │──────────────────────>│
     │                  │                    │<──────────────────────│ status=captured, amount
     │                  │                    │  TXN:                │
     │                  │                    │   Payment.status     │
     │                  │                    │     = CAPTURED       │
     │                  │                    │   Order.PENDING_PAY  │
     │                  │                    │     → PAID           │
     │                  │                    │   OrderStatusHistory │
     │                  │                    │   notify CUSTOMER    │
     │                  │                    │   notify RESTAURANT  │
     │                  │<───────────────────│  {success: true}    │
     │                  │                    │                       │
     │                  │                    │  (later)              │
     │                  │                    │  POST /payments/webhook │
     │                  │                    │<──────────────────────│ payment.captured event
     │                  │                    │  verify webhook sig   │
     │                  │                    │  idempotent: already │
     │                  │                    │   CAPTURED → no-op    │
```

---

## 3. Signature Verification

### 3.1 Client-side verify payload

```typescript
{
  razorpayOrderId:    string,
  razorpayPaymentId:  string,
  razorpaySignature:  string,
}
```

### 3.2 Backend verification algorithm

```typescript
import crypto from 'crypto'

function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')
  // constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(razorpaySignature, 'hex'),
  )
}
```

---

## 4. Payment States

```text
                   ┌───────────┐
                   │  PENDING  │ (order created in razorpay, no payment yet)
                   └─────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ CAPTURED │    │  FAILED  │    │ (cancel) │
   └─────┬────┘    └──────────┘    └──────────┘
         │ refund initiated               │
         ▼                                ▼
   ┌─────────────────┐              Order → CANCELLED
   │ REFUND_PENDING  │
   └─────┬───────────┘
         │ refund.processed webhook
         ▼
   ┌───────────┐
   │ REFUNDED  │
   └───────────┘
```

### 4.1 State transition rules

- `PENDING → CAPTURED`: only on signature match + Razorpay API confirmation.
- `PENDING → FAILED`: on Razorpay API returning `status=failed` or signature mismatch (signature mismatch = DO NOT update state, log security event).
- `CAPTURED → REFUND_PENDING`: on refund initiation (restaurant reject, customer cancel post-payment).
- `REFUND_PENDING → REFUNDED`: on `refund.processed` webhook.

---

## 5. Idempotency

### 5.1 Idempotency-Key header

`POST /api/v1/payments/verify` and `POST /api/v1/orders` accept an `Idempotency-Key` header. If the same key is reused:

1. First request: process normally, store `idempotencyKey` on the Order.
2. Subsequent requests with same key: return the **original** response without creating a duplicate.

### 5.2 Webhook idempotency

Razorpay sends a `X-Razorpay-Event-Id` header with every webhook. Flow:

```typescript
async function handleWebhook(eventId, eventType, payload) {
  const existing = await db.webhookEvent.findUnique({ where: { eventId } })
  if (existing) {
    logger.info({ eventId }, 'Duplicate webhook — skipping')
    return { status: 'already_processed' }
  }
  await db.$transaction(async (tx) => {
    await tx.webhookEvent.create({
      data: { provider: 'razorpay', eventId, eventType, payloadHash: hash(payload), processedAt: new Date() }
    })
    // process event
    if (eventType === 'payment.captured') {
      await markPaymentCaptured(payload.payment.entity)
    } else if (eventType === 'refund.processed') {
      await markPaymentRefunded(payload.payload.payment.entity)
    }
    // ...
  })
}
```

### 5.3 Race conditions

- If the client `/verify` and the webhook arrive simultaneously, the transaction + `WebhookEvent` table guarantee only one of them wins.
- If `/verify` wins: webhook sees `Payment.status=CAPTURED` already → no-op.
- If webhook wins: `/verify` sees `Payment.status=CAPTURED` already → returns success without re-transitioning.

---

## 6. Webhook Verification

```typescript
function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex'),
  )
}
```

**Critical**: Next.js API routes must read the raw body (not parsed JSON) for webhook verification. We disable body parsing for the webhook route and read `req.text()` manually.

---

## 7. Failure & Recovery Scenarios

| Scenario | Recovery |
|---|---|
| **App crash before client sends `/verify`** | Razorpay webhook `payment.captured` arrives, captures the payment, transitions the order. Customer reopens app → sees order PAID. |
| **Network failure during `/verify`** | Customer retries `/verify` with same payload. Idempotent on `razorpayPaymentId` — returns success if already captured. |
| **Duplicate webhook** | `WebhookEvent` table dedupes via `eventId` unique constraint. |
| **Delayed webhook** | Customer-side `/verify` wins; webhook arrives later → no-op. |
| **Signature mismatch on `/verify`** | Return 400. Do NOT update state. Log security event. Possible tampering attempt. |
| **Signature mismatch on webhook** | Return 401. Razorpay will retry up to 5 times. If still failing, alert ops. |
| **Razorpay API outage during `/verify`** | Return 503 with retry-after. Client retries. Order remains in `PENDING_PAYMENT` until verified or webhook arrives. |
| **Refund webhook arrives before `refund()` API returns** | `Payment.refundId` may be null briefly; webhook handler fetches refund details from Razorpay API by `paymentId` and updates. |
| **Customer cancels pre-payment, then pays** | Order is `CANCELLED` — payment capture webhook triggers refund automatically (Razorpay refunds on canceled orders). |

---

## 8. Razorpay Test Mode

For local development and this prototype, Razorpay runs in **test mode**:

```bash
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxx"  # client-side checkout
```

### 8.1 Test cards (Razorpay-provided)

| Card number | Behavior |
|---|---|
| `4111 1111 1111 1111` | Successful payment |
| `4000 0000 0000 0002` | Payment declined |
| `4000 0000 0000 0069` | Payment marked disputed |
| `4000 0000 0000 9995` | Insufficient funds |

In the web app, we also expose a **mock checkout** option that skips the real Razorpay SDK and simulates success — useful when running offline or in CI.

---

## 9. Refunds

### 9.1 Trigger points

- Restaurant rejects an order (`POST /api/v1/restaurant/orders/:id/reject`)
- Customer cancels an already-paid order
- Admin manually triggers a refund from the admin dashboard

### 9.2 Refund API call

```typescript
const refund = await razorpay.payments.refund(razorpayPaymentId, {
  amount: payment.amount * 100, // paise
  notes: { reason: 'restaurant_rejected_order' },
})
await db.payment.update({
  where: { orderId },
  data: {
    refundId: refund.id,
    refundStatus: refund.status, // 'pending' | 'processed' | 'failed'
    refundAmount: refund.amount / 100,
  },
})
```

### 9.3 Refund webhook

```text
POST /api/v1/payments/webhook
{
  "event": "refund.processed",
  "payload": {
    "refund": {
      "entity": {
        "id": "rfd_xxx",
        "payment_id": "pay_xxx",
        "status": "processed"
      }
    }
  }
}
```

Handler transitions `Payment.status: REFUND_PENDING → REFUNDED` and notifies the customer.

---

## 10. Logging

| Event | Log fields |
|---|---|
| Razorpay order created | `razorpayOrderId, orderId, amount` |
| Payment signature verified | `razorpayPaymentId, razorpayOrderId, orderId` |
| Payment capture confirmed | `razorpayPaymentId, orderId, amount, method` |
| Webhook received | `eventId, eventType` |
| Webhook duplicate skipped | `eventId, originalProcessedAt` |
| Webhook signature mismatch | `eventId, ip` (security alert) |
| Refund initiated | `razorpayPaymentId, refundId, amount, reason` |
| Refund completed | `razorpayPaymentId, refundId` |

Never log: `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, full card numbers.

---

## 11. Frontend Integration

### 11.1 Web app (Next.js)

Load Razorpay checkout script in a client component:

```tsx
'use client'
declare global { window: { Razorpay: any } }

export function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(window.Razorpay)
    s.onerror = reject
    document.body.appendChild(s)
  })
}

export async function startCheckout({ razorpayOrderId, amount, customerName, customerEmail, customerPhone }) {
  const Razorpay = await loadRazorpay()
  const rzp = new Razorpay({
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    order_id: razorpayOrderId,
    amount, // paise
    name: 'FoodMitra',
    description: 'Order payment',
    prefill: { name: customerName, email: customerEmail, contact: customerPhone },
    theme: { color: '#f97316' },
    handler: async (response) => {
      // POST /api/v1/payments/verify with response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature
    },
    modal: {
      ondismiss: () => { /* show "payment cancelled" UI; do NOT mark as paid */ }
    }
  })
  rzp.open()
}
```

### 11.2 React Native (mobile stub)

Use `react-native-razorpay`:

```typescript
import RazorpayCheckout from 'react-native-razorpay'
RazorpayCheckout.open(options).then((data) => {
  // data.razorpay_payment_id, data.razorpay_order_id, data.razorpay_signature
})
```

---

## 12. Security Checklist

- [x] Backend is the only source of truth for amount (re-fetched from Order on verify)
- [x] Signature verified with constant-time comparison
- [x] Webhook signature verified
- [x] Webhook handler is idempotent via `WebhookEvent` table
- [x] Idempotency-Key header supported on `/payments/verify` and `/orders`
- [x] Refunds triggered only by authorized transitions
- [x] Refund status updated by webhook, not by client
- [x] No secrets in client bundle (`NEXT_PUBLIC_RAZORPAY_KEY_ID` only)
- [x] Raw body preserved for webhook signature verification
- [x] Razorpay API key rotation: just change env var — no code change
