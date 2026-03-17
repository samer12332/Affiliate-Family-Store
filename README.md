# Affiliate Family Store

Affiliate Family Store is a role-based affiliate commerce platform built with Next.js, React, TypeScript, Tailwind CSS, and MongoDB.

## Roles

- `owner`
- `admin`
- `super_admin`
- `main_merchant`
- `submerchant` (legacy `merchant` is normalized as submerchant)
- `marketer`

## Core Behavior

- Main merchants can manage their own submerchants and marketers.
- Submerchants manage products, shipping systems, stock, and order fulfillment.
- Marketers browse authorized submerchant products, manage cart/checkout, and create orders.
- Owner/admin have platform-wide visibility.
- Commission flow supports:
  - owner commission
  - main merchant commission (when applicable)
  - marketer dues
- Commission transfers and complaints are supported with notifications.

## Notifications

- In-app notifications page: `/admin/notifications`
- Unread count is shown in dashboard/header bell badges.
- Live toast notifications are enabled for authenticated users.
- Clicking notification actions navigates to target pages and supports mark-as-read.

## Security and Validation Highlights

- Server-side role authorization on protected APIs.
- Server-side validation for critical payloads (orders, products, shipping, users, stock, complaints, notifications).
- Passwords are stored hashed (model-level and API-level safeguards).
- Login/contact endpoints include basic rate-limiting.
- CSRF protection for state-changing API requests via same-origin checks.
- Checkout/order totals are recalculated from DB values on the server.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose

## Setup

From project root:

```bash
npm install
```

Create `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/familystore
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Run

```bash
npm run dev
```

App URL:

```text
http://localhost:3000
```

## Main Routes

- `/admin/login`
- `/admin/dashboard`
- `/admin/users`
- `/admin/products`
- `/admin/stocks`
- `/admin/shipping-systems`
- `/admin/orders`
- `/admin/commissions`
- `/admin/commission-complaints`
- `/admin/notifications`
- `/merchant-directory`
- `/merchant/:merchantId`
- `/cart`
- `/checkout`

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

Notes:
- `npm run lint` runs `tsc --noEmit`.
- `npm run build` performs production build.

## Owner Account

Protected seeded owner:

- `sameryousry99@gmail.com`

This account cannot be deleted/deactivated by non-owner users.

## QA Artifact

Latest saved QA report:

- `QA_TEST_REPORT_2026-03-18.md`
