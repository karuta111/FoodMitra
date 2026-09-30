# Food Delivery Platform — Database Design

> Status: Phase 1 design document. Schema lives in `prisma/schema.prisma`.
> Last updated: 2026-09-12

---

## 1. Datasource

- **Dev**: SQLite (file: `./dev.db`) — zero-config, runnable in sandbox.
- **Prod**: PostgreSQL — change `provider` in `schema.prisma` from `sqlite` to `postgresql` and set `DATABASE_URL` to a Postgres connection string. Schema is otherwise portable.

### 1.1 PostgreSQL-only features used in production

- `@db.Decimal(10,2)` for monetary fields (SQLite falls back to `Float` in dev — acceptable for demo).
- `@@index` with `gist` for geo columns — replaced with `btree` on SQLite.
- Native enums (`enum Role { ADMIN RESTAURANT CUSTOMER RIDER }`) — emulated as `String` + Zod enum on SQLite.

---

## 2. Entity Relationship Diagram

```text
┌─────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User   │────<│ RefreshToken     │     │ Notification    │
│         │     └──────────────────┘     │                 │
│ role    │                              │ recipientId ────┼──> User
│ email   │                              └─────────────────┘
│ passHash│
│ phone   │     ┌──────────────────┐
└────┬────┘     │ PasswordResetToken│
     │          │                  │
     │          └──────────────────┘
     │
     ├────── (role=CUSTOMER) ──> ┌──────────────────┐    ┌──────────────────┐
     │                            │ CustomerProfile  │───<│ DeliveryAddress  │
     │                            │ name, phone      │    │ label, lat, lng  │
     │                            └──────┬───────────┘    └──────────────────┘
     │                                   │
     │                                   │ 1 cart per customer
     │                                   ▼
     │                            ┌──────────────────┐    ┌──────────────────┐
     │                            │ Cart             │───<│ CartItem         │
     │                            │ restaurantId     │    │ menuItemId, qty  │
     │                            └──────────────────┘    └──────────────────┘
     │
     └────── (role=RESTAURANT) ─> ┌──────────────────┐    ┌──────────────────┐
                                  │ Restaurant       │───<│ RestaurantAddress│
                                  │ ownerId = User.id│    │ street, lat, lng │
                                  │ status           │    └──────────────────┘
                                  │ availability     │
                                  │ ratingAvg        │    ┌──────────────────┐
                                  │                  │───<│ MenuCategory     │
                                  │                  │    │ name             │
                                  │                  │    └────────┬─────────┘
                                  │                  │             │
                                  │                  │             ▼
                                  │                  │    ┌──────────────────┐
                                  │                  │───<│ MenuItem         │
                                  │                  │    │ name, price, veg │
                                  │                  │    │ imageUrl         │
                                  │                  │    │ availability     │
                                  │                  │    └──────────────────┘
                                  │
                                  │
                                  └───<┐
                                       │ Order.restaurantId
                                       ▼
                                ┌──────────────────┐    ┌──────────────────┐
                                │ Order            │───<│ OrderItem        │
                                │ customerId       │    │ itemNameSnapshot│
                                │ status           │    │ itemPriceSnapshot│
                                │ paymentStatus    │    │ quantity         │
                                │ subtotal         │    │ subtotal         │
                                │ deliveryFee      │    └──────────────────┘
                                │ tax, discount    │
                                │ totalAmount      │    ┌──────────────────┐
                                │ riderId (null)   │───<│ OrderStatusHistory│
                                │ deliveryAddress  │    │ fromStatus       │
                                │ deliveryLat/Lng  │    │ toStatus         │
                                └──────┬───────────┘    │ changedByUserId │
                                       │                │ timestamp       │
                                       │ 1:1            └──────────────────┘
                                       ▼
                                ┌──────────────────┐    ┌──────────────────┐
                                │ Payment          │    │ Review           │
                                │ razorpayOrderId  │    │ orderId (unique) │
                                │ razorpayPaymentId│    │ customerId       │
                                │ razorpaySignature│    │ rating 1-5       │
                                │ status           │    │ comment          │
                                │ amount           │    │ restaurantId     │
                                │ method           │    └──────────────────┘
                                │ refundId         │
                                │ refundStatus     │    ┌──────────────────┐
                                └──────────────────┘    │ WebhookEvent     │
                                                        │ webhookEventId   │
                                ┌──────────────────┐    │ eventType        │
                                │ Rider (future)   │    │ payloadHash      │
                                │ userId           │    │ processedAt      │
                                │ status           │    └──────────────────┘
                                │ currentLocation  │
                                └──────────────────┘

                                ┌──────────────────┐    ┌──────────────────┐
                                │ PlatformSettings │    │ Category         │
                                │ key, value       │    │ name (cuisine)   │
                                │ (taxRate,        │    │ slug             │
                                │  deliveryFee...) │    └──────────────────┘
                                └──────────────────┘
```

---

## 3. Enum Definitions

```prisma
enum Role {
  ADMIN
  RESTAURANT
  CUSTOMER
  RIDER        // not used in MVP; schema-only
}

enum RestaurantStatus {
  PENDING_APPROVAL
  ACTIVE
  INACTIVE
  SUSPENDED
  REJECTED
}

enum RestaurantAvailability {
  OPEN
  CLOSED
  TEMPORARILY_UNAVAILABLE
}

enum MenuItemAvailability {
  AVAILABLE
  UNAVAILABLE
}

enum OrderStatus {
  PENDING_PAYMENT
  PAID
  RESTAURANT_ACCEPTED
  PREPARING
  READY_FOR_PICKUP
  PICKED_UP
  OUT_FOR_DELIVERY
  DELIVERED
  PAYMENT_FAILED
  REJECTED_BY_RESTAURANT
  CANCELLED
}

enum PaymentStatus {
  PENDING
  CAPTURED
  FAILED
  REFUNDED
  REFUND_PENDING
}

enum PaymentMethod {
  RAZORPAY
  // CASH_ON_DELIVERY  // future
}

enum RiderAssignmentStatus {
  UNASSIGNED
  ASSIGNED
  PICKED_UP
  DELIVERED
}

enum NotificationType {
  ORDER_PLACED
  PAYMENT_SUCCESSFUL
  RESTAURANT_ACCEPTED
  RESTAURANT_REJECTED
  PREPARING
  READY
  RIDER_ASSIGNED
  PICKED_UP
  OUT_FOR_DELIVERY
  DELIVERED
  CANCELLED
  NEW_ORDER
  CUSTOMER_CANCELLATION
  NEW_RESTAURANT_REGISTRATION
  PAYMENT_ISSUE
  REFUND_EVENT
}

enum AddressLabel {
  HOME
  WORK
  OTHER
}
```

> On SQLite these are emitted as `String` columns with Zod runtime validation. On PostgreSQL they become native `enum` types.

---

## 4. Table Definitions

### 4.1 `User`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | String | PK, cuid | |
| email | String | unique, not null | lowercased on write |
| passwordHash | String | not null | bcrypt 12 rounds |
| role | Role | not null | indexed |
| phone | String? | | E.164 validated |
| isActive | Boolean | default true | set false on block |
| createdAt | DateTime | default now | |
| updatedAt | DateTime | updatedAt | |

Relations: customerProfile, restaurant, refreshTokens, passwordResetTokens, notifications, orders (as customer), orderStatusHistory (as changer), reviews.

### 4.2 `CustomerProfile`

| Column | Type | Constraints |
|---|---|---|
| id | String | PK |
| userId | String | FK→User, unique |
| fullName | String | not null |
| phone | String? | |
| defaultAddressId | String? | FK→DeliveryAddress |

### 4.3 `DeliveryAddress`

| Column | Type | Constraints |
|---|---|---|
| id | String | PK |
| customerId | String | FK→User |
| label | AddressLabel | |
| line1 | String | not null |
| line2 | String? | |
| city | String | not null |
| state | String | |
| postalCode | String | |
| latitude | Float | not null |
| longitude | Float | not null |

Index: `customerId`.

### 4.4 `Restaurant`

| Column | Type | Constraints |
|---|---|---|
| id | String | PK |
| ownerId | String | FK→User, unique |
| name | String | not null |
| description | String? | |
| cuisine | String | indexed (e.g. "North Indian") |
| logoUrl | String? | |
| coverImageUrl | String? | |
| phone | String | |
| email | String | |
| openingTime | String | "09:00" |
| closingTime | String | "23:00" |
| minOrderAmount | Float | default 99 |
| deliveryFee | Float | default 30 |
| deliveryRadiusKm | Float | default 5 |
| avgRating | Float | default 0 |
| ratingCount | Int | default 0 |
| status | RestaurantStatus | default PENDING_APPROVAL |
| availability | RestaurantAvailability | default CLOSED |
| rejectionReason | String? | |
| latitude | Float | |
| longitude | Float | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Indexes: `ownerId`, `status`, `cuisine`, `(latitude, longitude)`.

### 4.5 `RestaurantAddress`

| Column | Type |
|---|---|
| id | String PK |
| restaurantId | String FK→Restaurant unique |
| line1, line2, city, state, postalCode | String |
| latitude, longitude | Float |

### 4.6 `MenuCategory`

| Column | Type | Constraints |
|---|---|---|
| id | String | PK |
| restaurantId | String | FK→Restaurant |
| name | String | |
| displayOrder | Int | default 0 |

Index: `(restaurantId, displayOrder)`. Unique: `(restaurantId, name)`.

### 4.7 `MenuItem`

| Column | Type | Constraints |
|---|---|---|
| id | String | PK |
| categoryId | String | FK→MenuCategory |
| restaurantId | String | FK→Restaurant (denormalized for fast filtering) |
| name | String | |
| description | String? | |
| price | Float | |
| imageUrl | String? | |
| isVeg | Boolean | default true |
| availability | MenuItemAvailability | default AVAILABLE |
| displayOrder | Int | default 0 |
| prepTimeMinutes | Int | default 15 |

Indexes: `restaurantId`, `categoryId`, `(restaurantId, availability)`.

### 4.8 `Cart`

| Column | Type | Constraints |
|---|---|---|
| id | String | PK |
| customerId | String | FK→User, unique |
| restaurantId | String | FK→Restaurant |
| createdAt | DateTime | |
| updatedAt | DateTime | |

> One cart per customer (enforced by unique constraint on `customerId`).

### 4.9 `CartItem`

| Column | Type |
|---|---|
| id | String PK |
| cartId | String FK→Cart |
| menuItemId | String FK→MenuItem |
| quantity | Int (>=1) |
| unitPrice | Float (snapshot at add-time, but **always re-fetched at checkout**) |

Unique: `(cartId, menuItemId)`.

### 4.10 `Order`

| Column | Type | Constraints |
|---|---|---|
| id | String | PK |
| shortCode | String | unique, e.g. "#ABC123" — 6-char human-friendly |
| customerId | String | FK→User |
| restaurantId | String | FK→Restaurant |
| deliveryAddressLine1 | String | |
| deliveryAddressLine2 | String? | |
| deliveryCity | String | |
| deliveryLatitude | Float | |
| deliveryLongitude | Float | |
| deliveryPhone | String | |
| subtotal | Float | |
| deliveryFee | Float | |
| tax | Float | |
| discount | Float | default 0 |
| totalAmount | Float | |
| paymentStatus | PaymentStatus | default PENDING |
| orderStatus | OrderStatus | default PENDING_PAYMENT |
| riderId | String? | FK→Rider (future) |
| riderName | String? | snapshot |
| riderPhone | String? | snapshot |
| riderAssignmentStatus | RiderAssignmentStatus | default UNASSIGNED |
| notes | String? | |
| idempotencyKey | String? | unique if provided |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Indexes: `customerId`, `restaurantId`, `orderStatus`, `createdAt`, `idempotencyKey`.

### 4.11 `OrderItem`

| Column | Type |
|---|---|
| id | String PK |
| orderId | String FK→Order |
| menuItemId | String FK→MenuItem |
| itemNameSnapshot | String |
| itemPriceSnapshot | Float |
| quantity | Int |
| subtotal | Float |
| isVeg | Boolean |

Index: `orderId`.

### 4.12 `OrderStatusHistory`

| Column | Type |
|---|---|
| id | String PK |
| orderId | String FK→Order |
| fromStatus | OrderStatus? |
| toStatus | OrderStatus |
| changedByUserId | String FK→User |
| note | String? |
| metadata | Json? |
| createdAt | DateTime |

> Append-only. No `updatedAt`. Service layer forbids updates.

### 4.13 `Payment`

| Column | Type |
|---|---|
| id | String PK |
| orderId | String FK→Order unique (1:1) |
| razorpayOrderId | String? |
| razorpayPaymentId | String? |
| razorpaySignature | String? |
| amount | Float |
| currency | String default "INR" |
| method | PaymentMethod default RAZORPAY |
| status | PaymentStatus default PENDING |
| refundId | String? |
| refundStatus | String? |
| refundAmount | Float? |
| failureReason | String? |
| createdAt | DateTime |
| updatedAt | DateTime |

Indexes: `razorpayOrderId`, `razorpayPaymentId`, `status`.

### 4.14 `Review`

| Column | Type | Constraints |
|---|---|---|
| id | String | PK |
| orderId | String | FK→Order, unique |
| customerId | String | FK→User |
| restaurantId | String | FK→Restaurant |
| rating | Int | 1-5 |
| comment | String? | |
| isHidden | Boolean | default false (admin moderation) |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Index: `restaurantId`, `customerId`. Unique: `orderId` (enforces one review per order).

### 4.15 `Notification`

| Column | Type |
|---|---|
| id | String PK |
| recipientId | String FK→User |
| type | NotificationType |
| title | String |
| body | String |
| data | Json? |
| isRead | Boolean default false |
| createdAt | DateTime |

Index: `(recipientId, isRead, createdAt)`.

### 4.16 `RefreshToken`

| Column | Type |
|---|---|
| id | String PK |
| userId | String FK→User |
| tokenHash | String unique |
| expiresAt | DateTime |
| revokedAt | DateTime? |
| createdAt | DateTime |

Index: `userId`, `tokenHash`.

### 4.17 `PasswordResetToken`

| Column | Type |
|---|---|
| id | String PK |
| userId | String FK→User |
| tokenHash | String unique |
| expiresAt | DateTime |
| usedAt | DateTime? |
| createdAt | DateTime |

### 4.18 `Rider` (future — schema only)

| Column | Type |
|---|---|
| id | String PK |
| userId | String FK→User unique |
| status | String default "OFFLINE" |
| currentLatitude | Float? |
| currentLongitude | Float? |
| vehicleNumber | String? |
| createdAt | DateTime |

### 4.19 `WebhookEvent` (idempotency log)

| Column | Type |
|---|---|
| id | String PK |
| provider | String ("razorpay") |
| eventId | String unique |
| eventType | String |
| payloadHash | String |
| processedAt | DateTime |

### 4.20 `PlatformSettings` (key-value)

| Column | Type |
|---|---|
| key | String PK |
| value | String |
| updatedAt | DateTime |

Seeded defaults: `taxRate=0.05`, `defaultDeliveryFee=30`, `minOrderAmount=99`, `defaultDeliveryRadiusKm=5`.

### 4.21 `Category` (cuisine master list)

| Column | Type |
|---|---|
| id | String PK |
| name | String unique |
| slug | String unique |

---

## 5. Indexes Summary

| Table | Index | Purpose |
|---|---|---|
| User | email (unique) | login lookup |
| User | role | RBAC filtering |
| Restaurant | ownerId | restaurant dashboard |
| Restaurant | status + cuisine | customer discovery |
| Restaurant | lat, lng | proximity queries (btree in dev, gist in prod) |
| MenuItem | restaurantId + availability | menu page query |
| Order | customerId + createdAt | customer order history |
| Order | restaurantId + orderStatus | restaurant new-orders queue |
| Order | idempotencyKey | dedup |
| OrderStatusHistory | orderId + createdAt | timeline query |
| Notification | recipientId + isRead + createdAt | unread badge |

---

## 6. Migrations Strategy

- **Dev (SQLite)**: `bun run db:push` — destructive but fast for iteration.
- **Prod (PostgreSQL)**: `bun run db:migrate` — generates versioned SQL migrations under `prisma/migrations/`. **Never** modify production schema without a migration.

### 6.1 Switching from SQLite to PostgreSQL

1. Set `DATABASE_URL` to the Postgres URL.
2. Change `datasource.db.provider` from `sqlite` to `postgresql` in `prisma/schema.prisma`.
3. (Optional) Replace `String`-backed enum comments with native `enum` blocks (already in schema as Prisma enums — Prisma auto-promotes them on Postgres).
4. Run `bun run db:migrate dev --name init` to generate the first migration.
5. Run `bun run db:seed` to populate.

---

## 7. Data Integrity Rules Enforced in Service Layer (not just DB)

- Order creation re-fetches MenuItem prices from DB (never trusts cart snapshot for amount).
- OrderItem snapshots `itemName` + `itemPrice` at creation; these are immutable afterward.
- OrderStatusHistory records are append-only — service throws if you try to update.
- Payment.status transitions are limited: PENDING → CAPTURED | FAILED; CAPTURED → REFUND_PENDING → REFUNDED.
- Cart uniqueness: only one cart per customer (DB-enforced); adding item from a different restaurant requires explicit cart clear.
- Review: one per orderId (DB-enforced); rating in 1..5 (service validates).
- RefreshToken: revocable; rotation optional but supported.
