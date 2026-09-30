# Food Delivery Platform — Order State Machine

> Status: Phase 1 design document.
> Last updated: 2026-09-12

---

## 1. States

### 1.1 Primary flow (happy path)

```text
PENDING_PAYMENT ──payment captured──> PAID
                                              │
                                              │ restaurant accepts
                                              ▼
                                   RESTAURANT_ACCEPTED
                                              │
                                              │ restaurant starts preparing
                                              ▼
                                          PREPARING
                                              │
                                              │ restaurant marks ready
                                              ▼
                                     READY_FOR_PICKUP
                                              │
                                              │ rider (or admin) picks up
                                              ▼
                                         PICKED_UP
                                              │
                                              │ rider out for delivery
                                              ▼
                                    OUT_FOR_DELIVERY
                                              │
                                              │ delivered
                                              ▼
                                         DELIVERED
```

### 1.2 Terminal / failure states

```text
PAYMENT_FAILED          (from PENDING_PAYMENT when payment fails)
REJECTED_BY_RESTAURANT  (from PAID when restaurant rejects)
CANCELLED               (from PENDING_PAYMENT | PAID when customer cancels)
```

### 1.3 Full state list

| State | Description | Who triggers exit |
|---|---|---|
| `PENDING_PAYMENT` | Order created in DB, awaiting Razorpay capture | System (payment webhook) or Customer (cancel) |
| `PAID` | Payment captured, awaiting restaurant acceptance | Restaurant |
| `RESTAURANT_ACCEPTED` | Restaurant acknowledged the order | Restaurant |
| `PREPARING` | Kitchen is preparing the food | Restaurant |
| `READY_FOR_PICKUP` | Food ready, waiting for rider pickup | Restaurant or Admin (manual rider assignment in MVP) |
| `PICKED_UP` | Rider collected the food | Admin (manual in MVP) |
| `OUT_FOR_DELIVERY` | Rider en route to customer | Admin (manual in MVP) |
| `DELIVERED` | Customer received the food | Admin (manual in MVP) |
| `PAYMENT_FAILED` | Payment authorization/capture failed | System |
| `REJECTED_BY_RESTAURANT` | Restaurant declined the order (refund triggered) | Restaurant |
| `CANCELLED` | Customer cancelled before/after payment | Customer |

---

## 2. Valid Transitions Matrix

| From \ To | PAID | REST_ACCEPT | PREPARING | READY | PICKED | OFD | DELIVERED | PAY_FAIL | REJECTED | CANCELLED |
|---|---|---|---|---|---|---|---|---|---|---|
| `PENDING_PAYMENT` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| `PAID` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `RESTAURANT_ACCEPTED` | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `PREPARING` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `READY_FOR_PICKUP` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `PICKED_UP` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `OUT_FOR_DELIVERY` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `DELIVERED` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `PAYMENT_FAILED` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `REJECTED_BY_RESTAURANT` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `CANCELLED` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend**: ✅ = allowed; ❌ = rejected with `INVALID_STATE_TRANSITION` error.

### 2.1 Examples of REJECTED transitions

- `PAID → DELIVERED` — must go through full preparation chain
- `PENDING_PAYMENT → PREPARING` — must capture payment first
- `DELIVERED → CANCELLED` — terminal state cannot be left
- `PREPARING → RESTAURANT_ACCEPTED` — no backward transitions

---

## 3. Transition Matrix by Trigger

| Transition | API endpoint | Allowed roles | Side effects |
|---|---|---|---|
| (create) → PENDING_PAYMENT | `POST /api/v1/orders` | CUSTOMER | Create Order + Payment (PENDING), snapshot items, clear cart |
| PENDING_PAYMENT → PAID | (system) on payment verify or webhook | system | Update Payment.status=CAPTURED, notify CUSTOMER + RESTAURANT |
| PENDING_PAYMENT → PAYMENT_FAILED | (system) on payment failure | system | Update Payment.status=FAILED, notify CUSTOMER |
| PENDING_PAYMENT → CANCELLED | `POST /api/v1/orders/:id/cancel` | CUSTOMER | Notify RESTAURANT (if PAID) — usually pre-payment so just expire |
| PAID → RESTAURANT_ACCEPTED | `POST /api/v1/restaurant/orders/:id/accept` | RESTAURANT, ADMIN | Notify CUSTOMER |
| PAID → REJECTED_BY_RESTAURANT | `POST /api/v1/restaurant/orders/:id/reject` | RESTAURANT, ADMIN | Initiate refund, notify CUSTOMER |
| PAID → CANCELLED | `POST /api/v1/orders/:id/cancel` | CUSTOMER | Initiate refund, notify RESTAURANT |
| RESTAURANT_ACCEPTED → PREPARING | `POST /api/v1/restaurant/orders/:id/prepare` | RESTAURANT, ADMIN | Notify CUSTOMER |
| PREPARING → READY_FOR_PICKUP | `POST /api/v1/restaurant/orders/:id/ready` | RESTAURANT, ADMIN | Notify CUSTOMER |
| READY_FOR_PICKUP → PICKED_UP | `POST /api/v1/admin/orders/:id/picked-up` | ADMIN (rider app future) | Set riderAssignmentStatus=ASSIGNED, notify CUSTOMER |
| PICKED_UP → OUT_FOR_DELIVERY | `POST /api/v1/admin/orders/:id/out-for-delivery` | ADMIN | Notify CUSTOMER |
| OUT_FOR_DELIVERY → DELIVERED | `POST /api/v1/admin/orders/:id/delivered` | ADMIN | Mark delivered, set riderAssignmentStatus=DELIVERED, notify CUSTOMER, allow review |

---

## 4. Implementation

### 4.1 Transition map (TypeScript)

```typescript
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT:        ['PAID', 'PAYMENT_FAILED', 'CANCELLED'],
  PAID:                   ['RESTAURANT_ACCEPTED', 'REJECTED_BY_RESTAURANT', 'CANCELLED'],
  RESTAURANT_ACCEPTED:    ['PREPARING'],
  PREPARING:              ['READY_FOR_PICKUP'],
  READY_FOR_PICKUP:       ['PICKED_UP'],
  PICKED_UP:              ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY:       ['DELIVERED'],
  DELIVERED:              [],
  PAYMENT_FAILED:         ['CANCELLED'],
  REJECTED_BY_RESTAURANT: [],
  CANCELLED:              [],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
```

### 4.2 Service-layer transition

```typescript
async function transitionOrder(
  orderId: string,
  toStatus: OrderStatus,
  ctx: AuthContext,
  note?: string,
): Promise<Order> {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } })
    const from = order.orderStatus
    if (!canTransition(from, toStatus)) {
      throw new AppError('INVALID_STATE_TRANSITION', `Cannot transition ${from} → ${toStatus}`, 409)
    }
    // Ownership check
    if (ctx.role === 'RESTAURANT' && order.restaurantOwnerId !== ctx.userId) {
      throw new AppError('FORBIDDEN', 'Not your order', 403)
    }
    if (ctx.role === 'CUSTOMER' && order.customerId !== ctx.userId) {
      throw new AppError('FORBIDDEN', 'Not your order', 403)
    }
    const updated = await tx.order.update({ where: { id: orderId }, data: { orderStatus: toStatus } })
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: from,
        toStatus,
        changedByUserId: ctx.userId,
        note,
      },
    })
    // Trigger side-effect notifications (outside the tx if possible)
    scheduleNotificationsForTransition(order, toStatus)
    return updated
  })
}
```

### 4.3 Status history record

Every successful transition appends a row to `OrderStatusHistory`. Records are append-only — Prisma update on `OrderStatusHistory` rows is forbidden at the service layer.

---

## 5. Customer Cancellation Rules

- Customer can cancel from `PENDING_PAYMENT` and `PAID` states only.
- If payment was captured → trigger refund via Razorpay refund API, set Payment.refundStatus=`PENDING`.
- Once restaurant accepts (`RESTAURANT_ACCEPTED`+), customer cannot cancel — must call the restaurant (handled off-platform in MVP).

---

## 6. Restaurant Rejection Rules

- Restaurant can reject from `PAID` only.
- Rejection triggers full refund.
- Order moves to `REJECTED_BY_RESTAURANT` (terminal).
- Customer receives notification with rejection reason (if provided).

---

## 7. Refund Flow

```text
PAID ── restaurant rejects ──> REJECTED_BY_RESTAURANT
                                    │
                                    │ call razorpay.payments.refund(paymentId, {amount: full})
                                    │ Payment.status: CAPTURED → REFUND_PENDING
                                    │ Payment.refundId stored
                                    ▼
                              [Razorpay webhook: refund.processed]
                                    │
                                    │ Payment.status: REFUND_PENDING → REFUNDED
                                    │ Notify CUSTOMER (refund completed)
                                    ▼
                                  Done
```

Refunds are idempotent — re-calling `refund()` with the same `Payment.id` returns the existing refund.

---

## 8. Testing Matrix

| Scenario | Expected outcome |
|---|---|
| Customer cancels pre-payment | Order → CANCELLED, no refund needed |
| Customer cancels post-payment | Order → CANCELLED, refund triggered |
| Restaurant accepts → customer cancels | Rejected (409) |
| Restaurant rejects | Order → REJECTED_BY_RESTAURANT, refund triggered |
| Admin attempts `PAID → DELIVERED` | Rejected (409 INVALID_STATE_TRANSITION) |
| Restaurant A modifies Restaurant B's order | Rejected (403 FORBIDDEN) |
| Restaurant marks preparing when status is READY | Rejected (409 INVALID_STATE_TRANSITION) |
| Webhook fires twice for same event | Idempotent — no duplicate transition |
