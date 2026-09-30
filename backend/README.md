# Food Delivery Backend (Express + TypeScript)

Standalone Node.js backend for the Food Delivery platform. Runs on **port 4000**.

## Stack

- **Runtime**: Bun (TypeScript native — no transpilation needed)
- **Framework**: Express 4
- **Database**: Prisma ORM (SQLite for dev, PostgreSQL for prod)
- **Auth**: JWT (jose) + scrypt password hashing
- **Validation**: Zod on every request
- **Payments**: Razorpay Node SDK (test mode with mock fallback)
- **Security**: Helmet, CORS, structured JSON logging

## Quick start

```bash
cd backend

# 1. Install deps
bun install

# 2. Set up database (SQLite for dev)
bun run db:push          # creates prisma/dev.db
bun run scripts/seed.ts  # seeds: 1 admin, 6 restaurants, 10 customers, 30 orders

# 3. Start dev server (hot reload)
bun run dev
# → http://localhost:4000
```

## Environment variables

Copy `.env.example` to `.env` and fill in real values:

```bash
PORT=4000
DATABASE_URL="file:/absolute/path/to/dev.db"   # or postgresql://... for prod
JWT_SECRET="change-me"
JWT_REFRESH_SECRET="change-me-too"
RAZORPAY_KEY_ID="rzp_test_xxx"
RAZORPAY_KEY_SECRET="xxx"
RAZORPAY_WEBHOOK_SECRET="xxx"
CORS_ORIGINS=http://localhost:3000,https://preview-*.space-z.ai
```

## Architecture

```
backend/
├── src/
│   ├── server.ts              # Boots Express on PORT
│   ├── app.ts                 # Express app (CORS, helmet, routes, error handler)
│   ├── config/
│   ├── middleware/
│   │   ├── auth.ts            # requireAuth(), requireRoles(), optionalAuth()
│   │   └── error-handler.ts   # central error handler
│   ├── modules/               # one folder per domain module
│   │   ├── auth/auth.routes.ts
│   │   ├── restaurants/restaurants.routes.ts
│   │   ├── menu/menu.routes.ts
│   │   ├── cart/cart.routes.ts
│   │   ├── orders/
│   │   │   ├── orders.routes.ts           # customer order endpoints
│   │   │   └── restaurant-orders.routes.ts # restaurant-side order actions
│   │   ├── payments/payments.routes.ts
│   │   ├── reviews/reviews.routes.ts
│   │   ├── notifications/notifications.routes.ts
│   │   ├── customers/customers.routes.ts
│   │   └── admin/admin.routes.ts
│   ├── lib/                   # framework-agnostic business logic
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── errors.ts          # AppError class + error codes
│   │   ├── logger.ts          # structured JSON logger
│   │   ├── api-response.ts    # ok(), fail(), asyncHandler()
│   │   ├── auth/              # JWT, password hashing, session
│   │   ├── validators/        # Zod schemas
│   │   ├── services/          # business logic (use-cases)
│   │   └── integrations/      # Razorpay, storage, notifications
│   └── types/express.d.ts     # augments Express Request with auth context
├── prisma/
│   ├── schema.prisma          # 21 Prisma models
│   └── dev.db                 # SQLite database (dev only)
├── scripts/
│   └── seed.ts                # database seeding
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

## API endpoints

All endpoints are under `/api/v1/*`. See `/docs/api.md` in the project root for the full spec.

Key routes:

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | — | Register CUSTOMER or RESTAURANT |
| POST | `/api/v1/auth/login` | — | Login, returns access + refresh tokens |
| GET | `/api/v1/restaurants` | — | List ACTIVE restaurants (with lat/lng proximity) |
| GET | `/api/v1/restaurants/:id/menu` | — | Public menu |
| GET | `/api/v1/cart` | CUSTOMER | Get cart |
| POST | `/api/v1/orders` | CUSTOMER | Create order (idempotent) |
| POST | `/api/v1/payments/verify` | CUSTOMER | Verify Razorpay payment |
| POST | `/api/v1/payments/webhook` | — | Razorpay webhook (signature verified) |
| POST | `/api/v1/restaurant/orders/:id/accept` | RESTAURANT | Accept order |
| GET | `/api/v1/admin/dashboard` | ADMIN | Platform KPIs |

## Health check

```bash
curl http://localhost:4000/health
# {"status":"ok","service":"foodmitra-backend"}
```

## Switching to PostgreSQL

1. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`.
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `bun run db:migrate dev --name init` to generate the first migration.
4. Run `bun run scripts/seed.ts` to populate.

## Running from the project root

The root `package.json` has convenience scripts:

```bash
bun run backend:dev       # starts the backend in dev mode
bun run backend:seed      # seeds the backend database
bun run backend:db:push   # pushes the Prisma schema
```

## How the frontend connects

The Next.js frontend (on port 3000) proxies all `/api/v1/*` requests to this backend via `next.config.ts` rewrites. The browser sees same-origin requests — no CORS issues in development.

In production, point the frontend's `BACKEND_URL` env var to the deployed backend URL.
