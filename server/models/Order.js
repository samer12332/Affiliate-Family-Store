const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: String,
  productSlug: String,
  selectedColor: String,
  selectedSize: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  productImage: String,
  shippingFee: {
    type: Number,
    required: true,
    min: 0,
  },
  supplierReference: String,
  returnEligibility: Boolean,
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    // Customer details
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    shippingAddress: {
      street: String,
      city: String,
      governorate: {
        type: String,
        required: true,
      },
      postalCode: String,
    },
    // Order items with snapshots
    items: [orderItemSchema],
    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalShippingFee: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Status
    status: {
      type: String,
      enum: [
        "Pending Review",
        "Confirmed with Customer",
        "Sent to Supplier",
        "Supplier Confirmed",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending Review",
    },
    // Supplier/internal notes
    supplierNotes: String,
    internalNotes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ "shippingAddress.governorate": 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
