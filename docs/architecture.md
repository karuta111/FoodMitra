# Food Delivery Platform — System Architecture

> Status: Phase 1 design document. All implementation must conform to this document.
> Last updated: 2026-09-12

---

## 1. Goals

- Build a production-grade food delivery platform (Zomato/Swiggy-class) as a **modular monolith**.
- Serve three active user roles (**ADMIN**, **RESTAURANT**, **CUSTOMER**) from one backend.
- Keep the architecture extensible for a future **RIDER** application without major restructuring.
- Backend is the single source of truth for **all financial calculations and state transitions**.

---

## 2. High-Level Architecture

```text
                         ┌───────────────────┐
                         │  React Native     │
                         │  Customer App     │   (Phase: stubbed in /mobile,
                         │                   │    runnable as responsive web at /)
                         └────────┬──────────┘
                                  │ REST API (JWT Bearer)
                                  ▼
                         ┌───────────────────┐
                         │  Next.js 16       │
                         │  App Router       │
                         │  (Web + API)      │
                         │                   │
                         │ ┌───────────────┐ │
                         │ │  API Routes   │ │   /api/v1/*
                         │ │  (Backend)    │ │   Versioned REST, Zod, RBAC
                         │ └───────┬───────┘ │
                         │         │         │
                         │ ┌───────▼───────┐ │
                         │ │ Service Layer │ │   Business logic, transactions
                         │ │ (use-cases)   │ │
                         │ └───────┬───────┘ │
                         │         │         │
                         │ ┌───────▼───────┐ │
                         │ │ Prisma Client │ │
                         │ └───────┬───────┘ │
                         │         │         │
                         │ ┌───────▼───────┐ │
                         │ │   Web UI      │ │   /  (single visible route)
                         │ │ Admin/Rest/   │ │   Role-switched SPA
                         │ │ Customer      │ │
                         │ └───────────────┘ │
                         └────────┬──────────┘
                                  │
                       ┌──────────┴──────────┐
                       ▼                     ▼
                ┌──────────────┐      ┌──────────────────┐
                │  SQLite      │      │   Razorpay      │
                │  (dev)       │      │   (test mode)   │
                │              │      │                  │
                │  PostgreSQL  │      │   Webhooks       │
                │  (prod)      │      │   (verify sig)   │
                └──────────────┘      └──────────────────┘
```

### 2.1 Why a single Next.js app for both web UI and backend?

The original spec calls for a separate `web/` React app and `backend/` Node.js Express server. For this runnable prototype we co-locate them inside one Next.js 16 app router project because:

1. **Sandbox constraint** — only one port (3000) is externally reachable. Co-location avoids a separate backend port and proxy.
2. **TypeScript end-to-end** — types are shared between API routes and UI.
3. **Zero-cost migration** — the `src/app/api/v1/*` route tree maps 1:1 to an Express `app.ts` if the team later splits the backend out. Service-layer code under `src/lib/services/*` is framework-agnostic.
4. **Razorpay webhooks** — can be received at `/api/v1/payments/webhook` without CORS configuration.

### 2.2 What about the React Native app?

A stub project lives in `/mobile` (Expo + TypeScript + React Navigation structure). It contains:
- File structure (`src/screens`, `src/components`, `src/api`, `src/store`, `src/navigation`)
- Navigation tree mirroring the spec's screen list
- API client configured to hit the backend
- **It is not runnable in this environment** — you run it locally with `npx expo start`.

The customer flow is **also** implemented as a responsive mobile-first view inside the web app at `/`, so you can demo the full customer journey in the browser.

---

## 3. Module Map

```text
src/
├── app/
│   ├── api/v1/                      # REST API surface (versioned)
│   │   ├── auth/                    # register, login, refresh, logout, forgot/reset
│   │   ├── restaurants/             # list, nearby, detail, create, update
│   │   ├── menu/                    # items + categories CRUD
│   │   ├── cart/                    # single-restaurant cart
│   │   ├── orders/                  # create, list, detail, tracking
│   │   ├── payments/                # create, verify, webhook
│   │   ├── restaurant/              # restaurant-scoped order actions
│   │   ├── reviews/                 # customer reviews, admin moderation
│   │   ├── notifications/           # list, mark-read
│   │   └── admin/                   # admin-only operations
│   ├── page.tsx                     # Single visible route — role-switched SPA
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── ui/                          # shadcn/ui primitives (preinstalled)
│   ├── shared/                      # cross-role layout, sidebar, header, etc.
│   ├── admin/                      # admin-only screens
│   ├── restaurant/                 # restaurant-only screens
│   └── customer/                  # customer mobile-first screens
│
├── lib/
│   ├── db.ts                        # Prisma client singleton
│   ├── auth/                        # JWT, hashing, sessions, RBAC
│   │   ├── jwt.ts
│   │   ├── password.ts
│   │   ├── session.ts
│   │   └── rbac.ts
│   ├── validators/                  # Zod schemas per module
│   ├── services/                    # Business logic (use-cases)
│   │   ├── auth.service.ts
│   │   ├── restaurant.service.ts
│   │   ├── menu.service.ts
│   │   ├── cart.service.ts
│   │   ├── pricing.service.ts
│   │   ├── order.service.ts
│   │   ├── payment.service.ts
│   │   ├── notification.service.ts
│   │   ├── review.service.ts
│   │   └── admin.service.ts
│   ├── integrations/
│   │   ├── razorpay.ts              # Real Razorpay SDK (test mode)
│   │   ├── storage.ts               # S3/Cloudinary abstraction
│   │   └── notifications.ts         # Push notification abstraction
│   ├── api-response.ts              # { success, data } | { success, error }
│   ├── logger.ts                    # Structured logger (pino-style)
│   ├── errors.ts                    # AppError, error codes
│   └── utils.ts                     # Misc
│
└── hooks/                           # React hooks (use-mobile, use-toast, etc.)
```

### 3.1 Module responsibilities

- **API routes** (`src/app/api/v1/*`): thin — parse request, validate with Zod, call service, return response. No business logic.
- **Services** (`src/lib/services/*`): all business logic, transactions, side effects. Pure functions of `(input, ctx)` where possible.
- **Validators** (`src/lib/validators/*`): Zod schemas — single source of truth for request shapes.
- **Integrations** (`src/lib/integrations/*`): external SDKs wrapped behind interfaces so we can swap providers without touching services.

---

## 4. Roles & Authentication

### 4.1 Roles

| Role | Scope | Source of identity |
|---|---|---|
| `ADMIN` | Platform-wide | Web app login |
| `RESTAURANT` | Own restaurant + its menu + its orders | Web app login |
| `CUSTOMER` | Own profile, addresses, cart, orders | Mobile app login (or web in this prototype) |
| `RIDER` | Assigned deliveries only | **Not implemented in MVP** |

### 4.2 Authentication strategy

- **JWT access tokens** (short-lived, 15 min) + **refresh tokens** (long-lived, 7 days).
- Access token in `Authorization: Bearer <token>` header.
- Refresh token stored http-only cookie + persisted in DB (`RefreshToken` table) for revocation.
- Passwords hashed with **bcrypt** (12 rounds). Plaintext never stored, never logged.
- Password reset via signed token emailed to user (email sending is stubbed in dev — token returned in API response for test convenience, but the flow is production-shaped).

### 4.3 RBAC enforcement points

1. **Route-level middleware** — `withAuth(requiredRoles)` HOF on every API route.
2. **Ownership check** — every service that touches a restaurant/customer/order verifies `resource.ownerId === ctx.userId` (or role === ADMIN).
3. **Frontend** is **never** a security boundary — routes are convenience only. Backend re-checks everything.

---

## 5. Data Flow Examples

### 5.1 Customer places order

```text
Customer (mobile)
  │
  │  POST /api/v1/orders  { restaurantId, items, deliveryAddressId, paymentMethod: 'RAZORPAY' }
  ▼
API route orders.ts
  │
  │  1. Validate body with Zod
  │  2. Authenticate user → ctx = { userId, role: CUSTOMER }
  │  3. Call orderService.createOrder(input, ctx)
  ▼
orderService.createOrder
  │
  │  BEGIN TX
  │  1. Fetch cart, verify ownership, verify restaurant is ACTIVE+OPEN
  │  2. For each cart item: fetch current MenuItem, verify AVAILABLE
  │  3. Snapshot name + price into OrderItem
  │  4. Calculate subtotal, deliveryFee, tax, totalAmount (server-side)
  │  5. Create Order in PENDING_PAYMENT state
  │  6. Create OrderStatusHistory record (PENDING_PAYMENT)
  │  7. Create Payment record (status=PENDING)
  │  8. Call razorpay.orders.create({ amount: totalAmount*100, currency: INR })
  │  9. Store razorpayOrderId on Payment
  │  10. CLEAR cart
  │  COMMIT
  │  11. Send notification to ADMIN (new order placed)
  │  12. Return { order, payment: { razorpayOrderId, amount } }
  ▼
Customer opens Razorpay checkout with returned order id
  │
  │  POST /api/v1/payments/verify  { razorpayPaymentId, razorpayOrderId, razorpaySignature }
  ▼
paymentService.verifyPayment
  │
  │  1. Verify HMAC signature against RAZORPAY_WEBHOOK_SECRET
  │  2. If signature invalid → return error, do NOT update state
  │  3. If valid → fetch payment from Razorpay API, confirm status=captured
  │  4. Idempotency: if Payment.status=CAPTURED already, return success without re-transitioning
  │  5. BEGIN TX
  │  6. Update Payment.status = CAPTURED, store razorpayPaymentId
  │  7. Transition Order PENDING_PAYMENT → PAID (validates transition)
  │  8. Append OrderStatusHistory record (PAID)
  │  9. Send notifications to CUSTOMER (payment success) + RESTAURANT (new order)
  │  COMMIT
```

### 5.2 Restaurant accepts order

```text
Restaurant (web)
  │
  │  POST /api/v1/restaurant/orders/:id/accept
  ▼
restaurant/orders/[id]/accept route
  │  1. ctx = requireAuth(['RESTAURANT', 'ADMIN'])
  │  2. orderService.transitionOrder(orderId, 'RESTAURANT_ACCEPTED', ctx)
  ▼
orderService.transitionOrder
  │  1. Fetch order with restaurant
  │  2. Verify ctx.user.role === ADMIN  OR  order.restaurant.ownerId === ctx.userId
  │  3. Verify currentStatus → RESTAURANT_ACCEPTED is a valid transition
  │  4. BEGIN TX
  │  5. Update order.status
  │  6. Append OrderStatusHistory
  │  7. Send notification to CUSTOMER (restaurant accepted)
  │  COMMIT
```

---

## 6. External Integrations

### 6.1 Razorpay

- **SDK**: `razorpay` npm package (server-side).
- **Test mode**: env vars `RAZORPAY_KEY_ID=test_xxx`, `RAZORPAY_KEY_SECRET=test_xxx`. No real charges.
- **Webhook**: `/api/v1/payments/webhook` — verifies HMAC, idempotent via `webhookEventId` stored in `WebhookEvent` table.
- **Signature verification**: server-side only. Frontend success callbacks are never trusted to mark payment successful.

### 6.2 Image storage

- **Database stores only URLs/keys**, never binaries.
- **Dev mode**: local `/public/uploads/` served by Next.js. MIME validated, size capped at 5 MB.
- **Prod**: swap `storage.ts` implementation to S3/Cloudinary without service changes.

### 6.3 Push notifications

- **Abstraction**: `NotificationProvider` interface in `integrations/notifications.ts`.
- **Dev**: in-app only (Notification table polled by client).
- **Prod**: FCM (mobile), Web Push (web). Service layer stays unchanged.

---

## 7. Cross-cutting Concerns

| Concern | Implementation |
|---|---|
| **Validation** | Zod schema per request shape, rejected before business logic |
| **Error handling** | `AppError` class with `code` + `statusCode`; central error wrapper turns it into the spec's error response shape |
| **Logging** | Structured JSON logger; events tagged with `module`, `userId`, `requestId`. Secrets never logged. |
| **Rate limiting** | In-memory token bucket per IP+route (sufficient for MVP; swap to Redis later) |
| **CORS** | Configured for the customer mobile origin only |
| **Security headers** | `helmet`-equivalent headers via `next.config.ts` |
| **Idempotency** | Idempotency-Key header supported on order create, payment verify, webhook |
| **Transactions** | `db.$transaction()` wraps every multi-write operation |
| **Migrations** | `prisma migrate dev` for prod; `prisma db push` for dev SQLite |

---

## 8. Environment Configuration

```bash
# Database (dev = SQLite file, prod = Postgres URL)
DATABASE_URL="file:./dev.db"            # dev
# DATABASE_URL="postgresql://user:pass@host:5432/foodmitra"  # prod

# JWT
JWT_SECRET="change-me"
JWT_REFRESH_SECRET="change-me-too"
JWT_ACCESS_TTL="15m"
JWT_REFRESH_TTL="7d"

# Razorpay (test mode — replace with live credentials in prod)
RAZORPAY_KEY_ID="test_key_id"
RAZORPAY_KEY_SECRET="test_key_secret"
RAZORPAY_WEBHOOK_SECRET="test_webhook_secret"

# App
NEXT_PUBLIC_APP_NAME="FoodMitra"
NEXT_PUBLIC_RAZORPAY_KEY_ID="test_key_id"   # client-side checkout
NODE_ENV="development"
```

A complete `.env.example` ships with the project.

---

## 9. Assumptions

1. **Single currency**: INR (Razorpay default). Multi-currency deferred.
2. **Single language**: English UI. i18n hook in place but only English strings shipped.
3. **No live GPS** in MVP — coordinates are stored but not real-time-tracked. Customer's saved address drives delivery.
4. **Rider assignment is manual** by Admin (via Admin dashboard) — no auto-assignment, no rider app.
5. **Cash on delivery** is NOT supported. Razorpay online payment only.
6. **Promotions/coupons** are NOT in MVP. `discount` field exists on Order for future use but defaults to 0.
7. **Email sending** is stubbed — password-reset tokens are returned in the API response for test convenience, but the flow is production-shaped (swap `email.service.ts` to a real provider later).
8. **Pricing rules**: deliveryFee = flat ₹30 within 5 km, ₹50 beyond; tax = 5% GST on subtotal; minimum order = ₹99. All configurable via `PlatformSettings` table.

---

## 10. Future Extensibility

The architecture is shaped to allow the following without major restructuring:

- **Rider application** — `Rider` model already exists. Add `rider-app/` Expo project, add `/api/v1/rider/*` routes, add `RIDER` role to RBAC. Order schema already has `riderId`, `riderName`, `riderPhone`, `riderAssignmentStatus` fields.
- **Live GPS** — `Order.liveLocation` field placeholder; add WebSocket mini-service for streaming.
- **Coupons/promotions** — `discount` field on Order, `Coupon` model can be added without schema changes to existing tables.
- **Cash on delivery** — add `paymentMethod` enum value, branch in `order.service.ts`.
- **Multi-restaurant cart** — refactor `Cart` to support multiple `CartRestaurantGroup` children.

---

## 11. Constraints honored from PROJECT_INSTRUCTIONS.md

- ✅ Modular monolith (no microservices)
- ✅ Single web app for Admin + Restaurant (role-based routing, not separate apps)
- ✅ No separate Restaurant mobile app
- ✅ No Rider app in MVP
- ✅ PostgreSQL target (SQLite for dev convenience; schema is portable)
- ✅ Prisma ORM
- ✅ JWT auth with refresh tokens
- ✅ Razorpay with server-side verification + idempotent webhooks
- ✅ Strict order state machine
- ✅ Backend is sole source of truth for pricing
- ✅ Snapshot item name + price on OrderItem
- ✅ All financial calculations server-side
- ✅ Image URLs only in DB
- ✅ Zod validation everywhere
- ✅ Structured logging
- ✅ RBAC enforced at backend regardless of frontend
