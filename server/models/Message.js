const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["contact", "productInquiry"],
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    // Optional: for productInquiry type
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false,
    },
    productName: String,
    // Status
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ type: 1 });
messageSchema.index({ email: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Message", messageSchema);
