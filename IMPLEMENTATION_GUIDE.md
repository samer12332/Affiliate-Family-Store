# FamilyStore - Implementation Guide

## Project Status

✅ **Phase 1 Complete**: Backend Setup - MongoDB, Mongoose Schemas, Seed Data
✅ **Phase 2 Complete**: Express API Routes - Auth, Products, Orders, Shipping, Uploads
⏳ **Phase 3 In Progress**: Frontend Components - Public Pages (Home, Shop, Products, Categories)

## What's Been Built

### Backend (server/)
- **Models**: Product, Category, Order, AdminUser, Message (5 models with proper indexes)
- **Routes**: 
  - `/api/auth/login` - Admin authentication
  - `/api/products` - CRUD + filtering/pagination/search
  - `/api/categories` - CRUD + pagination/search
  - `/api/orders` - Order creation with shipping validation, admin viewing
  - `/api/messages` - Contact and product inquiry (single Message model)
  - `/api/admin/users` - Admin user management
- **Utils**: JWT generation, Order number generation (FAM-YYYYMMDD-001)
- **Middleware**: Token verification for protected routes
- **Constants**: Shared governorates, statuses, categories across frontend/backend

### Frontend (app/)
- **Layout**: Updated with Header, Footer components
- **Hooks**: `useCart`, `useApi`, `useAdminAuth` for client state management
- **Components**: Header (with mobile nav), Footer, ProductCard
- **Pages**: Home page with featured products section
- **Theme**: Updated color palette (soft, warm tones)

### Shared Files
- `lib/constants.ts` - Frontend constants
- `server/config/constants.js` - Backend constants
- `.env.example` - Configuration template

## Remaining Phases

### Phase 3: Frontend Public Pages (40% Done)
**Remaining:**
1. `/shop/page.tsx` - Product listing with advanced filters
2. `/categories/[slug]/page.tsx` - Category page with products
3. `/products/[slug]/page.tsx` - Product detail page with color/size selection
4. `/search/page.tsx` - Search results page
5. ProductFilters component - Filter UI for shop/category pages
6. ProductGallery component - Image carousel for product detail

### Phase 4: Cart & Checkout System (0% Done)
1. `/cart/page.tsx` - Cart review page with line items
2. `/checkout/page.tsx` - Checkout form with customer info, address, governorate selection
3. `/order-confirmation/[id]/page.tsx` - Order confirmation with order number (FAM-YYYYMMDD-001)
4. Cart management components - Add/remove/update quantity
5. ShippingPreview component - Estimate shipping fees before checkout
6. CheckoutForm component - Form with react-hook-form + Zod validation
7. API integration for order creation with backend validation

### Phase 5: Admin Auth & Dashboard (0% Done)
1. `/admin/login/page.tsx` - Admin login form
2. `/admin/dashboard/page.tsx` - Dashboard with KPIs
3. AdminLayout component - Protected layout for admin pages
4. ProtectedRoute component - Route protection middleware
5. AdminAuth context/provider - Token management
6. Key metrics: Total Orders, Revenue, Featured Products

### Phase 6: Admin Product Management (0% Done)
1. `/admin/products/page.tsx` - Product list with pagination/search/filtering
2. `/admin/products/new/page.tsx` - Create product form
3. `/admin/products/[id]/edit/page.tsx` - Edit product form
4. ProductForm component - Reusable form for create/edit
5. Image upload handling
6. Color/Size/ShippingOption management in forms
7. ReturnPolicyForm component

### Phase 7: Admin Orders & Categories (0% Done)
1. `/admin/orders/page.tsx` - Orders list with status filtering, pagination
2. `/admin/orders/[id]/page.tsx` - Order detail showing item snapshots, orderNumber
3. OrdersTable component - Table with sorting, filtering
4. `/admin/categories/page.tsx` - Categories CRUD list
5. CategoryForm component - Create/edit categories
6. Order status updates
7. Supplier notes and internal notes

### Phase 8: Admin Messages & Users (0% Done)
1. `/admin/messages/page.tsx` - Messages list with type filtering (contact/productInquiry)
2. Message detail view for reading inquiries
3. `/admin/users/page.tsx` - Admin user management
4. UserForm component - Create/edit admin users
5. Pagination and search for both pages

### Phase 9: Public Info Pages & Error Handling (0% Done)
1. `/about/page.tsx` - About page with company info
2. `/contact/page.tsx` - Contact form (creates Message with type: "contact")
3. `/faq/page.tsx` - FAQ page with common questions
4. `/not-found.tsx` - 404 page
5. Error boundary components
6. Error handling pages

### Phase 10: SEO, Polish & Testing (0% Done)
1. SEO metadata for all pages using Next.js metadata API
2. Dynamic metadata for product/category pages
3. Responsive design verification across breakpoints
4. Performance optimization
5. End-to-end checkout flow testing
6. Order number generation testing

## Key Implementation Notes

### Shipping Flow
1. **Frontend**: Estimate shipping with predefined governorates
2. **Backend**: Validate governorate, find shipping option for each product, calculate final fees
3. **Order Creation**: Backend creates order with validated shipping, stores in item snapshots

### Order Item Snapshots
Each order item MUST store:
- productId, productName, productSlug
- selectedColor, selectedSize
- quantity, unitPrice, productImage
- shippingFee, supplierReference, returnEligibility

### Message Model (Single)
- type: "contact" | "productInquiry"
- If type="productInquiry", include productId
- isRead flag for admin dashboard

### Human-Friendly Order Numbers
- Format: `FAM-YYYYMMDD-001`
- Example: `FAM-20260309-001`
- Generated by backend during order creation

### Admin Tables Features
- Pagination (default 10 items per page)
- Search by relevant fields
- Filtering by status/type/governorate
- Sorting by date/status

## Database Indexes

### Product Indexes
- slug, category, gender, featured, availabilityStatus, createdAt

### Order Indexes
- status, governorate, createdAt

### Message Indexes
- type, email, createdAt

## Environment Variables

```env
# Backend
MONGODB_URI=mongodb://localhost:27017/familystore
PORT=5000
JWT_SECRET=your-secret-key-change-in-production

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## API Endpoints Summary

### Auth
- `POST /api/auth/login` - Admin login

### Products (Public)
- `GET /api/products` - List with filtering, pagination
- `GET /api/products/:slug` - Get by slug

### Products (Admin)
- `POST /api/products` - Create
- `PUT /api/products/:id` - Update
- `DELETE /api/products/:id` - Delete

### Categories (Public)
- `GET /api/categories` - List with pagination
- `GET /api/categories/:slug` - Get by slug

### Categories (Admin)
- `POST /api/categories` - Create
- `PUT /api/categories/:id` - Update
- `DELETE /api/categories/:id` - Delete

### Orders (Public)
- `POST /api/orders` - Create order

### Orders (Admin)
- `GET /api/admin/orders` - List with filtering/pagination
- `GET /api/admin/orders/:id` - Get order detail
- `PUT /api/admin/orders/:id` - Update order status/notes

### Messages (Public)
- `POST /api/messages` - Create message

### Messages (Admin)
- `GET /api/messages` - List with filtering/pagination
- `GET /api/messages/:id` - Get message (marks as read)
- `DELETE /api/messages/:id` - Delete message

### Admin Users (Admin)
- `GET /api/admin/users` - List with pagination
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user

## Component Architecture

### Reusable Components
- ProductCard - Product preview card
- ProductGallery - Image carousel
- ProductFilters - Filter sidebar
- ShippingPreview - Shipping cost estimator
- CheckoutForm - Checkout form with validation
- OrdersTable - Admin orders table
- MessagesTable - Admin messages table
- AdminLayout - Protected admin layout

### Forms
- ProductForm - Create/edit products
- CategoryForm - Create/edit categories
- CheckoutForm - Customer checkout
- UserForm - Admin user management
- ContactForm - Contact/inquiry form

## Testing Checklist

- [ ] Backend API endpoints working
- [ ] Order creation with shipping validation
- [ ] Order item snapshots storing correctly
- [ ] Human-friendly order numbers generating
- [ ] Admin authentication working
- [ ] Protected admin routes
- [ ] Product filtering and pagination
- [ ] Message creation (contact and product inquiry)
- [ ] Admin tables pagination/search/filtering
- [ ] Cart persistence across browser sessions
- [ ] Responsive design on mobile/tablet/desktop
- [ ] SEO metadata on all pages
- [ ] Error handling and edge cases

## Getting Started

1. Install dependencies: `npm install` or `pnpm install`
2. Set up MongoDB locally or use MongoDB Atlas
3. Create `.env.local` file with environment variables
4. Start backend: Create start script in server/
5. Start frontend: `npm run dev`
6. Seed database: Run `node server/scripts/seed.js`
7. Access frontend at http://localhost:3000
8. Access admin at http://localhost:3000/admin/login
9. Login with admin@familystore.local / AdminPass123!

## Notes

- All routes use plural naming (e.g., /products/[slug], /categories/[slug])
- Single Message model for both contact and product inquiries
- Availabilitystat uses: "Available", "Limited Availability", "Temporarily Unavailable"
- Backend is source of truth for shipping fees and order validation
- Token stored in localStorage for admin sessions
- Cart stored in localStorage for public users
