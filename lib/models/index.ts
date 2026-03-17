import mongoose from 'mongoose';

const USER_ROLES = ['owner', 'super_admin', 'merchant', 'marketer'] as const;
const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
const COMMISSION_STATUSES = ['pending', 'confirmed', 'delivered', 'paid'] as const;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    isProtected: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    merchantProfile: {
      storeName: String,
      slug: { type: String, lowercase: true, trim: true },
      phone: String,
      notes: String,
    },
    marketerProfile: {
      phone: String,
      notes: String,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1, active: 1 });
userSchema.index({ 'merchantProfile.slug': 1 });

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

const shippingSystemSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    governorateFees: [
      {
        governorate: { type: String, required: true, trim: true },
        fee: { type: Number, required: true, min: 0 },
        estimatedDays: { type: Number, min: 0, default: 0 },
      },
    ],
    notes: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

shippingSystemSchema.index({ merchantId: 1, active: 1 });

const productSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: { type: String, required: true, enum: ['Clothes', 'Shoes', 'Others'] },
    gender: { type: String, required: true, enum: ['Men', 'Women', 'Children', 'Unisex'] },
    brand: String,
    description: { type: String, default: '' },
    merchantPrice: { type: Number, required: true, min: 0 },
    suggestedCommission: { type: Number, min: 0, default: null },
    price: { type: Number, required: true, min: 0 },
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
    availabilityStatus: {
      type: String,
      enum: ['Available', 'Limited Availability', 'Temporarily Unavailable'],
      default: 'Available',
    },
    sku: String,
    featured: { type: Boolean, default: false },
    onSale: { type: Boolean, default: false },
    shippingSystemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShippingSystem',
      default: null,
    },
    internalNotes: String,
  },
  { timestamps: true }
);

productSchema.index({ merchantId: 1, createdAt: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productSlug: { type: String, required: true },
    productImage: String,
    selectedColor: String,
    selectedSize: String,
    quantity: { type: Number, required: true, min: 1 },
    salePriceByMarketer: { type: Number, required: true, min: 0 },
    merchantPrice: { type: Number, required: true, min: 0 },
    lineSubtotal: { type: Number, required: true, min: 0 },
    marketerProfit: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    marketerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, default: '' },
      addressLine: { type: String, required: true },
      notes: { type: String, default: '' },
    },
    governorate: { type: String, required: true, index: true },
    shippingFee: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    confirmedAt: Date,
    deliveredAt: Date,
    items: { type: [orderItemSchema], default: [] },
    statusHistory: [
      {
        status: { type: String, enum: ORDER_STATUSES },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
orderSchema.index({ marketerId: 1, status: 1, createdAt: -1 });

const commissionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    ownerAmount: { type: Number, required: true, min: 0, default: 0 },
    marketerAmount: { type: Number, required: true, min: 0, default: 0 },
    merchantNet: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: COMMISSION_STATUSES, default: 'pending' },
  },
  { timestamps: true }
);

commissionSchema.index({ status: 1, createdAt: -1 });

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

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export const ShippingSystem =
  mongoose.models.ShippingSystem || mongoose.model('ShippingSystem', shippingSystemSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export const Commission =
  mongoose.models.Commission || mongoose.model('Commission', commissionSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
