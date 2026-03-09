const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { verifyAdminToken } = require("../middleware/auth");

// Get all products with filtering, searching, and pagination
router.get("/", async (req, res) => {
  try {
    const {
      category,
      gender,
      status,
      search,
      featured,
      onSale,
      page = 1,
      limit = 12,
      sort = "-createdAt",
    } = req.query;

    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (gender) filter.gender = gender;
    if (status) filter.availabilityStatus = status;
    if (featured === "true") filter.featured = true;
    if (onSale === "true") filter.onSale = true;

    // Search by name or SKU
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    // Execute query
    const products = await Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[v0] Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get product by slug
router.get("/:slug", async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("[v0] Error fetching product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create product (admin only)
router.post("/", verifyAdminToken, async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();
    res.status(201).json(savedProduct);
  } catch (error) {
    console.error("[v0] Error creating product:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update product (admin only)
router.put("/:id", verifyAdminToken, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error("[v0] Error updating product:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete product (admin only)
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("[v0] Error deleting product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
