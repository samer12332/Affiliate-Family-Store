import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const USER_ROLES = ['owner', 'admin', 'super_admin', 'main_merchant', 'submerchant', 'merchant', 'marketer'] as const;
const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
const COMMISSION_STATUSES = ['pending', 'confirmed', 'delivered', 'paid'] as const;
const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function isBcryptHash(value: string) {
  return BCRYPT_HASH_REGEX.test(String(value || ''));
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true },
    mainMerchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
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

userSchema.index({ role: 1, active: 1 });
userSchema.index({ role: 1, mainMerchantId: 1, active: 1 });
userSchema.index({ 'merchantProfile.slug': 1 });

userSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      const rawPassword = String(this.get('password') || '');
      if (!isBcryptHash(rawPassword)) {
        this.set('password', await bcryptjs.hash(rawPassword, 10));
      }
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

userSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update: any = this.getUpdate() || {};
    const directPassword = update?.password;
    const setPassword = update?.$set?.password;
    const nextPassword =
      typeof setPassword === 'string'
        ? setPassword
        : typeof directPassword === 'string'
          ? directPassword
          : '';

    if (nextPassword && !isBcryptHash(nextPassword)) {
      const hashed = await bcryptjs.hash(nextPassword, 10);
      if (typeof setPassword === 'string') {
        update.$set = { ...(update.$set || {}), password: hashed };
      } else {
        update.password = hashed;
      }
      this.setUpdate(update);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

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
    stock: { type: Number, required: true, min: 0, default: 0 },
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
    merchantDisplayName: { type: String, default: '', trim: true },
    merchantMainMerchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    marketplaceVisible: { type: Boolean, default: true, index: true },
    internalNotes: String,
  },
  { timestamps: true }
);

productSchema.index({ merchantId: 1, createdAt: -1 });
productSchema.index({ category: 1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ category: 1, gender: 1, availabilityStatus: 1, createdAt: -1 });
productSchema.index({ merchantId: 1, category: 1, createdAt: -1 });
productSchema.index({ marketplaceVisible: 1, createdAt: -1 });
productSchema.index({ marketplaceVisible: 1, merchantMainMerchantId: 1, createdAt: -1 });
productSchema.index({ marketplaceVisible: 1, merchantMainMerchantId: 1, category: 1, createdAt: -1 });
productSchema.index({ marketplaceVisible: 1, category: 1, createdAt: -1 });
productSchema.index({ marketplaceVisible: 1, category: 1, gender: 1, availabilityStatus: 1, createdAt: -1 });
productSchema.index({ marketplaceVisible: 1, category: 1, price: 1, createdAt: -1 });
productSchema.index({ marketplaceVisible: 1, category: 1, name: 1, createdAt: -1 });
productSchema.index({ name: 'text', sku: 'text', merchantDisplayName: 'text' });

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
    mainMerchantAmount: { type: Number, required: true, min: 0, default: 0 },
    marketerAmount: { type: Number, required: true, min: 0, default: 0 },
    merchantNet: { type: Number, required: true, min: 0, default: 0 },
    ownerSettlement: {
      senderRole: { type: String, default: '' },
      senderMarkedPaidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      senderMarkedPaidAt: { type: Date, default: null },
      receiverMarkedReceivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      receiverMarkedReceivedAt: { type: Date, default: null },
    },
    mainMerchantSettlement: {
      senderRole: { type: String, default: '' },
      senderMarkedPaidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      senderMarkedPaidAt: { type: Date, default: null },
      receiverMarkedReceivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      receiverMarkedReceivedAt: { type: Date, default: null },
    },
    marketerSettlement: {
      senderRole: { type: String, default: '' },
      senderMarkedPaidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      senderMarkedPaidAt: { type: Date, default: null },
      receiverMarkedReceivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      receiverMarkedReceivedAt: { type: Date, default: null },
    },
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

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true, default: 'info' },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    href: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const commissionComplaintSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    channel: { type: String, enum: ['owner', 'main_merchant', 'marketer'], required: true },
    complainantUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    complainantRole: { type: String, required: true },
    reportedAgainstRole: { type: String, default: '' },
    whatsappNumber: { type: String, required: true, trim: true, maxlength: 30 },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'in_review', 'resolved', 'rejected'], default: 'open', index: true },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    resolutionNote: { type: String, default: '' },
  },
  { timestamps: true }
);

commissionComplaintSchema.index({ status: 1, createdAt: -1 });
commissionComplaintSchema.index({ complainantUserId: 1, createdAt: -1 });

const existingUserModel = mongoose.models.User as mongoose.Model<any> | undefined;
if (existingUserModel) {
  const existingRoleEnumValues =
    ((existingUserModel.schema.path('role') as any)?.enumValues as string[] | undefined) || [];
  if (!existingRoleEnumValues.includes('main_merchant')) {
    mongoose.deleteModel('User');
  }
}

const existingProductModel = mongoose.models.Product as mongoose.Model<any> | undefined;
if (existingProductModel) {
  const hasStockPath = Boolean(existingProductModel.schema.path('stock'));
  const hasMerchantDisplayNamePath = Boolean(existingProductModel.schema.path('merchantDisplayName'));
  if (!hasStockPath || !hasMerchantDisplayNamePath) {
    mongoose.deleteModel('Product');
  }
}

const existingCommissionModel = mongoose.models.Commission as mongoose.Model<any> | undefined;
if (existingCommissionModel) {
  const hasMainMerchantAmountPath = Boolean(existingCommissionModel.schema.path('mainMerchantAmount'));
  const hasOwnerSettlementPath = Boolean(existingCommissionModel.schema.path('ownerSettlement'));
  if (!hasMainMerchantAmountPath || !hasOwnerSettlementPath) {
    mongoose.deleteModel('Commission');
  }
}

const existingCommissionComplaintModel = mongoose.models.CommissionComplaint as mongoose.Model<any> | undefined;
if (existingCommissionComplaintModel) {
  const hasWhatsappNumberPath = Boolean(existingCommissionComplaintModel.schema.path('whatsappNumber'));
  if (!hasWhatsappNumberPath) {
    mongoose.deleteModel('CommissionComplaint');
  }
}

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export const ShippingSystem =
  mongoose.models.ShippingSystem || mongoose.model('ShippingSystem', shippingSystemSchema);
export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export const Commission =
  mongoose.models.Commission || mongoose.model('Commission', commissionSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
export const CommissionComplaint =
  mongoose.models.CommissionComplaint || mongoose.model('CommissionComplaint', commissionComplaintSchema);
