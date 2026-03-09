const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { verifyAdminToken } = require("../middleware/auth");

// Get all categories
router.get("/", async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [{ name: { $regex: search, $options: "i" } }];
    }

    const skip = (page - 1) * limit;

    const categories = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Category.countDocuments(filter);

    res.json({
      categories,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[v0] Error fetching categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get category by slug
router.get("/:slug", async (req, res) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("[v0] Error fetching category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create category (admin only)
router.post("/", verifyAdminToken, async (req, res) => {
  try {
    const category = new Category(req.body);
    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    console.error("[v0] Error creating category:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update category (admin only)
router.put("/:id", verifyAdminToken, async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("[v0] Error updating category:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete category (admin only)
router.delete("/:id", verifyAdminToken, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("[v0] Error deleting category:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
