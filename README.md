# Affiliate Family Store

Affiliate Family Store is a role-based order management system built with Next.js, React, TypeScript, Tailwind CSS, and MongoDB.

The project is centered around four roles:

- `owner`
- `super_admin`
- `merchant`
- `marketer`

Merchants own products and configure shipping. Marketers browse merchant pages, create orders using merchant products, and enter their own selling prices. Merchants control order status. The owner and super admins can oversee the platform.

## Main Features

- Protected login-first experience
- Role-based dashboards and permissions
- Merchant-owned products
- Merchant shipping by governorate
- Marketer order creation flow
- Merchant-only order status updates
- Owner commission tracking
- Protected owner account that cannot be deleted

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- MongoDB with Mongoose

## Project Setup

From the project root:

```bash
npm install
```

Create a local environment file:

```env
MONGODB_URI=mongodb://localhost:27017/familystore
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Start The Project

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The app now requires login before entering the website.

## Login Route

Shared login page for all roles:

```text
/admin/login
```

After login:

- `owner` -> `/admin/dashboard`
- `super_admin` -> `/admin/dashboard`
- `merchant` -> `/admin/dashboard`
- `marketer` -> `/merchant-directory`

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npx tsc --noEmit
```

## Main App Routes

- `/admin/login`
- `/admin/dashboard`
- `/admin/products`
- `/admin/products/new`
- `/admin/shipping-systems`
- `/admin/shipping-systems/new`
- `/admin/orders`
- `/admin/users`
- `/merchant-directory`
- `/merchant/:merchantId`

## Protected Owner Account

The system owner is seeded as:

- `sameryousry99@gmail.com`

This account is protected:

- cannot be deleted
- cannot delete itself
- cannot be deactivated

## Notes

- MongoDB must be running locally for the app APIs to work correctly.
- Product images are uploaded from the device and stored as data URLs through the current form flow.
- Merchant shipping is configured per governorate.
