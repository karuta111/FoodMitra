# FoodMitra

A production-grade food delivery platform (Zomato/Swiggy-class) built as a modular monolith with separate web, backend, and mobile projects.

## Project Structure

```
foodmitra/
├── web/              ← Next.js 16 web app (Admin + Customer)
├── backend/          ← Express + TypeScript API server
├── mobile/           ← Expo React Native app (Customer)
├── docs/             ← Architecture docs (5 files)
├── mini-services/    ← Backend auto-start wrapper for dev.sh
└── package.json      ← Root (delegates dev to /web)
```

## Quick Start

### 1. Backend (port 4000)
```bash
cd backend
bun install
bun run db:push        # creates SQLite dev database
bun run scripts/seed.ts # seeds demo data
bun run dev             # starts Express on port 4000
```

### 2. Web App (port 3000)
```bash
cd web
bun install
bun run dev             # starts Next.js on port 3000
```
Or from root: `bun run dev` (delegates to /web)

### 3. Mobile App (Expo)
```bash
cd mobile
npm install --legacy-peer-deps
# Edit .env — set EXPO_PUBLIC_API_URL to your server URL
npx expo start
# Scan QR code with Expo Go app
```

## Demo Credentials

| Role | Phone (10 digits) | Password |
|---|---|---|
| Admin | `9999999999` | `admin123` |
| Customer (×10) | `9800001000` through `9800001009` | `customer123` |

Login is phone-based (with fixed +91 prefix). Admin and customer use the **same login form** — routing is based on the user's role in the database.

## Tech Stack

| Layer | Technology |
|---|---|
| **Web** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui |
| **Backend** | Express 4, TypeScript, Prisma ORM, Zod, JWT (jose), Cloudinary SDK |
| **Mobile** | Expo SDK 52, React Native 0.76, React Navigation 6, Zustand |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **Auth** | Phone + password + OTP verification (MSG91 or demo mode) |
| **Payments** | Razorpay (test mode with mock fallback) |
| **Images** | Cloudinary (server-side upload, API key/secret stay on backend) |

## Key Features

- **Phone-based auth**: Login with 10-digit mobile + password (no email needed)
- **OTP verification**: Signup and forgot-password use 6-digit OTP (MSG91 or demo mode)
- **Admin manages everything**: Restaurants, menus, orders, customers, payments, reviews
- **No restaurant login**: Admin creates restaurants + manages menus directly
- **Customer flow**: Browse → menu → cart → checkout → mock payment → order tracking
- **Light theme only**: No dark mode
- **Cloudinary**: Image uploads for menu items (server-side, secure)
- **Order state machine**: PENDING_PAYMENT → PAID → ACCEPTED → PREPARING → READY → PICKED_UP → OUT_FOR_DELIVERY → DELIVERED

## Architecture Docs

- [`docs/architecture.md`](docs/architecture.md) — System architecture, module map
- [`docs/database.md`](docs/database.md) — ERD, schema, indexes
- [`docs/api.md`](docs/api.md) — REST API spec, permission matrix
- [`docs/order-state-machine.md`](docs/order-state-machine.md) — State transitions
- [`docs/payment-flow.md`](docs/payment-flow.md) — Razorpay flow, idempotency

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="..."
RAZORPAY_KEY_ID="..."
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
OTP_USE_MSG91=false
MSG91_AUTH_KEY="..."
MSG91_TEMPLATE_ID="..."
```

### Web (`web/.env`)
```
NEXT_PUBLIC_ADMIN_PHONE=9999999999
NEXT_PUBLIC_ADMIN_PASSWORD=admin123
```

### Mobile (`mobile/.env`)
```
EXPO_PUBLIC_API_URL=http://YOUR_SERVER_IP:3000
```
