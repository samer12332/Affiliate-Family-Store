// Import CommonJS models and re-export for use in API routes
import mongoose from 'mongoose';

// Product Schema and Model
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: String, required: true, enum: ['Clothes', 'Shoes', 'Others'] },
    gender: { type: String, required: true, enum: ['Men', 'Women', 'Children', 'Unisex'] },
    brand: String,
    description: String,
    price: { type: Number, required: true },
    discountPrice: Number,
    images: [String],
    colors: [String],
    sizes: [String],
    sizeWeightChart: [
      {
        size: String,
        minWeightKg: Number,
        maxWeightKg: Number,
      },
    ],
    sizeGuide: {
      measurements: String,
      chart: String,
    },
    shippingOptions: [
      {
        governorate: String,
        fee: Number,
        estimatedDays: Number,
      },
    ],
    returnPolicy: {
      eligible: Boolean,
      days: Number,
      description: String,
    },
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Limited Availability', 'Temporarily Unavailable'],
      default: 'Available',
    },
    sku: String,
    featured: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    onSale: { type: Boolean, default: false },
    tags: [String],
    supplierInfo: {
      name: String,
      reference: String,
    },
    shippingSystemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShippingSystem',
      default: null,
    },
    internalNotes: String,
    seoMetadata: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  { timestamps: true }
);

productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ gender: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ availabilityStatus: 1 });
productSchema.index({ createdAt: -1 });

// Category Schema and Model
const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: String,
    image: String,
    seoMetadata: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  { timestamps: true }
);

// Order Schema and Model
const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: {
      name: String,
      email: String,
      phone: String,
    },
    shippingAddress: {
      fullName: String,
      street: String,
      detailedAddress: String,
      city: String,
      governorate: String,
      postalCode: String,
      phone: String,
    },
    items: [
      {
        productId: mongoose.Schema.Types.ObjectId,
        productName: String,
        productSlug: String,
        selectedColor: String,
        selectedSize: String,
        quantity: Number,
        unitPrice: Number,
        productImage: String,
        shippingFee: Number,
        shippingSystemId: mongoose.Schema.Types.ObjectId,
        refusalPolicy: {
          type: String,
          enum: [
            'ALLOW_REFUSE_ON_FREE_DELIVERY',
            'CHARGE_DELIVERY_IF_REFUSED',
            'NO_REFUSAL_ALLOWED',
          ],
        },
        shippingNotes: String,
        supplierReference: String,
        returnEligibility: Boolean,
      },
    ],
    subtotal: Number,
    shippingFee: Number,
    total: Number,
    status: {
      type: String,
      enum: [
        'Pending Review',
        'Confirmed with Customer',
        'Sent to Supplier',
        'Supplier Confirmed',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
      ],
      default: 'Pending Review',
    },
    supplier: {
      name: String,
      reference: String,
    },
    internalNotes: String,
  },
  { timestamps: true }
);

orderSchema.index({ status: 1 });
orderSchema.index({ governorate: 1 });
orderSchema.index({ createdAt: -1 });

// AdminUser Schema and Model
const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'admin', enum: ['admin', 'moderator'] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Shipping System Schema and Model
const shippingSystemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    governorateFees: [
      {
        governorate: { type: String, required: true },
        fee: { type: Number, required: true, min: 0 },
      },
    ],
    refusalPolicy: {
      type: String,
      required: true,
      enum: [
        'ALLOW_REFUSE_ON_FREE_DELIVERY',
        'CHARGE_DELIVERY_IF_REFUSED',
        'NO_REFUSAL_ALLOWED',
      ],
      default: 'CHARGE_DELIVERY_IF_REFUSED',
    },
    notes: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Message Schema and Model
const messageSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, enum: ['contact', 'productInquiry'] },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: { type: String, required: true },
    productId: mongoose.Schema.Types.ObjectId,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Get or create models
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export const AdminUser = mongoose.models.AdminUser || mongoose.model('AdminUser', adminUserSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export const ShippingSystem =
  mongoose.models.ShippingSystem || mongoose.model('ShippingSystem', shippingSystemSchema);
