const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Clothes", "Shoes", "Others"],
    },
    gender: {
      type: String,
      required: true,
      enum: ["Men", "Women", "Children", "Unisex"],
    },
    brand: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPrice: {
      type: Number,
      required: false,
      min: 0,
    },
    images: [
      {
        type: String, // URL to image
      },
    ],
    colors: [
      {
        name: String,
        hex: String,
      },
    ],
    sizes: [
      {
        type: String,
      },
    ],
    sizeGuide: {
      type: String, // URL to size guide image
      required: false,
    },
    shippingOptions: [
      {
        governorate: String,
        fee: Number,
        estimatedDays: Number,
      },
    ],
    returnPolicy: {
      type: String, // description of return policy
      required: false,
    },
    availabilityStatus: {
      type: String,
      enum: ["Available", "Limited Availability", "Temporarily Unavailable"],
      default: "Available",
    },
    sku: {
      type: String,
      required: false,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    newArrival: {
      type: Boolean,
      default: false,
    },
    onSale: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    supplierInfo: {
      name: String,
      reference: String,
    },
    seoMetadata: {
      title: String,
      description: String,
      keywords: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ gender: 1 });
productSchema.index({ featured: 1 });
productSchema.index({ availabilityStatus: 1 });
productSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Product", productSchema);
