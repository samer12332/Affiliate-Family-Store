const express = require("express");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const AdminUser = require("../models/AdminUser");
const { verifyAdminToken } = require("../middleware/auth");

// Get all admin users (admin only)
router.get("/users", verifyAdminToken, async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [{ email: { $regex: search, $options: "i" } }];
    }

    const skip = (page - 1) * limit;

    const users = await AdminUser.find(filter)
      .select("-hashedPassword")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminUser.countDocuments(filter);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[v0] Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create admin user (admin only)
router.post("/users", verifyAdminToken, async (req, res) => {
  try {
    const { email, password, role = "moderator" } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Check if user already exists
    const existingUser = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = new AdminUser({
      email: email.toLowerCase(),
      hashedPassword,
      role,
      isActive: true,
    });

    const savedUser = await newUser.save();

    res.status(201).json({
      user: {
        id: savedUser._id,
        email: savedUser.email,
        role: savedUser.role,
        isActive: savedUser.isActive,
      },
      message: "User created successfully",
    });
  } catch (error) {
    console.error("[v0] Error creating user:", error);
    res.status(400).json({ error: error.message });
  }
});

// Update admin user (admin only)
router.put("/users/:id", verifyAdminToken, async (req, res) => {
  try {
    const { role, isActive } = req.body;

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;

    const user = await AdminUser.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("-hashedPassword");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("[v0] Error updating user:", error);
    res.status(400).json({ error: error.message });
  }
});

// Delete admin user (admin only)
router.delete("/users/:id", verifyAdminToken, async (req, res) => {
  try {
    const user = await AdminUser.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("[v0] Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
