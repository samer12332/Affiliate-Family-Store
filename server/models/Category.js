const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: false,
    },
    image: {
      type: String, // URL to category image
      required: false,
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

categorySchema.index({ slug: 1 });

module.exports = mongoose.model("Category", categorySchema);
