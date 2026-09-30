# Food Delivery Platform — API Specification

> Status: Phase 1 design document.
> Base URL: `/api/v1`
> Last updated: 2026-09-12

---

## 1. Conventions

### 1.1 Versioning

All endpoints are prefixed with `/api/v1`. Breaking changes introduce `/api/v2` while keeping `/api/v1` alive.

### 1.2 Request format

- `Content-Type: application/json` for all bodies.
- `Authorization: Bearer <access-token>` for protected routes.
- `Idempotency-Key: <uuid>` supported on `POST /orders` and `POST /payments/verify`.

### 1.3 Response format

**Success**:
```json
{ "success": true, "data": { ... } }
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "ORDER_NOT_FOUND",
    "message": "Order not found",
    "details": { "orderId": "abc123" }
  }
}
```

### 1.4 HTTP status codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 201 | Resource created |
| 204 | No content (e.g., logout) |
| 400 | Validation error / malformed request |
| 401 | Not authenticated |
| 403 | Authenticated but forbidden |
| 404 | Resource not found |
| 409 | Conflict (e.g., invalid state transition) |
| 422 | Semantic validation failure |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 502 | Upstream service error (Razorpay) |

### 1.5 Error codes (non-exhaustive)

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod schema failed |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `TOKEN_EXPIRED` | 401 | Access token expired — refresh |
| `FORBIDDEN` | 403 | Role or ownership check failed |
| `NOT_FOUND` | 404 | Generic resource not found |
| `RESOURCE_NOT_FOUND` | 404 | Specific (e.g., `RESTAURANT_NOT_FOUND`) |
| `CONFLICT` | 409 | Generic conflict |
| `INVALID_STATE_TRANSITION` | 409 | Order state machine violation |
| `PAYMENT_SIGNATURE_INVALID` | 400 | Razorpay signature mismatch |
| `PAYMENT_VERIFICATION_FAILED` | 422 | Razorpay API returned failure |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key, different request body |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unhandled server error |
| `UPSTREAM_ERROR` | 502 | Razorpay / external service down |

---

## 2. Authentication

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/api/v1/auth/register` | — | — | Register CUSTOMER or RESTAURANT (role in body) |
| POST | `/api/v1/auth/login` | — | — | Login, returns access + refresh tokens |
| POST | `/api/v1/auth/refresh` | refresh cookie | — | Rotate access token |
| POST | `/api/v1/auth/logout` | Bearer | any | Revoke refresh token |
| POST | `/api/v1/auth/forgot-password` | — | — | Send reset link (returns token in dev) |
| POST | `/api/v1/auth/reset-password` | — | — | Reset password with token |
| GET | `/api/v1/auth/me` | Bearer | any | Current user profile |

### 2.1 `POST /api/v1/auth/register`

**Body**:
```json
{
  "role": "CUSTOMER" | "RESTAURANT",
  "email": "user@example.com",
  "password": "secret123",
  "phone": "+919876543210",
  "fullName": "John Doe",                          // required for both roles
  // RESTAURANT-only fields (required when role=RESTAURANT):
  "restaurantName": "Pizza Palace",
  "cuisine": "Italian",
  "description": "Wood-fired pizzas",
  "addressLine1": "123 Main St",
  "city": "Pune",
  "state": "Maharashtra",
  "postalCode": "411001",
  "latitude": 18.52,
  "longitude": 73.85,
  "openingTime": "09:00",
  "closingTime": "23:00",
  "logoUrl": "https://..."                          // optional
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "CUSTOMER" },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### 2.2 `POST /api/v1/auth/login`

**Body**: `{ "email": "...", "password": "..." }`

**Response**:
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "role": "RESTAURANT", "email": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "redirectTo": "/restaurant/dashboard"
  }
}
```

`redirectTo` is a convenience hint for the frontend: `/admin/dashboard` for ADMIN, `/restaurant/dashboard` for RESTAURANT, `/` for CUSTOMER.

### 2.3 `POST /api/v1/auth/refresh`

**Body**: `{ "refreshToken": "..." }`

**Response**: `{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }`

### 2.4 `POST /api/v1/auth/forgot-password`

**Body**: `{ "email": "..." }`

**Response** (dev mode includes `resetToken` for convenience):
```json
{
  "success": true,
  "data": { "message": "Reset link sent", "resetToken": "..." }
}
```

### 2.5 `POST /api/v1/auth/reset-password`

**Body**: `{ "token": "...", "password": "newpassword" }`

---

## 3. Customers

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/v1/customers/profile` | Bearer | CUSTOMER | Get own profile |
| PATCH | `/api/v1/customers/profile` | Bearer | CUSTOMER | Update profile |
| GET | `/api/v1/customers/addresses` | Bearer | CUSTOMER | List addresses |
| POST | `/api/v1/customers/addresses` | Bearer | CUSTOMER | Add address |
| PATCH | `/api/v1/customers/addresses/:id` | Bearer | CUSTOMER | Update address |
| DELETE | `/api/v1/customers/addresses/:id` | Bearer | CUSTOMER | Delete address |

### 3.1 Address body

```json
{
  "label": "HOME" | "WORK" | "OTHER",
  "line1": "Flat 101, Building A",
  "line2": "Some Road",
  "city": "Pune",
  "state": "Maharashtra",
  "postalCode": "411001",
  "latitude": 18.52,
  "longitude": 73.85
}
```

---

## 4. Restaurants

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/v1/restaurants` | optional | public/CUSTOMER | List ACTIVE restaurants (paginated, filterable) |
| GET | `/api/v1/restaurants/nearby?lat=&lng=&radius=` | optional | public/CUSTOMER | Nearby ACTIVE restaurants (distance backend-computed) |
| GET | `/api/v1/restaurants/:id` | optional | public/CUSTOMER | Restaurant detail (404 if not ACTIVE) |
| POST | `/api/v1/restaurants` | — | — | (use `/auth/register` instead) |
| PATCH | `/api/v1/restaurants/:id` | Bearer | RESTAURANT (owner) | Update profile |
| GET | `/api/v1/restaurants/me` | Bearer | RESTAURANT | Own restaurant (status-aware) |

### 4.1 `GET /api/v1/restaurants` query params

| Param | Default | Description |
|---|---|---|
| `q` | — | Search by name (case-insensitive substring) |
| `cuisine` | — | Filter by cuisine slug |
| `veg` | — | `true` = only restaurants with ≥1 veg item |
| `open` | `true` | Filter restaurants currently open |
| `lat`, `lng` | — | If provided, sort by distance |
| `page` | 1 | Pagination |
| `pageSize` | 20 | Max 50 |

### 4.2 `GET /api/v1/restaurants/nearby` response

```json
{
  "success": true,
  "data": [
    {
      "id": "rest_1",
      "name": "Pizza Palace",
      "logoUrl": "https://...",
      "cuisine": "Italian",
      "avgRating": 4.5,
      "ratingCount": 120,
      "distanceKm": 2.3,
      "deliveryFee": 30,
      "prepTimeMinutes": 25,
      "availability": "OPEN"
    }
  ]
}
```

---

## 5. Menu

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/v1/restaurants/:id/menu` | optional | public | List categories + items |
| POST | `/api/v1/restaurants/:id/menu/categories` | Bearer | RESTAURANT (owner) | Add category |
| PATCH | `/api/v1/menu/categories/:id` | Bearer | RESTAURANT (owner) | Update category |
| DELETE | `/api/v1/menu/categories/:id` | Bearer | RESTAURANT (owner) | Delete category |
| POST | `/api/v1/restaurants/:id/menu/items` | Bearer | RESTAURANT (owner) | Add item |
| PATCH | `/api/v1/menu/items/:id` | Bearer | RESTAURANT (owner) | Update item |
| DELETE | `/api/v1/menu/items/:id` | Bearer | RESTAURANT (owner) | Delete item |
| PATCH | `/api/v1/menu/items/:id/availability` | Bearer | RESTAURANT (owner) | Toggle AVAILABLE/UNAVAILABLE |

### 5.1 Menu item body

```json
{
  "categoryId": "cat_xxx",
  "name": "Margherita Pizza",
  "description": "Classic mozzarella + basil",
  "price": 199.00,
  "imageUrl": "https://...",
  "isVeg": true,
  "availability": "AVAILABLE",
  "prepTimeMinutes": 15,
  "displayOrder": 1
}
```

### 5.2 Menu response shape (public)

```json
{
  "success": true,
  "data": {
    "restaurant": { "id": "...", "name": "...", "avgRating": 4.5, ... },
    "categories": [
      {
        "id": "cat_1",
        "name": "Pizzas",
        "items": [
          { "id": "item_1", "name": "Margherita", "price": 199, "isVeg": true, "availability": "AVAILABLE", "imageUrl": "..." }
        ]
      }
    ]
  }
}
```

---

## 6. Cart

> One cart per customer. Adding an item from a different restaurant returns 409 with code `CART_RESTAURANT_MISMATCH` — frontend must confirm clear-and-add via `?replace=true`.

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/v1/cart` | Bearer | CUSTOMER | Get cart (with items + restaurant) |
| POST | `/api/v1/cart/items` | Bearer | CUSTOMER | Add item (body: `{ menuItemId, quantity }`) |
| PATCH | `/api/v1/cart/items/:id` | Bearer | CUSTOMER | Update quantity |
| DELETE | `/api/v1/cart/items/:id` | Bearer | CUSTOMER | Remove item |
| DELETE | `/api/v1/cart` | Bearer | CUSTOMER | Clear cart |

### 6.1 `POST /api/v1/cart/items` body

```json
{
  "menuItemId": "item_xxx",
  "quantity": 2,
  "replaceRestaurant": false  // true = clear cart first if items from a different restaurant
}
```

### 6.2 Cart response

```json
{
  "success": true,
  "data": {
    "id": "cart_xxx",
    "restaurant": { "id": "...", "name": "Pizza Palace" },
    "items": [
      { "id": "ci_xxx", "menuItemId": "item_xxx", "name": "Margherita", "price": 199, "quantity": 2, "subtotal": 398, "isVeg": true, "imageUrl": "..." }
    ],
    "subtotal": 398,
    "estimatedDeliveryFee": 30,
    "estimatedTax": 19.9,
    "estimatedTotal": 447.9,
    "minOrderAmount": 99,
    "meetsMinimum": true
  }
}
```

> `price` shown here is for display convenience only. **Final pricing is always recomputed server-side at checkout.**

---

## 7. Orders

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/api/v1/orders` | Bearer | CUSTOMER | Create order (idempotent via `Idempotency-Key`) |
| GET | `/api/v1/orders` | Bearer | CUSTOMER | List own orders |
| GET | `/api/v1/orders/:id` | Bearer | CUSTOMER (owner) / RESTAURANT (owner) / ADMIN | Order detail |
| GET | `/api/v1/orders/:id/tracking` | Bearer | CUSTOMER (owner) / RESTAURANT (owner) / ADMIN | Status timeline |
| POST | `/api/v1/orders/:id/cancel` | Bearer | CUSTOMER (owner) | Cancel if pre-restaurant-acceptance |

### 7.1 `POST /api/v1/orders` body

```json
{
  "deliveryAddressId": "addr_xxx",
  "paymentMethod": "RAZORPAY",
  "notes": "Ring the bell twice",
  "useMockPayment": false  // dev convenience: skip Razorpay, mark paid directly
}
```

> The cart provides restaurantId + items. The body only provides delivery details.

### 7.2 Order response

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ord_xxx",
      "shortCode": "#ABC123",
      "status": "PENDING_PAYMENT",
      "paymentStatus": "PENDING",
      "subtotal": 398,
      "deliveryFee": 30,
      "tax": 19.9,
      "discount": 0,
      "totalAmount": 447.9,
      "items": [...],
      "deliveryAddress": {...},
      "restaurant": {...},
      "createdAt": "2026-09-12T10:30:00Z"
    },
    "payment": {
      "razorpayOrderId": "order_xxxxx",
      "amount": 44790,   // paise
      "currency": "INR",
      "key": "rzp_test_xxx"  // client-side checkout key
    }
  }
}
```

### 7.3 Tracking response

```json
{
  "success": true,
  "data": {
    "orderId": "ord_xxx",
    "currentStatus": "PREPARING",
    "timeline": [
      { "status": "PENDING_PAYMENT", "timestamp": "2026-09-12T10:30:00Z", "changedBy": "system" },
      { "status": "PAID", "timestamp": "2026-09-12T10:31:00Z", "changedBy": "system" },
      { "status": "RESTAURANT_ACCEPTED", "timestamp": "2026-09-12T10:33:00Z", "changedBy": "rest_user_1" },
      { "status": "PREPARING", "timestamp": "2026-09-12T10:35:00Z", "changedBy": "rest_user_1" }
    ],
    "rider": null  // or { "name": "...", "phone": "..." } when assigned
  }
}
```

---

## 8. Restaurant Order Actions

All require Bearer auth + role RESTAURANT or ADMIN. RESTAURANT must own the order's restaurant.

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/restaurant/orders/:id/accept` | PAID → RESTAURANT_ACCEPTED |
| POST | `/api/v1/restaurant/orders/:id/reject` | PAID → REJECTED_BY_RESTAURANT (triggers refund) |
| POST | `/api/v1/restaurant/orders/:id/prepare` | RESTAURANT_ACCEPTED → PREPARING |
| POST | `/api/v1/restaurant/orders/:id/ready` | PREPARING → READY_FOR_PICKUP |
| POST | `/api/v1/restaurant/orders/:id/picked-up` | READY_FOR_PICKUP → PICKED_UP (Admin or RESTAURANT) |
| GET | `/api/v1/restaurant/orders` | List own restaurant's orders (filterable by status) |
| GET | `/api/v1/restaurant/orders/:id` | Order detail (same shape as `/orders/:id`) |

---

## 9. Payments

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/api/v1/payments/verify` | Bearer | CUSTOMER | Verify payment signature + capture |
| POST | `/api/v1/payments/webhook` | — (sig verified) | — | Razorpay webhook receiver (idempotent) |

### 9.1 `POST /api/v1/payments/verify` body

```json
{
  "razorpayOrderId": "order_xxxxx",
  "razorpayPaymentId": "pay_xxxxx",
  "razorpaySignature": "abc123..."
}
```

### 9.2 Webhook payload

Razorpay sends a JSON envelope. We read the raw body and verify the signature in the `X-Razorpay-Signature` header.

---

## 10. Reviews

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/api/v1/reviews` | Bearer | CUSTOMER | Create review (one per delivered order) |
| GET | `/api/v1/reviews?restaurantId=` | optional | public | List reviews for a restaurant |
| GET | `/api/v1/reviews/:id` | optional | public | Single review |
| PATCH | `/api/v1/admin/reviews/:id` | Bearer | ADMIN | Hide/unhide (moderation) |
| DELETE | `/api/v1/admin/reviews/:id` | Bearer | ADMIN | Hard-delete (severe cases only) |

### 10.1 Review body

```json
{
  "orderId": "ord_xxx",
  "rating": 5,
  "comment": "Loved the pizza, hot and fresh!"
}
```

Backend enforces: `Order.status === DELIVERED`, `Order.customerId === ctx.userId`, no existing review for that orderId, rating in 1..5.

---

## 11. Notifications

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/api/v1/notifications` | Bearer | any | List own notifications (paginated) |
| GET | `/api/v1/notifications/unread-count` | Bearer | any | Unread count for badge |
| POST | `/api/v1/notifications/:id/read` | Bearer | any | Mark one as read |
| POST | `/api/v1/notifications/read-all` | Bearer | any | Mark all as read |

---

## 12. Admin

All require Bearer auth + role ADMIN.

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/admin/dashboard` | KPIs (totals, revenue, etc.) |
| GET | `/api/v1/admin/restaurants` | List all restaurants (incl. pending/suspended) |
| GET | `/api/v1/admin/restaurants/:id` | Restaurant detail (any status) |
| POST | `/api/v1/admin/restaurants/:id/approve` | PENDING_APPROVAL → ACTIVE |
| POST | `/api/v1/admin/restaurants/:id/reject` | PENDING_APPROVAL → REJECTED (body: `reason`) |
| POST | `/api/v1/admin/restaurants/:id/suspend` | ACTIVE → SUSPENDED |
| POST | `/api/v1/admin/restaurants/:id/activate` | INACTIVE/SUSPENDED → ACTIVE |
| GET | `/api/v1/admin/customers` | List customers |
| POST | `/api/v1/admin/customers/:id/block` | Block customer (isActive=false) |
| POST | `/api/v1/admin/customers/:id/unblock` | Unblock customer |
| GET | `/api/v1/admin/orders` | List all orders (filterable) |
| GET | `/api/v1/admin/payments` | List payments (filterable) |
| POST | `/api/v1/admin/payments/:id/refund` | Trigger refund |
| GET | `/api/v1/admin/reviews` | List all reviews (incl. hidden) |
| PATCH | `/api/v1/admin/reviews/:id` | Moderate (hide/unhide) |
| GET | `/api/v1/admin/categories` | List cuisine categories |
| POST | `/api/v1/admin/categories` | Create category |
| PATCH | `/api/v1/admin/categories/:id` | Update category |
| DELETE | `/api/v1/admin/categories/:id` | Delete category |
| POST | `/api/v1/admin/orders/:id/assign-rider` | Manually assign rider (body: `{ riderName, riderPhone }`) |
| POST | `/api/v1/admin/orders/:id/picked-up` | Advance to PICKED_UP |
| POST | `/api/v1/admin/orders/:id/out-for-delivery` | Advance to OUT_FOR_DELIVERY |
| POST | `/api/v1/admin/orders/:id/delivered` | Advance to DELIVERED |

---

## 13. Permission Matrix

| Feature | ADMIN | RESTAURANT | CUSTOMER |
|---|---|---|---|
| Manage platform | ✓ | ✗ | ✗ |
| Manage customers | ✓ | ✗ | own only |
| Manage restaurants | ✓ | own only | ✗ |
| Approve / reject restaurants | ✓ | ✗ | ✗ |
| Manage menu | ✓ | own only | ✗ |
| View all orders | ✓ | own restaurant only | own only |
| Process restaurant order (accept/reject/prepare/ready) | ✓ | own only | ✗ |
| Make payment | ✗ | ✗ | ✓ |
| Post review | ✗ | ✗ | own delivered order only |
| Moderate review | ✓ | ✗ | ✗ |
| Trigger refund | ✓ | ✗ | ✗ |
| Assign rider | ✓ | ✗ | ✗ |
| Mark picked-up / out-for-delivery / delivered | ✓ | ✗ | ✗ |
| Manage platform settings | ✓ | ✗ | ✗ |
| Manage notifications | own | own | own |

---

## 14. Notification Events

Backend emits notifications on these events:

| Trigger | Recipient | Type |
|---|---|---|
| Order created | CUSTOMER | `ORDER_PLACED` |
| Payment captured | CUSTOMER | `PAYMENT_SUCCESSFUL` |
| Payment captured | RESTAURANT | `NEW_ORDER` |
| Payment failed | CUSTOMER | `PAYMENT_ISSUE` |
| Restaurant accepts | CUSTOMER | `RESTAURANT_ACCEPTED` |
| Restaurant rejects | CUSTOMER | `RESTAURANT_REJECTED` |
| Restaurant starts preparing | CUSTOMER | `PREPARING` |
| Restaurant marks ready | CUSTOMER | `READY` |
| Rider assigned | CUSTOMER | `RIDER_ASSIGNED` |
| Rider picked up | CUSTOMER | `PICKED_UP` |
| Out for delivery | CUSTOMER | `OUT_FOR_DELIVERY` |
| Delivered | CUSTOMER | `DELIVERED` |
| Customer cancels | RESTAURANT | `CUSTOMER_CANCELLATION` |
| Customer cancels paid order | ADMIN | `REFUND_EVENT` |
| Restaurant registers | ADMIN | `NEW_RESTAURANT_REGISTRATION` |

---

## 15. OpenAPI / Swagger

Not generated in this prototype. To enable:

```bash
bun add swagger-ui-react
```

And expose `/api/v1/docs` returning the OpenAPI spec.

For this prototype, this `api.md` document is the source of truth.

---

## 16. Rate Limiting

Default (in-memory token bucket):

| Endpoint group | Limit |
|---|---|
| `/api/v1/auth/*` | 10 req / min / IP |
| `/api/v1/payments/webhook` | 100 req / min / IP (Razorpay retries) |
| All other authenticated | 120 req / min / user |

Returns 429 with `Retry-After` header.

---

## 17. CORS

| Origin | Allowed |
|---|---|
| Web app origin (same-origin in this prototype) | ✓ |
| Customer mobile app origin (configurable via env) | ✓ |
| All others | ✗ |

Headers: `Authorization`, `Content-Type`, `Idempotency-Key` allowed.
