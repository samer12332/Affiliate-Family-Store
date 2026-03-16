# Family Store Ecommerce

Family Store Ecommerce is a Next.js storefront project with public shopping pages, checkout flows, admin pages, and supporting API routes for products, categories, orders, messages, and admin users.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Express
- MongoDB with Mongoose

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Entry Routes

### User Routes

- `/` main storefront homepage
- `/shop` product listing page
- `/cart` cart page
- `/checkout` checkout page

### Admin Routes

- `/admin/login` admin sign-in page
- `/admin/dashboard` admin dashboard landing page after login
- `/admin/products` product management
- `/admin/orders` order management
- `/admin/categories` category management
- `/admin/messages` customer messages
- `/admin/users` admin user management

## Environment Variables

Create a local environment file and add the values your setup needs:

```env
MONGODB_URI=mongodb://localhost:27017/familystore
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Available Scripts

- `npm run dev` starts the Next.js development server
- `npm run build` creates a production build
- `npm run start` starts the production server
- `npm run lint` runs linting

## Project Structure

- `app/` Next.js app router pages and API routes
- `components/` shared UI and feature components
- `hooks/` client-side hooks
- `lib/` shared utilities, constants, and data helpers
- `server/` backend models, routes, middleware, and scripts
- `public/` static assets

## Notes

- The frontend runs on `http://localhost:3000`
- Some API features expect MongoDB and backend environment variables to be configured
- Seed and backend-related implementation details are documented in `IMPLEMENTATION_GUIDE.md`
